from datetime import datetime
from typing import (
    Annotated,
    Optional,
    TYPE_CHECKING,
)

from annotated_types import MaxLen, MinLen

from fastapi_jsonapi.schema_base import BaseModel
from fastapi_jsonapi.types_metadata import RelationshipInfo

from models import TypeLLM

if TYPE_CHECKING:
    from .category import CategoryReadSchema
    from .tag import TagReadSchema


title_constrained = Annotated[
    str,
    MinLen(1),
    MaxLen(255),
]
pmpt_request_constrained = Annotated[
    str,
    MinLen(1),
    MaxLen(1000),
]


class PromptBaseSchema(BaseModel):
    """Base schema for Prompt"""

    type_llm: TypeLLM = TypeLLM.GPT4
    title: str
    pmpt_request: str
    pmpt_response: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
    rating: int | None = None
    category_id: int | None = None

    category: Annotated[
        Optional["CategoryReadSchema"],
        RelationshipInfo(
            resource_type="category",
            resource_id_example="1",
            id_field_name="id",
        ),
    ] = None

    tags: Annotated[
        Optional[list["TagReadSchema"]],
        RelationshipInfo(
            resource_type="tag",
            many=True,
        ),
    ] = None


class PromptReadSchema(PromptBaseSchema):
    """Read schema for Prompt"""

    id: int
    user_id: int | None = None


class PromptCreateSchema(PromptBaseSchema):
    """Create schema for Prompt"""

    title: title_constrained
    pmpt_request: pmpt_request_constrained
    user_id: int | None = None


class PromptUpdateSchema(PromptBaseSchema):
    """Update schema for Prompt"""

    type_llm: TypeLLM = TypeLLM.GPT4
    title: title_constrained | None = None
    pmpt_request: pmpt_request_constrained | None = None
    pmpt_response: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    rating: int | None = None
