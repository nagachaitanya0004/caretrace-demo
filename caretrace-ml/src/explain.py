import os
import joblib
import logging
import pandas as pd
import matplotlib.pyplot as plt
import shap

from utils import load_dataset, validate_dataset, get_feature_columns

# Setup logging
logger = logging.getLogger("CareTraceML.explain")


def explain_predictions():
    logger.info("Initializing CareTrace AI model interpretability and explainability workflow...")
    
    # 1. Resolve paths
    base_dir = os.path.dirname(os.path.dirname(__file__))
    model_path = os.path.join(base_dir, "models", "caretrace_model.joblib")
    reports_dir = os.path.join(base_dir, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    
    if not os.path.exists(model_path):
        logger.error("Trained model not found at %s. Please run train.py first.", model_path)
        return
        
    # 2. Load the trained model pipeline
    logger.info("Loading model pipeline from %s", model_path)
    pipeline = joblib.load(model_path)
    
    # 3. Load the dataset
    try:
        df = load_dataset()
    except Exception as e:
        logger.error("Error loading explanation dataset: %s", e)
        return
        
    # 4. Validate the dataset
    try:
        validate_dataset(df)
    except Exception as e:
        logger.error("Dataset validation failed: %s", e)
        return
        
    feature_cols = get_feature_columns()
    X = df[feature_cols]
    
    # 5. Extract preprocessing and classifier steps
    preprocessor = pipeline.named_steps["preprocessor"]
    classifier = pipeline.named_steps["classifier"]
    
    # 6. Transform the data using the preprocessing pipeline
    logger.info("Preprocessing features for SHAP explainability...")
    X_trans = preprocessor.transform(X)
    
    # Retrieve feature names after preprocessing
    try:
        feature_names = preprocessor.get_feature_names_out()
    except Exception as e:
        logger.warning("Could not extract feature names out of preprocessor automatically: %s. Using indices instead.", e)
        feature_names = [f"feature_{i}" for i in range(X_trans.shape[1])]
        
    # Convert back to DataFrame for better labeling in the SHAP plot
    X_trans_df = pd.DataFrame(X_trans, columns=feature_names)
    
    # 7. Compute SHAP values
    logger.info("Initializing SHAP TreeExplainer and calculating SHAP values...")
    try:
        explainer = shap.TreeExplainer(classifier)
        shap_values = explainer.shap_values(X_trans_df)
        
        # 8. Generate and save SHAP summary plot
        logger.info("Generating SHAP feature importance summary plot...")
        plt.figure(figsize=(12, 8))
        
        # summary_plot will handle multi-class predictions by stacking shap values per class
        shap.summary_plot(shap_values, X_trans_df, show=False)
        plt.title("CareTrace AI SHAP Feature Importance Summary", fontsize=14, pad=20)
        plt.tight_layout()
        
        shap_plot_path = os.path.join(reports_dir, "shap_summary.png")
        plt.savefig(shap_plot_path, dpi=300)
        plt.close()
        
        logger.info("Successfully saved SHAP summary plot to: %s", shap_plot_path)
    except Exception as e:
        logger.error("Failed to compute SHAP values or save summary plot: %s", e)
        
    logger.info("Model interpretability workflow completed.")


if __name__ == "__main__":
    explain_predictions()
