import os
import sys
import time
from datetime import datetime
import logging
import joblib
import numpy as np
import pandas as pd

from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.ensemble import VotingClassifier
from xgboost import XGBClassifier
import lightgbm as lgb

# Append current directory to system path to ensure imports resolve correctly
sys.path.append(os.path.dirname(__file__))

from data_loader import load_and_validate, preprocess, split_data, class_weight_dict
from utils import get_feature_columns, get_label_column

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("CareTraceML.train")


def train_xgboost(X_train, y_train, class_weights):
    """
    Trains an XGBoost classifier with early stopping and sample weights.
    
    Args:
        X_train (pd.DataFrame): Training features.
        y_train (np.ndarray): Training labels (integer encoded).
        class_weights (dict): Class weights dictionary.
        
    Returns:
        XGBClassifier: Trained XGBoost model.
    """
    logger.info("Starting XGBoost training...")
    try:
        # Split X_train, y_train into train (90%) and validation (10%) sets
        # to support early stopping eval_set
        X_tr, X_val, y_tr, y_val = train_test_split(
            X_train, y_train, test_size=0.10, random_state=42, stratify=y_train
        )
        
        # Map sample weights to y_tr samples
        sample_weights = np.array([class_weights[val] for val in y_tr])
        
        # Instantiate model with early stopping rounds
        model = XGBClassifier(
            n_estimators=500,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            use_label_encoder=False,
            eval_metric='mlogloss',
            random_state=42,
            early_stopping_rounds=30
        )
        
        logger.info("Fitting XGBClassifier...")
        model.fit(
            X_tr, y_tr,
            sample_weight=sample_weights,
            eval_set=[(X_val, y_val)],
            verbose=False
        )
        
        logger.info("XGBoost Training Complete.")
        logger.info("Best Iteration: %s", model.best_iteration)
        logger.info("Best Score (mlogloss): %s", model.best_score)
        
        return model
    except Exception as e:
        logger.error("Error occurred during XGBoost training: %s", e, exc_info=True)
        raise e


def train_lightgbm(X_train, y_train, class_weights):
    """
    Trains a LightGBM classifier with early stopping and balanced class weights.
    
    Args:
        X_train (pd.DataFrame): Training features.
        y_train (np.ndarray): Training labels (integer encoded).
        class_weights (dict): Class weights dictionary.
        
    Returns:
        LGBMClassifier: Trained LightGBM model.
    """
    logger.info("Starting LightGBM training...")
    try:
        # Split X_train, y_train into train (90%) and validation (10%) sets
        X_tr, X_val, y_tr, y_val = train_test_split(
            X_train, y_train, test_size=0.10, random_state=42, stratify=y_train
        )
        
        model = lgb.LGBMClassifier(
            n_estimators=500,
            max_depth=6,
            learning_rate=0.05,
            num_leaves=63,
            subsample=0.8,
            colsample_bytree=0.8,
            class_weight='balanced',
            random_state=42,
            verbose=-1
        )
        
        logger.info("Fitting LGBMClassifier...")
        model.fit(
            X_tr, y_tr,
            eval_set=[(X_val, y_val)],
            callbacks=[
                lgb.early_stopping(30, verbose=False),
                lgb.log_evaluation(50)
            ]
        )
        
        logger.info("LightGBM Training Complete.")
        return model
    except Exception as e:
        logger.error("Error occurred during LightGBM training: %s", e, exc_info=True)
        raise e


def train_ensemble(xgb_model, lgb_model, X_train, y_train):
    """
    Trains a VotingClassifier ensemble using soft voting with cloned sub-models.
    
    Args:
        xgb_model (XGBClassifier): Pre-configured XGBoost model.
        lgb_model (LGBMClassifier): Pre-configured LightGBM model.
        X_train (pd.DataFrame): Full training features.
        y_train (np.ndarray): Full training labels (integer encoded).
        
    Returns:
        VotingClassifier: Trained VotingClassifier.
    """
    logger.info("Starting Ensemble training (VotingClassifier)...")
    try:
        import copy
        
        # Clone estimators to prevent modifying original models.
        # Also remove early_stopping_rounds from XGBoost to prevent missing eval_set errors during full fit()
        xgb_copy = copy.deepcopy(xgb_model)
        xgb_copy.set_params(early_stopping_rounds=None)
        
        lgb_copy = copy.deepcopy(lgb_model)
        
        ensemble = VotingClassifier(
            estimators=[
                ('xgb', xgb_copy),
                ('lgb', lgb_copy)
            ],
            voting='soft'
        )
        
        logger.info("Fitting Ensemble on full training set...")
        ensemble.fit(X_train, y_train)
        
        logger.info("Ensemble Training Complete.")
        return ensemble
    except Exception as e:
        logger.error("Error occurred during Ensemble training: %s", e, exc_info=True)
        raise e


