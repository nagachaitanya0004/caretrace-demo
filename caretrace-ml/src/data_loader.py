import os
import sys
import logging
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight

from utils import validate_dataset, get_feature_columns, get_label_column

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("CareTraceML.data_loader")


def load_and_validate(filepath=None) -> pd.DataFrame:
    """
    Loads a dataset from the specified CSV filepath.
    If filepath is None, prompts the user via a file dialog (with fallbacks
    for headless or non-blocking automated environments).
    Parses 'analysis_timestamp' as datetime and validates the columns structure.
    
    Args:
        filepath (str, optional): Path to the CSV file. Defaults to None.
        
    Returns:
        pd.DataFrame: Loaded and validated DataFrame.
    """
    logger.info("Initializing dataset load and validation workflow...")
    
    if filepath is None:
        # Check environment variable first (helps bypass dialogs in automated test runs)
        env_path = os.environ.get("CARETRACE_DATASET_PATH")
        if env_path:
            logger.info("Found dataset path in environment variable CARETRACE_DATASET_PATH: %s", env_path)
            filepath = env_path
        else:
            logger.info("Opening Tkinter file selection dialog...")
            try:
                import tkinter as tk
                from tkinter import filedialog
                
                root = tk.Tk()
                root.withdraw()
                root.attributes('-topmost', True)
                filepath = filedialog.askopenfilename(
                    title="Select CareTrace CSV Dataset",
                    filetypes=[("CSV Files", "*.csv"), ("All Files", "*.*")]
                )
                root.destroy()
            except Exception as e:
                logger.warning(
                    "Graphical file dialog could not be initialized (error: %s). "
                    "Falling back to terminal input prompt.", e
                )
                
            if not filepath:
                print("\n--- CSV FILE SELECTION FALLBACK ---")
                filepath = input("Enter the path to the CSV dataset: ").strip()
                print("-----------------------------------\n")
                
    if not filepath:
        logger.error("No file was selected or entered.")
        raise ValueError("No dataset file path was provided.")
        
    logger.info("Loading CSV dataset from: %s", filepath)
    try:
        # Load and parse analysis_timestamp as datetime
        df = pd.read_csv(filepath, parse_dates=["analysis_timestamp"])
    except Exception as e:
        logger.error("Failed to read CSV file: %s", e)
        raise e
        
    # Run the validation check from utils.py
    validate_dataset(df)
    
    return df


