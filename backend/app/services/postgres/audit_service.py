import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from app.db.postgres import get_pg_session
from app.models.postgres_models import AuditLog
from app.core.logger import logger

class AuditService:
    """
    SECONDARY DATA SERVICE: Manages audit logs in PostgreSQL.
    Operations are designed to be fail-safe; if PG is down, logs are skipped or sent to fallback.
    """
    @staticmethod
    async def log_action(
        user_id: str, 
        action: str, 
        resource: Optional[str] = None, 
        payload: Optional[Dict[str, Any]] = None
    ):
        session = get_pg_session()
        if not session:
            logger.debug(f"Audit log skipped (PostgreSQL inactive): {action} by {user_id}")
            return

        try:
            async with session:
                log_entry = AuditLog(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    action=action,
                    resource=resource,
                    payload=payload,
                    timestamp=datetime.utcnow()
                )
                session.add(log_entry)
                await session.commit()
        except Exception as exc:
            logger.warning(f"Failed to write audit log to PostgreSQL: {exc}")
