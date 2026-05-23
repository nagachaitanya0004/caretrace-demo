import os
import joblib
import logging
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support

from utils import load_dataset, validate_dataset, get_feature_columns, get_label_column

# Setup logging
logger = logging.getLogger("CareTraceML.evaluate")


def evaluate_model():
    logger.info("Initializing CareTrace AI model evaluation workflow...")
    
    # 1. Resolve paths
    base_dir = os.path.dirname(os.path.dirname(__file__))
    model_path = os.path.join(base_dir, "models", "caretrace_model.joblib")
    reports_dir = os.path.join(base_dir, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    
    if not os.path.exists(model_path):
        logger.error("Trained model not found at %s. Please run train.py first.", model_path)
        return
        
    # 2. Load the model
    logger.info("Loading model pipeline from %s", model_path)
    pipeline = joblib.load(model_path)
    
    # 3. Load the dataset
    try:
        df = load_dataset()
    except Exception as e:
        logger.error("Error loading evaluation dataset: %s", e)
        return
        
    # 4. Validate the dataset
    try:
        validate_dataset(df)
    except Exception as e:
        logger.error("Dataset validation failed: %s", e)
        return
        
    feature_cols = get_feature_columns()
    label_col = get_label_column()
    
    X = df[feature_cols]
    y = df[label_col]
    
    # 5. Run prediction
    logger.info("Running predictions on the loaded dataset...")
    y_pred = pipeline.predict(X)
    
    # 6. Compute metrics
    accuracy = accuracy_score(y, y_pred)
    precision, recall, f1, _ = precision_recall_fscore_support(y, y_pred, average="weighted")
    
    logger.info("Evaluation results - Accuracy: %.4f, F1-Score: %.4f", accuracy, f1)
    
    report_text = classification_report(y, y_pred)
    print("\n" + "=" * 50)
    print("CARETRACE MODEL EVALUATION REPORT")
    print("=" * 50)
    print(report_text)
    print("=" * 50 + "\n")
    
    # 7. Generate Confusion Matrix plot
    labels = sorted(list(y.unique()))
    cm = confusion_matrix(y, y_pred, labels=labels)
    
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", xticklabels=labels, yticklabels=labels)
    plt.title("CareTrace AI Confusion Matrix")
    plt.ylabel("Actual Label")
    plt.xlabel("Predicted Label")
    plt.tight_layout()
    
    confusion_matrix_path = os.path.join(reports_dir, "confusion_matrix.png")
    plt.savefig(confusion_matrix_path, dpi=300)
    plt.close()
    logger.info("Saved confusion matrix visualization to: %s", confusion_matrix_path)
    
    # 8. Write evaluation metrics to a text report
    report_file_path = os.path.join(reports_dir, "evaluation_report.txt")
    try:
        with open(report_file_path, "w") as f:
            f.write("CareTrace AI Model Evaluation Report\n")
            f.write("=" * 50 + "\n\n")
            f.write(f"Accuracy:  {accuracy:.4f}\n")
            f.write(f"Weighted F1-Score: {f1:.4f}\n")
            f.write(f"Weighted Precision: {precision:.4f}\n")
            f.write(f"Weighted Recall: {recall:.4f}\n\n")
            f.write("Classification Report Detail:\n")
            f.write(report_text)
        logger.info("Saved detailed text report to: %s", report_file_path)
    except Exception as e:
        logger.error("Failed to write evaluation report file: %s", e)
        
    logger.info("Model evaluation workflow completed.")


if __name__ == "__main__":
    evaluate_model()