def preprocess(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """
    Separates features X and target label y (risk_level).
    Ensures that FEATURE_COLS excludes: [user_id, analysis_timestamp, risk_level, alert_type, lab_status].
    Encodes 'analysis_timestamp' into a numeric feature: days_since_epoch, and drops original.
    Asserts that no null values remain in X.
    
    Args:
        df (pd.DataFrame): The loaded dataset DataFrame.
        
    Returns:
        tuple[pd.DataFrame, pd.Series]: preprocessed X (DataFrame) and y (Series).
    """
    logger.info("Running preprocessing on the dataset...")
    
    # 1. Separate label y
    label_col = get_label_column()
    y = df[label_col].copy()
    
    # 2. Define FEATURE_COLS: every column except user_id, analysis_timestamp, risk_level, alert_type, lab_status
    exclude_columns = {"user_id", "analysis_timestamp", "risk_level", "alert_type", "lab_status"}
    feature_cols = [col for col in df.columns if col not in exclude_columns]
    
    X = df[feature_cols].copy()
    
    # 3. Assert no nulls remain in X (dataset is pre-imputed)
    null_count = X.isnull().sum().sum()
    assert null_count == 0, (
        f"Assertion failed: Features contain {null_count} null value(s). "
        f"Columns with nulls: {X.columns[X.isnull().any()].tolist()}"
    )
    logger.info("Assertion verified: No null/missing values present in features X.")
    
    # 4. Encode analysis_timestamp into a numeric feature: days_since_epoch
    # Note: analysis_timestamp was parsed as datetime in load_and_validate()
    # Unix epoch is 1970-01-01
    epoch = pd.Timestamp("1970-01-01")
    # Subtraction returns Timedelta objects; divide by Timedelta(days=1) to get fractional days
    days_since_epoch = (df["analysis_timestamp"] - epoch) / pd.Timedelta(days=1)
    
    # Insert new numeric feature and drop original if present (it should not be in feature_cols,
    # but we make sure the final returned X only contains feature_cols plus the new column)
    X["days_since_epoch"] = days_since_epoch
    
    logger.info("Successfully encoded 'analysis_timestamp' as 'days_since_epoch' and removed original.")
    
    return X, y


def split_data(X: pd.DataFrame, y: pd.Series) -> tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    """
    Splits the dataset into 80/20 train/test partitions using a stratified split.
    Prints the exact counts per class in train and test sets to confirm distribution.
    
    Args:
        X (pd.DataFrame): Preprocessed features DataFrame.
        y (pd.Series): Target labels Series.
        
    Returns:
        tuple: X_train, X_test, y_train, y_test
    """
    logger.info("Executing stratified 80/20 split (random_state=42)...")
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print("\n" + "=" * 40)
    print("SPLIT DATASET CLASS DISTRIBUTIONS")
    print("=" * 40)
    print("Train set class counts:")
    train_counts = y_train.value_counts(dropna=False)
    for cls, cnt in train_counts.items():
        print(f"  {str(cls):<20} : {cnt:>6}")
        
    print("\nTest set class counts:")
    test_counts = y_test.value_counts(dropna=False)
    for cls, cnt in test_counts.items():
        print(f"  {str(cls):<20} : {cnt:>6}")
    print("=" * 40 + "\n")
    
    return X_train, X_test, y_train, y_test


def class_weight_dict(y_train: pd.Series) -> dict[int, float]:
    """
    Computes balanced class weights using sklearn compute_class_weight.
    Returns them mapped as a dict {0: w0, 1: w1, 2: w2} based on class index order.
    Prints the computed weights.
    
    Args:
        y_train (pd.Series): Target labels in the training partition.
        
    Returns:
        dict[int, float]: Dict mapping class indexes to computed balanced weights.
    """
    logger.info("Computing balanced class weights...")
    
    unique_classes = np.unique(y_train)
    weights = compute_class_weight(
        class_weight="balanced",
        classes=unique_classes,
        y=y_train
    )
    
    # Map index to weight
    weight_dict = {i: float(w) for i, w in enumerate(weights)}
    
    print("\n" + "=" * 40)
    print("COMPUTED CLASS WEIGHTS")
    print("=" * 40)
    for i, w in weight_dict.items():
        class_label = unique_classes[i]
        print(f"Index {i} ({class_label:<10}) : Weight = {w:.6f}")
    print("=" * 40 + "\n")
    
    return weight_dict


if __name__ == "__main__":
    logger.info("=== STARTING DATA LOADER PIPELINE TEST ===")
    
    # 1. Load and Validate
    df_loaded = load_and_validate()
    print(f"CONFIRMATION - Loaded shape: {df_loaded.shape[0]} rows, {df_loaded.shape[1]} columns")
    
    # 2. Preprocess
    X_processed, y_processed = preprocess(df_loaded)
    print(f"CONFIRMATION - Preprocessed shape - X: {X_processed.shape[0]}x{X_processed.shape[1]}, y: {len(y_processed)}")
    
    # 3. Split
    X_tr, X_te, y_tr, y_te = split_data(X_processed, y_processed)
    print(f"CONFIRMATION - Train partition shape - X_train: {X_tr.shape[0]}x{X_tr.shape[1]}, y_train: {len(y_tr)}")
    print(f"CONFIRMATION - Test partition shape - X_test: {X_te.shape[0]}x{X_te.shape[1]}, y_test: {len(y_te)}")
    
    # 4. Class Weights
    weights_dict = class_weight_dict(y_tr)
    print(f"CONFIRMATION - Class weight dictionary: {weights_dict}")
    
    logger.info("=== DATA LOADER PIPELINE TEST COMPLETED SUCCESSFULLY ===")
