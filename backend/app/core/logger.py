import logging
import os
import sys

# Determine log level from environment
log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
numeric_level = getattr(logging, log_level, logging.INFO)

# Configure logging format
log_format = '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
date_format = '%Y-%m-%d %H:%M:%S'

# Configure root logger
logging.basicConfig(
    level=numeric_level,
    format=log_format,
    datefmt=date_format,
    stream=sys.stdout,  # Ensure logs go to stdout for container environments
)

# Create application logger
logger = logging.getLogger('caretrace_ai')

# Set specific log levels for noisy libraries
logging.getLogger('motor').setLevel(logging.WARNING)
logging.getLogger('pymongo').setLevel(logging.WARNING)
logging.getLogger('asyncpg').setLevel(logging.WARNING)
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

# Log startup information
logger.info('Logging configured - Level: %s', log_level)
