from typing import (
    Annotated,
    Optional,
    TYPE_CHECKING,
)

from annotated_types import MaxLen, MinLen, LowerCase

from fastapi_jsonapi.schema_base import BaseModel
from fastapi_jsonapi.types_metadata import RelationshipInfo

if TYPE_CHECKING:
    from .prompt import PromptReadSchema


name_constrained = Annotated[
    str,
    MinLen(1),
    MaxLen(50),
    LowerCase,
]
description_constrained = Annotated[
    str,
    MinLen(1),
    MaxLen(125),
]


class TagBaseSchema(BaseModel):
    """Base schema for Tag"""

    name: str
    description: str | None = None

    prompts: Annotated[
        Optional[list["PromptReadSchema"]],
        RelationshipInfo(
            resource_type="prompt",
            many=True,
        ),
    ] = None


class TagReadSchema(TagBaseSchema):
    """Read schema for Tag"""

    id: int


class TagCreateSchema(TagBaseSchema):
    """Create schema for Tag"""

    name: name_constrained
    description: description_constrained


class TagUpdateSchema(TagBaseSchema):
    """Update schema for Tag"""

    name: name_constrained | None = None
    description: description_constrained | None = None
