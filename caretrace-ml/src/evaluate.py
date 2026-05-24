import os
import sys
import glob
import json
import logging
import joblib
from datetime import datetime
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.preprocessing import label_binarize, LabelEncoder
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_curve,
    auc,
    accuracy_score,
    f1_score,
    precision_recall_fscore_support
)

# Ensure data_loader and utils can be imported
sys.path.append(os.path.dirname(__file__))

from data_loader import load_and_validate, preprocess, split_data
from utils import get_label_column

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("CareTraceML.evaluate")


def evaluate_model(model, X_test, y_test, model_name, le, output_dir='reports/'):
    """
    Evaluates a single model on the test set, prints reports, and generates
    confusion matrix heatmaps and ROC-AUC curve plots.
    
    Args:
        model: Trained model (XGBoost, LightGBM, or Ensemble).
        X_test (pd.DataFrame): Test features.
        y_test (np.ndarray): Test target labels (integer encoded).
        model_name (str): Label for the model.
        le (LabelEncoder): Saved LabelEncoder.
        output_dir (str): Relative directory inside caretrace-ml.
        
    Returns:
        dict: Scalar metrics (accuracy, macro F1, weighted F1, and ROC-AUC macro).
    """
    logger.info("Evaluating model: %s", model_name)
    try:
        base_dir = os.path.dirname(os.path.dirname(__file__))
        resolved_out_dir = os.path.join(base_dir, output_dir)
        os.makedirs(resolved_out_dir, exist_ok=True)
        
        # 1. Predict labels and probabilities
        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test)
        
        # 2. Compute scalar metrics
        accuracy = accuracy_score(y_test, y_pred)
        macro_f1 = f1_score(y_test, y_pred, average='macro')
        weighted_f1 = f1_score(y_test, y_pred, average='weighted')
        
        # Print classification report
        report_text = classification_report(y_test, y_pred, target_names=le.classes_)
        print(f"\n=== CLASSIFICATION REPORT FOR {model_name.upper()} ===")
        print(report_text)
        print("=" * 50 + "\n")
        
        # Save classification report as text
        txt_path = os.path.join(resolved_out_dir, f"{model_name}_evaluation_report.txt")
        with open(txt_path, "w") as f:
            f.write(f"Classification Report - {model_name}\n")
            f.write("=" * 40 + "\n")
            f.write(report_text)
            
        # 3. Generate Confusion Matrix plot
        cm = confusion_matrix(y_test, y_pred)
        plt.figure(figsize=(8, 6))
        sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", xticklabels=le.classes_, yticklabels=le.classes_)
        plt.title(f"Confusion Matrix Heatmap - {model_name}")
        plt.ylabel("Actual Label")
        plt.xlabel("Predicted Label")
        plt.tight_layout()
        cm_path = os.path.join(resolved_out_dir, f"{model_name}_confusion_matrix.png")
        plt.savefig(cm_path, dpi=300)
        plt.close()
        logger.info("Saved confusion matrix heatmap to: %s", cm_path)
        
        # 4. ROC-AUC per class (one-vs-rest)
        n_classes = len(le.classes_)
        y_test_bin = label_binarize(y_test, classes=range(n_classes))
        
        fpr = dict()
        tpr = dict()
        roc_auc = dict()
        
        plt.figure(figsize=(10, 8))
        colors = ['blue', 'red', 'green']
        
        for i in range(n_classes):
            # Calculate ROC
            fpr[i], tpr[i], _ = roc_curve(y_test_bin[:, i], y_proba[:, i])
            roc_auc[i] = auc(fpr[i], tpr[i])
            
            plt.plot(
                fpr[i], tpr[i],
                color=colors[i % len(colors)],
                lw=2,
                label=f"Class {le.classes_[i]} (AUC = {roc_auc[i]:.4f})"
            )
            
        plt.plot([0, 1], [0, 1], 'k--', lw=2)
        plt.xlim([0.0, 1.0])
        plt.ylim([0.0, 1.05])
        plt.xlabel('False Positive Rate')
        plt.ylabel('True Positive Rate')
        plt.title(f'ROC-AUC One-vs-Rest - {model_name}')
        plt.legend(loc="lower right")
        plt.tight_layout()
        roc_path = os.path.join(resolved_out_dir, f"{model_name}_roc_auc.png")
        plt.savefig(roc_path, dpi=300)
        plt.close()
        logger.info("Saved ROC-AUC curve plot to: %s", roc_path)
        
        # Compute mean AUC
        mean_auc = np.mean(list(roc_auc.values()))
        
        metrics = {
            "accuracy": float(accuracy),
            "macro_f1": float(macro_f1),
            "weighted_f1": float(weighted_f1),
            "macro_auc": float(mean_auc)
        }
        
        return metrics
    except Exception as e:
        logger.error("Error occurred during evaluation of model %s: %s", model_name, e, exc_info=True)
        raise e


