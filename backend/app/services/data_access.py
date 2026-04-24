"""
Unified Data Access Layer for CareTrace AI.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATABASE RESPONSIBILITIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PostgreSQL  — structured, relational, identity-critical data
  • User identity (UUID primary key, email, hashed_password)
  • Structured profile fields (age, gender, height_cm, weight_kg, bmi)
  • Onboarding state (is_onboarded)

MongoDB     — dynamic, schema-flexible, time-series health data
  • lab_results       — lab test values, reference ranges, status
  • medication_tracking — medications, dosage, adherence, side effects
  • symptoms          — symptom logs with severity and duration
  • health_metrics    — vitals (BP, heart rate, blood sugar, SpO2)
  • analysis          — AI risk assessments
  • alerts            — automated health notifications
  • medical_history   — conditions, medications, allergies, surgeries
  • family_history    — hereditary condition records
  • lifestyle_data    — sleep, diet, exercise, stress
  • medical_reports   — uploaded PDF/image file metadata (GridFS)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USER ID STRATEGY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

New users  → user_id (UUID string, from PostgreSQL) — preferred
Legacy users → _id (ObjectId, MongoDB-only) — fallback

Always resolve via get_user_ref() from app.utils.user_identity.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
import asyncio

from sqlalchemy import select

from app.core.logger import logger
from app.core.responses import serialize_document
from app.db.db import get_database
from app.db.postgres import get_session_maker
from app.models.postgres_user import PostgresUser
from app.utils.user_identity import get_user_ref


# ── PostgreSQL helpers ────────────────────────────────────────────────────────

async def _fetch_postgres_profile(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch structured profile data from PostgreSQL by UUID.

    Returns a plain dict with safe, serialisable fields, or None when:
      - PostgreSQL is unavailable (not initialised)
      - No matching row exists for the given user_id
      - Database error occurs (logged but not raised)
    """
    session_maker = get_session_maker()
    if session_maker is None:
        logger.warning("data_access: PostgreSQL session maker unavailable")
        return None

    try:
        async with session_maker() as session:
            stmt = select(PostgresUser).where(PostgresUser.id == user_id)
            result = await session.execute(stmt)
            pg_user: Optional[PostgresUser] = result.scalars().first()

        if pg_user is None:
            logger.debug("data_access: no PostgreSQL profile for user_id=%s", user_id)
            return None

        return {
            "user_id":      pg_user.id,
            "email":        pg_user.email,
            "name":         pg_user.name,
            "age":          pg_user.age,
            "gender":       pg_user.gender,
            "height_cm":    pg_user.height_cm,
            "weight_kg":    pg_user.weight_kg,
            "blood_group":  pg_user.blood_group,
            "bmi":          pg_user.bmi,
            "health_goal":  pg_user.health_goal,
            "is_onboarded": pg_user.is_onboarded,
            "created_at":   pg_user.created_at.isoformat() if pg_user.created_at else None,
            "updated_at":   pg_user.updated_at.isoformat() if pg_user.updated_at else None,
        }
    except Exception as exc:
        logger.warning("data_access: PostgreSQL profile fetch failed for user_id=%s: %s", user_id, exc)
        return None


# ── MongoDB helpers ───────────────────────────────────────────────────────────

