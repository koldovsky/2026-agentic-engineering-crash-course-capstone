from typing import Annotated
from annotated_types import Ge, Le

from pydantic import BaseModel
from pydantic import StringConstraints


class GeminiPromptSchema(BaseModel):
    """Base schema for GeminiPrompt"""

    title: Annotated[
        str,
        StringConstraints(min_length=1, max_length=255),
    ]

    pmpt_request: Annotated[
        str,
        StringConstraints(min_length=1, max_length=1000),
    ]

    category_id: Annotated[
        int,
        Ge(1),
        Le(1000),
    ]