def compare_models(results_dict, output_dir='reports/'):
    """
    Compiles results, prints a comparison table, plots a bar chart comparing macro F1,
    and returns the winning model name.
    
    Args:
        results_dict (dict): Dictionary mapping model_name to its metrics dict.
        output_dir (str): Relative directory inside caretrace-ml.
        
    Returns:
        str: Winning model name.
    """
    logger.info("Comparing all models...")
    try:
        base_dir = os.path.dirname(os.path.dirname(__file__))
        resolved_out_dir = os.path.join(base_dir, output_dir)
        
        # 1. Print side-by-side comparison table
        df_comp = pd.DataFrame(results_dict).T
        print("\n" + "=" * 60)
        print("MODEL COMPARISON SUMMARY TABLE")
        print("=" * 60)
        print(df_comp.to_string(formatters={
            'accuracy': '{:,.4f}'.format,
            'macro_f1': '{:,.4f}'.format,
            'weighted_f1': '{:,.4f}'.format,
            'macro_auc': '{:,.4f}'.format
        }))
        print("=" * 60 + "\n")
        
        # Save comparison summary table as text
        df_comp.to_csv(os.path.join(resolved_out_dir, "model_comparison_table.csv"))
        
        # 2. Save a bar chart comparing macro F1 across models
        plt.figure(figsize=(8, 6))
        model_names = list(results_dict.keys())
        macro_f1s = [results_dict[m]['macro_f1'] for m in model_names]
        
        sns.barplot(x=model_names, y=macro_f1s, palette="viridis")
        plt.title("Model Comparison - Macro F1-Score", fontsize=14)
        plt.ylabel("Macro F1-Score")
        plt.xlabel("Models")
        plt.ylim([0.0, 1.1])
        
        # Add values on top of the bars
        for idx, val in enumerate(macro_f1s):
            plt.text(idx, val + 0.02, f"{val:.4f}", ha='center', va='bottom', fontweight='bold')
            
        plt.tight_layout()
        comparison_chart_path = os.path.join(resolved_out_dir, "model_comparison.png")
        plt.savefig(comparison_chart_path, dpi=300)
        plt.close()
        logger.info("Saved macro F1 comparison chart to: %s", comparison_chart_path)
        
        # 3. Determine the winning model (highest macro F1)
        winning_model = max(results_dict, key=lambda k: results_dict[k]['macro_f1'])
        print(f"WINNING MODEL (Highest Macro F1): {winning_model.upper()}\n")
        
        return winning_model
    except Exception as e:
        logger.error("Error occurred while comparing models: %s", e, exc_info=True)
        raise e


def class_specific_analysis(model, X_test, y_test, model_name, le):
    """
    Performs safety analysis specifically for the HIGH risk class (class 2),
    verifying it meets the clinical safety threshold of recall >= 0.85.
    
    Args:
        model: Trained best model.
        X_test (pd.DataFrame): Test features.
        y_test (np.ndarray): Test labels (integer encoded).
        model_name (str): Label for the model.
        le (LabelEncoder): Saved LabelEncoder.
    """
    logger.info("Running class-specific clinical safety analysis on %s...", model_name)
    try:
        y_pred = model.predict(X_test)
        
        # Compute recalls for all target classes
        precisions, recalls, f1s, supports = precision_recall_fscore_support(
            y_test, y_pred, labels=[0, 1, 2], average=None
        )
        
        # Class 2 metrics (explicitly requested)
        class_2_recall = recalls[2]
        class_2_fnr = 1.0 - class_2_recall
        class_2_label = le.classes_[2]
        
        # Also compute actual 'high' risk class dynamically for clinical correctness
        high_idx = list(le.classes_).index("high")
        high_recall = recalls[high_idx]
        high_fnr = 1.0 - high_recall
        
        print("\n" + "=" * 55)
        print(f"CLINICAL SAFETY ANALYSIS (Model: {model_name})")
        print("=" * 55)
        
        # Output explicitly requested Class 2 metrics
        print(f"Target Class Index 2 ({class_2_label}) metrics:")
        print(f"  Recall:               {class_2_recall:.4f}")
        print(f"  False Negative Rate:  {class_2_fnr:.4f}")
        
        # If class 2 is not the actual 'high' risk class in the label encoder, print actual 'high' class too
        if high_idx != 2:
            print(f"\nTarget Actual 'high' Class (Index {high_idx}) metrics:")
            print(f"  Recall:               {high_recall:.4f}")
            print(f"  False Negative Rate:  {high_fnr:.4f}")
            
        print("\nClinical safety threshold: recall on HIGH risk must be >= 0.85")
        
        # Perform validation for both Class 2 and the actual 'high' class
        threshold = 0.85
        
        print("-" * 55)
        # Class 2 warning check
        if class_2_recall < threshold:
            print(f"WARNING: Recall on Class 2 ({class_2_label}) is below safety threshold! (Recall = {class_2_recall:.4f})")
        else:
            print(f"SUCCESS: Recall on Class 2 ({class_2_label}) meets safety threshold.")
            
        # Actual 'high' class warning check
        if high_idx != 2:
            if high_recall < threshold:
                print(f"WARNING: Recall on actual 'high' risk class is below safety threshold! (Recall = {high_recall:.4f})")
            else:
                print("SUCCESS: Recall on actual 'high' risk class meets safety threshold.")
        print("=" * 55 + "\n")
        
    except Exception as e:
        logger.error("Error during class-specific safety analysis: %s", e, exc_info=True)
        raise e


