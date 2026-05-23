import os
import sys
import logging
import pandas as pd

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("CareTraceML.utils")

# The exact list of 48 required columns for the CareTrace AI dataset
REQUIRED_COLUMNS = [
    # Metadata & Labels (5 columns)
    "user_id",
    "analysis_timestamp",
    "risk_level",
    "alert_type",
    "lab_status",
    
    # Demographics & Physical profile (6 columns)
    "age",
    "gender",
    "height_cm",
    "weight_kg",
    "bmi",
    "blood_group",
    
    # Lifestyle Data (8 columns)
    "sleep_hours",
    "sleep_quality",
    "diet_type",
    "exercise_frequency",
    "water_intake_liters",
    "smoking",
    "alcohol",
    "stress_level",
    
    # Vitals & Vitals history (6 columns)
    "systolic_bp",
    "diastolic_bp",
    "blood_sugar_mg_dl",
    "heart_rate_bpm",
    "oxygen_saturation",
    "body_temperature",
    
    # Symptoms & Clinical presentations (11 columns)
    "symptom_fatigue",
    "symptom_cough",
    "symptom_fever",
    "symptom_chest_pain",
    "symptom_blurry_vision",
    "symptom_headache",
    "symptom_shortness_of_breath",
    "symptom_nausea",
    "symptom_dizziness",
    "symptom_sore_throat",
    "symptom_body_aches",
    
    # Medical & Family History (5 columns)
    "history_diabetes",
    "history_hypertension",
    "history_asthma",
    "history_heart_disease",
    "history_allergies",
    
    # Medication metrics (2 columns)
    "med_adherence_rate",
    "med_side_effects_count",
    
    # Activity and Wearable Tracker metrics (5 columns)
    "daily_steps",
    "active_minutes",
    "calories_burned",
    "sleep_deep_minutes",
    "sleep_rem_minutes"
]


def load_dataset() -> pd.DataFrame:
    """
    Opens a file dialog so the user can select their CSV dataset file.
    If Tkinter is unavailable or throws a TclError (e.g. in headless environments),
    falls back gracefully to command-line input.
    
    Returns:
        pd.DataFrame: Loaded dataset as a pandas DataFrame.
    """
    # Check if path is provided in environment variables first
    env_path = os.environ.get("CARETRACE_DATASET_PATH")
    if env_path:
        logger.info("Found dataset path in environment variable CARETRACE_DATASET_PATH: %s", env_path)
        file_path = env_path
    else:
        logger.info("Opening file dialog to select CareTrace CSV dataset...")
        file_path = None
        try:
            import tkinter as tk
            from tkinter import filedialog
            
            # Initialize Tkinter root and immediately hide the window
            root = tk.Tk()
            root.withdraw()
            root.attributes('-topmost', True)
            
            # Open standard open file dialog
            file_path = filedialog.askopenfilename(
                title="Select CareTrace CSV Dataset",
                filetypes=[("CSV Files", "*.csv"), ("All Files", "*.*")]
            )
            root.destroy()
        except Exception as e:
            logger.warning(
                "Graphical file dialog could not be initialized (error: %s). "
                "Falling back to command-line prompt.", e
            )
        
    if not file_path:
        # Prompt user on standard input
        print("\n--- CSV FILE SELECTION FALLBACK ---")
        file_path = input("Enter the absolute or relative path to the CSV dataset: ").strip()
        print("-----------------------------------\n")
        
    if not file_path:
        logger.error("No file was selected or entered.")
        raise ValueError("No dataset file path provided.")
        
    if not os.path.exists(file_path):
        logger.error("The specified path does not exist: %s", file_path)
        raise FileNotFoundError(f"File not found: {file_path}")
        
    logger.info("Successfully resolved file path: %s", file_path)
    logger.info("Loading CSV file into pandas DataFrame...")
    
    try:
        df = pd.read_csv(file_path)
        logger.info("Successfully loaded dataset with %d rows and %d columns.", df.shape[0], df.shape[1])
        return df
    except Exception as e:
        logger.error("Failed to read CSV file: %s", e)
        raise e


def validate_dataset(df: pd.DataFrame) -> None:
    """
    Validates that all 48 required columns are present in the DataFrame.
    If columns are missing, raises a ValueError.
    Prints a detailed summary containing dataset shape, null counts,
    and the distribution of the target label 'risk_level'.
    
    Args:
        df (pd.DataFrame): The DataFrame to validate.
    """
    logger.info("Starting dataset validation...")
    
    # Check for missing columns
    missing_columns = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    
    if missing_columns:
        logger.error("Dataset validation failed. Missing required columns: %s", missing_columns)
        raise ValueError(
            f"Dataset is missing {len(missing_columns)} required columns. "
            f"Missing: {missing_columns}"
        )
        
    logger.info("Dataset validation passed! All 48 required columns are present.")
    
    # 1. Print Shape
    print("\n" + "=" * 50)
    print("CARETRACE DATASET VALIDATION SUMMARY")
    print("=" * 50)
    print(f"Total Rows:    {df.shape[0]}")
    print(f"Total Columns: {df.shape[1]}")
    
    # 2. Print Null Counts
    print("\n--- NULL VALUE COUNTS ---")
    null_counts = df[REQUIRED_COLUMNS].isnull().sum()
    columns_with_nulls = null_counts[null_counts > 0]
    
    if not columns_with_nulls.empty:
        for col, count in columns_with_nulls.items():
            percentage = (count / len(df)) * 100
            print(f"{col:<30} : {count:>5} missing ({percentage:>5.2f}%)")
    else:
        print("No missing/null values detected in the required columns.")
        
    # 3. Print Label Distribution
    print("\n--- LABEL DISTRIBUTION ('risk_level') ---")
    label_col = get_label_column()
    if label_col in df.columns:
        distribution = df[label_col].value_counts(dropna=False)
        for label, count in distribution.items():
            percentage = (count / len(df)) * 100
            label_str = str(label)
            print(f"{label_str:<30} : {count:>5} records ({percentage:>5.2f}%)")
    else:
        print(f"Warning: Label column '{label_col}' not found.")
        
    print("=" * 50 + "\n")


def get_feature_columns() -> list[str]:
    """
    Returns the exact list of feature columns, excluding identifier metadata,
    timestamps, and target labels.
    
    Excluded columns: user_id, analysis_timestamp, risk_level, alert_type, lab_status.
    
    Returns:
        list[str]: Exact list of 43 feature columns.
    """
    exclude_columns = {"user_id", "analysis_timestamp", "risk_level", "alert_type", "lab_status"}
    return [col for col in REQUIRED_COLUMNS if col not in exclude_columns]


def get_label_column() -> str:
    """
    Returns the label column name.
    
    Returns:
        str: 'risk_level'
    """
    return "risk_level"