async def _fetch_mongo_collection(
    collection_name: str,
    user_ref: Any,
    sort_field: str,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    """
    Fetch documents from a MongoDB collection filtered by user_ref.

    Args:
        collection_name: MongoDB collection to query.
        user_ref:        UUID string (new users) or ObjectId (legacy users).
        sort_field:      Field to sort by, descending.
        limit:           Maximum number of documents to return.

    Returns:
        List of serialised documents, empty list on any error.
    """
    try:
        db = get_database()
        collection = db[collection_name]
        cursor = collection.find({"user_id": user_ref}).sort(sort_field, -1).limit(limit)
        return [serialize_document(doc) async for doc in cursor]
    except Exception as exc:
        logger.warning(
            "data_access: failed to fetch %s for user_ref=%s: %s",
            collection_name, user_ref, exc,
        )
        return []


# ── Profile fallback from MongoDB ────────────────────────────────────────────

def _build_mongo_profile_fallback(current_user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build a profile dict from the MongoDB user document.

    Used when PostgreSQL is unavailable or the user predates dual-DB.
    Strips sensitive fields and normalises the _id → id key.
    """
    doc = serialize_document(current_user)
    # Expose the resolved user_ref as user_id for consistency
    doc.setdefault("user_id", str(current_user.get("user_id") or current_user.get("_id", "")))
    return doc


# ── Atomic Dual-Database Operations ──────────────────────────────────────────

class DualDatabaseTransaction:
    """
    Context manager for atomic dual-database operations.
    
    Ensures that operations affecting both PostgreSQL and MongoDB are atomic:
    - If PostgreSQL fails, MongoDB is not updated
    - If MongoDB fails, PostgreSQL is rolled back
    - If PostgreSQL commit fails, MongoDB changes are compensated (rolled back)
    
    Usage:
        async with DualDatabaseTransaction(user_id) as txn:
            await txn.update_postgres(lambda pg_user: setattr(pg_user, 'field', value))
            await txn.update_mongo(collection_name, filter_dict, update_dict)
    """
    
    def __init__(self, user_id: str):
        """
        Initialize a dual-database transaction.
        
        Args:
            user_id: UUID string for the user (PostgreSQL primary key)
        """
        self.user_id = user_id
        self.pg_session = None
        self.pg_session_maker = None
        self.mongo_db = None
        self.mongo_operations = []  # Track MongoDB operations for rollback
        self.pg_committed = False
        
    async def __aenter__(self):
        """Enter the transaction context."""
        # Initialize PostgreSQL session
        self.pg_session_maker = get_session_maker()
        if self.pg_session_maker is not None:
            self.pg_session = self.pg_session_maker()
        
        # Initialize MongoDB connection
        try:
            self.mongo_db = get_database()
        except RuntimeError as exc:
            # MongoDB not initialized - close PostgreSQL session if opened
            if self.pg_session is not None:
                if hasattr(self.pg_session, 'close'):
                    close_method = self.pg_session.close()
                    if hasattr(close_method, '__await__'):
                        await close_method
            raise exc
        
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """
        Exit the transaction context.
        
        If an exception occurred:
        - Rollback PostgreSQL changes
        - Attempt to compensate MongoDB changes
        
        If no exception:
        - Commit PostgreSQL changes
        - If commit fails, compensate MongoDB changes
        """
        if exc_type is not None:
            # Exception occurred during transaction - rollback everything
            await self._rollback_all()
            return False  # Re-raise the exception
        
        # No exception - attempt to commit PostgreSQL
        if self.pg_session is not None:
            try:
                commit_result = self.pg_session.commit()
                if hasattr(commit_result, '__await__'):
                    await commit_result
                self.pg_committed = True
                logger.info(
                    "data_access: dual-database transaction committed for user_id=%s",
                    self.user_id
                )
            except Exception as exc:
                # PostgreSQL commit failed - must compensate MongoDB changes
                logger.error(
                    "data_access: PostgreSQL commit failed for user_id=%s: %s",
                    self.user_id, exc
                )
                await self._rollback_all()
                raise  # Re-raise the commit exception
            finally:
                close_result = self.pg_session.close()
                if hasattr(close_result, '__await__'):
                    await close_result
        
        return True
    
    async def _rollback_all(self):
        """Rollback both PostgreSQL and MongoDB changes."""
        # Rollback PostgreSQL
        if self.pg_session is not None:
            try:
                rollback_result = self.pg_session.rollback()
                if hasattr(rollback_result, '__await__'):
                    await rollback_result
                logger.info(
                    "data_access: PostgreSQL rolled back for user_id=%s",
                    self.user_id
                )
            except Exception as exc:
                logger.error(
                    "data_access: PostgreSQL rollback failed for user_id=%s: %s",
                    self.user_id, exc
                )
            finally:
                close_result = self.pg_session.close()
                if hasattr(close_result, '__await__'):
                    await close_result
        
        # Compensate MongoDB changes (reverse the operations)
        if self.mongo_operations and not self.pg_committed:
            await self._compensate_mongo_operations()
    
    async def _compensate_mongo_operations(self):
        """
        Compensate (undo) MongoDB operations.
        
        This implements a simple compensation strategy:
        - For updates, restore the original values
        - For inserts, delete the inserted documents
        - For deletes, restore the deleted documents (if we saved them)
        """
        logger.info(
            "data_access: compensating %d MongoDB operations for user_id=%s",
            len(self.mongo_operations), self.user_id
        )
        
        for operation in reversed(self.mongo_operations):
            op_type = operation["type"]
            collection_name = operation["collection"]
            collection = self.mongo_db[collection_name]
            
            import asyncio
            cleanup_success = False
            for attempt in range(1, 4):
                try:
                    if op_type == "update":
                        # Restore original values
                        filter_dict = operation["filter"]
                        original_values = operation["original_values"]
                        if original_values:
                            await collection.update_one(
                                filter_dict,
                                {"$set": original_values}
                            )
                            logger.info(
                                "data_access: compensated MongoDB update in %s for user_id=%s on attempt %d",
                                collection_name, self.user_id, attempt
                            )
                    
                    elif op_type == "insert":
                        # Delete the inserted document
                        doc_id = operation["doc_id"]
                        await collection.delete_one({"_id": doc_id})
                        logger.info(
                            "data_access: compensated MongoDB insert in %s for user_id=%s on attempt %d",
                            collection_name, self.user_id, attempt
                        )
                    
                    cleanup_success = True
                    break
                except Exception as exc:
                    logger.error(
                        "data_access: MongoDB compensation failed on attempt %d for user_id=%s: %s",
                        attempt, self.user_id, exc
                    )
                    await asyncio.sleep(0.5)
            
            if not cleanup_success:
                logger.critical(
                    "CRITICAL: Failed to compensate MongoDB operation in %s for user_id=%s after 3 attempts!",
                    collection_name, self.user_id
                )
    
    async def update_postgres(self, update_fn):
        """
        Update PostgreSQL within the transaction.
        
        Args:
            update_fn: Function (sync or async) that receives the PostgresUser object
                      and performs updates on it
        
        Raises:
            Exception: If PostgreSQL session is not available or update fails
        """
        if self.pg_session is None:
            raise Exception("PostgreSQL session not available")
        
        from sqlalchemy import select
        from app.models.postgres_user import PostgresUser
        
        # Fetch the user
        execute_result = self.pg_session.execute(
            select(PostgresUser).where(PostgresUser.id == self.user_id)
        )
        if hasattr(execute_result, '__await__'):
            result = await execute_result
        else:
            result = execute_result
        pg_user = result.scalars().first()
        
        if pg_user is None:
            raise Exception(f"PostgreSQL user not found: {self.user_id}")
        
        # Apply the update function (handle both sync and async)
        import inspect
        if inspect.iscoroutinefunction(update_fn):
            await update_fn(pg_user)
        else:
            update_fn(pg_user)
        
        # Flush to validate changes (but don't commit yet)
        flush_result = self.pg_session.flush()
        if hasattr(flush_result, '__await__'):
            await flush_result
        
        logger.debug(
            "data_access: PostgreSQL update flushed for user_id=%s",
            self.user_id
        )
    
    async def update_mongo(
        self,
        collection_name: str,
        filter_dict: Dict[str, Any],
        update_dict: Dict[str, Any],
        save_original: bool = True
    ):
        """
        Update MongoDB within the transaction.
        
        Args:
            collection_name: Name of the MongoDB collection
            filter_dict: Filter to identify documents to update
            update_dict: Update operations (e.g., {"$set": {...}})
            save_original: Whether to save original values for compensation
        
        Raises:
            Exception: If MongoDB update fails
        """
        collection = self.mongo_db[collection_name]
        
        # Save original values for compensation if requested
        original_values = None
        if save_original:
            original_doc = await collection.find_one(filter_dict)
            if original_doc:
                # Extract the fields being updated
                if "$set" in update_dict:
                    original_values = {
                        key: original_doc.get(key)
                        for key in update_dict["$set"].keys()
                        if key in original_doc
                    }
        
        # Perform the update
        result = await collection.update_one(filter_dict, update_dict)
        
        if result.matched_count == 0:
            raise Exception(
                f"MongoDB document not found in {collection_name}: {filter_dict}"
            )
        
        # Track the operation for potential compensation
        self.mongo_operations.append({
            "type": "update",
            "collection": collection_name,
            "filter": filter_dict,
            "update": update_dict,
            "original_values": original_values
        })
        
        logger.debug(
            "data_access: MongoDB update completed in %s for user_id=%s",
            collection_name, self.user_id
        )


async def atomic_dual_database_update(
    user_id: str,
    postgres_update_fn,
    mongo_collection: str,
    mongo_filter: Dict[str, Any],
    mongo_update: Dict[str, Any]
) -> None:
    """
    Perform an atomic update across both PostgreSQL and MongoDB.
    
    This function ensures that either both databases are updated successfully,
    or neither is updated (rollback on failure).
    
    Args:
        user_id: UUID string for the user
        postgres_update_fn: Async function that receives PostgresUser and updates it
        mongo_collection: MongoDB collection name
        mongo_filter: MongoDB filter dict
        mongo_update: MongoDB update dict
    
    Raises:
        Exception: If either database operation fails
    
    Example:
        await atomic_dual_database_update(
            user_id="uuid-123",
            postgres_update_fn=lambda pg_user: setattr(pg_user, 'is_onboarded', True),
            mongo_collection="users",
            mongo_filter={"_id": ObjectId("...")},
            mongo_update={"$set": {"is_onboarded": True}}
        )
    """
    async with DualDatabaseTransaction(user_id) as txn:
        # Update PostgreSQL first (validates changes with flush)
        await txn.update_postgres(postgres_update_fn)
        
        # Update MongoDB (tracked for compensation)
        await txn.update_mongo(mongo_collection, mongo_filter, mongo_update)
    
    logger.info(
        "data_access: atomic dual-database update completed for user_id=%s",
        user_id
    )


# ── Public API ────────────────────────────────────────────────────────────────

async def get_complete_user_data(current_user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Aggregate a user's full health profile from both databases.

    Resolution order:
      1. Resolve user_ref via get_user_ref() (UUID preferred, ObjectId fallback).
      2. If user_ref is a UUID string → fetch structured profile from PostgreSQL.
         Otherwise (legacy ObjectId) → build profile from the MongoDB document.
      3. Concurrently fetch lab_results, medication_tracking, and symptoms
         from MongoDB.
      4. Return a single unified dict.

    Args:
        current_user: The authenticated user dict returned by get_current_user().

    Returns:
        {
            "profile":     {...},   # structured identity + health profile
            "labs":        [...],   # lab results, newest first
            "medications": [...],   # medication tracking records, newest first
            "symptoms":    [...],   # symptom logs, newest first
        }
    """
    user_ref = get_user_ref(current_user)
    is_uuid  = isinstance(user_ref, str)

    logger.debug(
        "data_access: get_complete_user_data user_ref=%s type=%s",
        user_ref, "uuid" if is_uuid else "objectid",
    )

    # ── 1. Profile ────────────────────────────────────────────────────────────
    if is_uuid:
        profile = await _fetch_postgres_profile(user_ref)
        if profile is None:
            # PostgreSQL unavailable or row missing — degrade gracefully
            logger.warning(
                "data_access: PostgreSQL profile missing for uuid=%s, using MongoDB fallback",
                user_ref,
            )
            profile = _build_mongo_profile_fallback(current_user)
    else:
        # Legacy user: no PostgreSQL row exists
        profile = _build_mongo_profile_fallback(current_user)

    # ── 2. MongoDB collections (concurrent) ───────────────────────────────────
    labs_task = _fetch_mongo_collection(
        collection_name="lab_results",
        user_ref=user_ref,
        sort_field="recorded_at",
    )
    meds_task = _fetch_mongo_collection(
        collection_name="medication_tracking",
        user_ref=user_ref,
        sort_field="created_at",
    )
    symptoms_task = _fetch_mongo_collection(
        collection_name="symptoms",
        user_ref=user_ref,
        sort_field="timestamp",
    )

    labs, medications, symptoms = await asyncio.gather(
        labs_task, meds_task, symptoms_task
    )

    logger.debug(
        "data_access: fetched labs=%d medications=%d symptoms=%d for user_ref=%s",
        len(labs), len(medications), len(symptoms), user_ref,
    )

    return {
        "profile":     profile,
        "labs":        labs,
        "medications": medications,
        "symptoms":    symptoms,
    }