def main():
    logger.info("Initializing CareTrace AI model evaluation workflow...")
    
    try:
        # Resolve folders
        base_dir = os.path.dirname(os.path.dirname(__file__))
        models_dir = os.path.join(base_dir, "models")
        reports_dir = os.path.join(base_dir, "reports")
        os.makedirs(reports_dir, exist_ok=True)
        
        # 1. Load label encoder
        le_path = os.path.join(models_dir, "label_encoder.pkl")
        if not os.path.exists(le_path):
            raise FileNotFoundError(f"Label encoder not found at: {le_path}. Please run train.py first.")
            
        le = joblib.load(le_path)
        logger.info("Label encoder loaded. Target classes: %s", list(le.classes_))
        
        # 2. Locate model checkpoints using glob (picks the newest date versioned files)
        xgb_files = sorted(glob.glob(os.path.join(models_dir, "caretrace_xgboost_*.pkl")))
        lgb_files = sorted(glob.glob(os.path.join(models_dir, "caretrace_lightgbm_*.pkl")))
        ens_files = sorted(glob.glob(os.path.join(models_dir, "caretrace_ensemble_*.pkl")))
        
        if not xgb_files or not lgb_files or not ens_files:
            raise FileNotFoundError(
                "Could not find all three trained models (xgboost, lightgbm, ensemble) in "
                f"'{models_dir}'. Please execute train.py first."
            )
            
        xgb_path = xgb_files[-1]
        lgb_path = lgb_files[-1]
        ens_path = ens_files[-1]
        
        logger.info("Loading models:")
        logger.info("  XGBoost:  %s", os.path.basename(xgb_path))
        logger.info("  LightGBM: %s", os.path.basename(lgb_path))
        logger.info("  Ensemble: %s", os.path.basename(ens_path))
        
        xgb_model = joblib.load(xgb_path)
        lgb_model = joblib.load(lgb_path)
        ensemble_model = joblib.load(ens_path)
        
        # 3. Load dataset, preprocess, and split (using identical random_state=42)
        df = load_and_validate()
        X, y = preprocess(df)
        X_train, X_test, y_train, y_test = split_data(X, y)
        
        # Map object categories to numeric codes consistently using training partition categories
        logger.info("Encoding categorical object columns to numeric codes...")
        for col in X_train.select_dtypes(include=['object']).columns:
            categories = X_train[col].astype('category').cat.categories
            X_train[col] = pd.Categorical(X_train[col], categories=categories).codes
            X_test[col] = pd.Categorical(X_test[col], categories=categories).codes
            
        # Encode string labels
        y_test_encoded = le.transform(y_test)
        
        # 4. Evaluate all three models
        results = {}
        results["xgboost"] = evaluate_model(xgb_model, X_test, y_test_encoded, "xgboost", le)
        results["lightgbm"] = evaluate_model(lgb_model, X_test, y_test_encoded, "lightgbm", le)
        results["ensemble"] = evaluate_model(ensemble_model, X_test, y_test_encoded, "ensemble", le)
        
        # 5. Run side-by-side comparison
        winning_model_name = compare_models(results)
        
        # Map winning model name to instance
        model_mapping = {
            "xgboost": xgb_model,
            "lightgbm": lgb_model,
            "ensemble": ensemble_model
        }
        best_model = model_mapping[winning_model_name]
        
        # 6. Run safety threshold verification on the best model
        class_specific_analysis(best_model, X_test, y_test_encoded, winning_model_name, le)
        
        # 7. Save evaluation summary JSON
        summary_json_path = os.path.join(reports_dir, "evaluation_summary.json")
        summary_data = {
            "winning_model": winning_model_name,
            "evaluation_metrics": results,
            "evaluation_timestamp": datetime.now().isoformat()
        }
        with open(summary_json_path, "w") as f:
            json.dump(summary_data, f, indent=4)
            
        logger.info("Evaluation summary JSON saved to: %s", summary_json_path)
        logger.info("Evaluation workflow completed successfully.")
        
    except Exception as e:
        logger.error("Evaluation workflow run failed: %s", e, exc_info=True)
        print(f"Error: Evaluation run failed due to: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
