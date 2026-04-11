from __future__ import annotations
from typing import Any

try:
    from bson import ObjectId
except ImportError:  # pragma: no cover
    class ObjectId(str):
        @classmethod
        def is_valid(cls, value: Any) -> bool:
            return isinstance(value, str) and len(value) == 24

        def __repr__(self) -> str:
            return f"ObjectId('{super().__str__()}')"

from pydantic import BaseModel  # type: ignore[import]
from pydantic_core import PydanticCustomError, core_schema


class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(cls, source, handler):
        def validate(value: Any):
            if isinstance(value, ObjectId):
                return value
            if isinstance(value, str) and ObjectId.is_valid(value):
                return ObjectId(value)
            raise PydanticCustomError('object_id', 'Invalid ObjectId')

        return core_schema.no_info_plain_validator_function(validate)

    @classmethod
    def __get_pydantic_json_schema__(cls, _schema, _handler):
        return {'type': 'string'}


class MongoModel(BaseModel):
    model_config = {
        'json_encoders': {ObjectId: str},
        'arbitrary_types_allowed': True,
        'from_attributes': True,
        'populate_by_name': True,
    }
