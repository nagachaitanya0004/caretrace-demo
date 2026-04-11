import os
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://127.0.0.1:27017')
MONGO_DB = os.getenv('MONGO_DB', 'caretrace_ai')
APP_NAME = os.getenv('APP_NAME', 'CareTrace AI Backend')
APP_VERSION = os.getenv('APP_VERSION', '1.0.0')
