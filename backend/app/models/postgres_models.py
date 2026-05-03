from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON, Text
from app.db.postgres import PostgresBase

class AuditLog(PostgresBase):
    """
    SECONDARY DATA: Tracks system usage and administrative actions.
    Primary health data remains in MongoDB.
    """
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(64), index=True)
    action = Column(String(100), nullable=False)
    resource = Column(String(100))
    payload = Column(JSON)
    timestamp = Column(DateTime, default=datetime.utcnow)

class SystemConfig(PostgresBase):
    """
    SECONDARY DATA: Global application configuration and feature flags.
    """
    __tablename__ = "system_config"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    description = Column(String(255))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
