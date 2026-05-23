import os
import joblib
import logging
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score

from utils import load_dataset, validate_dataset, get_feature_columns, get_label_column

# Setup logger for training
logger = logging.getLogger("CareTraceML.train")


def train_model():
    logger.info("Initializing CareTrace AI model training workflow...")
    
    # 1. Load the dataset
    try:
        df = load_dataset()
    except Exception as e:
        logger.error("Error during dataset loading: %s", e)
        return
        
    # 2. Validate the dataset
    try:
        validate_dataset(df)
    except Exception as e:
        logger.error("Dataset validation failed: %s", e)
        return
        
    # 3. Retrieve feature and label definitions
    feature_cols = get_feature_columns()
    label_col = get_label_column()
    
    X = df[feature_cols]
    y = df[label_col]
    
    # 4. Identify column types for preprocessing
    categorical_cols = X.select_dtypes(include=["object", "category"]).columns.tolist()
    numerical_cols = X.select_dtypes(include=["int64", "float64"]).columns.tolist()
    
    logger.info("Identified %d numerical features and %d categorical features.", len(numerical_cols), len(categorical_cols))
    
    # 5. Define preprocessing pipelines
    numerical_transformer = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler())
    ])
    
    categorical_transformer = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
    ])
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numerical_transformer, numerical_cols),
            ("cat", categorical_transformer, categorical_cols)
        ]
    )
    
    # 6. Construct full pipeline with RandomForestClassifier
    # Random Forest is highly robust, handles multi-class naturally, and provides importances.
    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("classifier", RandomForestClassifier(
            n_estimators=100, 
            random_state=42, 
            class_weight="balanced"
        ))
    ])
    
    # 7. Split data into train and test sets
    logger.info("Splitting dataset into train (80%%) and test (20%%) sets...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # 8. Train the model pipeline
    logger.info("Fitting model pipeline on training data...")
    pipeline.fit(X_train, y_train)
    logger.info("Model pipeline fitted successfully.")
    
    # 9. Evaluate training results
    y_pred = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    logger.info("Test Accuracy: %.4f", accuracy)
    
    print("\n--- Test Set Evaluation Report ---")
    print(classification_report(y_test, y_pred))
    print("----------------------------------\n")
    
    # 10. Save the trained model pipeline
    model_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "caretrace_model.joblib")
    
    logger.info("Saving trained model pipeline to: %s", model_path)
    joblib.dump(pipeline, model_path)
    logger.info("Model training workflow completed successfully.")


if __name__ == "__main__":
    train_model()