def save_models(xgb_model, lgb_model, ensemble, output_dir='models/'):
    """
    Saves each trained model using joblib with a versioned date suffix: caretrace_{model}_{date}.pkl
    
    Args:
        xgb_model (XGBClassifier): Trained XGBoost model.
        lgb_model (LGBMClassifier): Trained LightGBM model.
        ensemble (VotingClassifier): Trained ensemble.
        output_dir (str): Relative directory inside caretrace-ml.
        
    Returns:
        dict: Paths of the saved files.
    """
    logger.info("Saving trained models to disk...")
    try:
        # Resolve output directory inside caretrace-ml
        base_dir = os.path.dirname(os.path.dirname(__file__))
        resolved_dir = os.path.join(base_dir, output_dir)
        os.makedirs(resolved_dir, exist_ok=True)
        
        date_str = datetime.now().strftime("%Y%m%d")
        saved_paths = {}
        
        models = [
            ("xgboost", xgb_model),
            ("lightgbm", lgb_model),
            ("ensemble", ensemble)
        ]
        
        for name, model in models:
            filename = f"caretrace_{name}_{date_str}.pkl"
            filepath = os.path.join(resolved_dir, filename)
            joblib.dump(model, filepath)
            print(f"Saved {name} model to: {filepath}")
            saved_paths[name] = filepath
            
        return saved_paths
    except Exception as e:
        logger.error("Error occurred while saving models: %s", e, exc_info=True)
        raise e


def main():
    start_time = time.time()
    logger.info("Starting CareTrace AI training pipeline...")
    
    try:
        # 1. Load dataset via load_and_validate()
        df = load_and_validate()
        
        # 2. Preprocess and split
        X, y = preprocess(df)
        X_train, X_test, y_train, y_test = split_data(X, y)
        
        # Convert object columns to numeric codes consistently across train/test splits
        logger.info("Encoding categorical object columns to numeric codes...")
        for col in X_train.select_dtypes(include=['object']).columns:
            categories = X_train[col].astype('category').cat.categories
            X_train[col] = pd.Categorical(X_train[col], categories=categories).codes
            X_test[col] = pd.Categorical(X_test[col], categories=categories).codes
            
        # Encode string target labels into integers
        logger.info("Encoding string target labels to integer classes...")
        le = LabelEncoder()
        y_train_encoded = le.fit_transform(y_train)
        y_test_encoded = le.transform(y_test)
        
        # Save LabelEncoder to models directory for mapping inferences later
        base_dir = os.path.dirname(os.path.dirname(__file__))
        le_path = os.path.join(base_dir, "models", "label_encoder.pkl")
        joblib.dump(le, le_path)
        logger.info("LabelEncoder saved to: %s", le_path)
        
        # Compute class weights using data_loader
        class_weights = class_weight_dict(y_train)
        
        # 3. Train models in sequence
        xgb_model = train_xgboost(X_train, y_train_encoded, class_weights)
        lgb_model = train_lightgbm(X_train, y_train_encoded, class_weights)
        ensemble = train_ensemble(xgb_model, lgb_model, X_train, y_train_encoded)
        
        # 4. Save all models
        save_models(xgb_model, lgb_model, ensemble)
        
        total_time = time.time() - start_time
        print(f"\nTraining pipeline completed successfully in {total_time:.2f} seconds.\n")
        
    except Exception as e:
        logger.error("Pipeline execution failed: %s", e, exc_info=True)
        print(f"Error: Pipeline execution failed due to: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
