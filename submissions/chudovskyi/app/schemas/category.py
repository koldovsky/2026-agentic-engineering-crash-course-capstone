from typing import (
    Annotated,
    Optional,
    TYPE_CHECKING,
)

from annotated_types import MaxLen, MinLen

from fastapi_jsonapi.schema_base import BaseModel
from fastapi_jsonapi.types_metadata import RelationshipInfo

if TYPE_CHECKING:
    from .prompt import PromptReadSchema

name_constrained = Annotated[
    str,
    MinLen(1),
    MaxLen(100),
]
description_constrained = Annotated[
    str,
    MinLen(1),
    MaxLen(255),
]


class CategoryBaseSchema(BaseModel):
    """Base schema for Category"""

    name: str
    description: str | None = None

    prompts: Annotated[
        Optional[list["PromptReadSchema"]],
        RelationshipInfo(
            resource_type="prompt",
            many=True,
        ),
    ] = None


class CategoryReadSchema(CategoryBaseSchema):
    """Read schema for Category"""

    id: int


class CategoryCreateSchema(CategoryBaseSchema):
    """Create schema for Category"""

    name: name_constrained
    description: description_constrained


class CategoryUpdateSchema(CategoryBaseSchema):
    """Update schema for Category"""

    name: name_constrained | None = None
    description: description_constrained | None = None
