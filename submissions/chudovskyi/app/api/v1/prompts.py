from fastapi import FastAPI
from fastapi_jsonapi import ApplicationBuilder

from config import settings
from models import (
    Prompt,
    Category,
    Tag,
)
from schemas import (
    PromptReadSchema,
    PromptCreateSchema,
    PromptUpdateSchema,
    CategoryReadSchema,
    CategoryCreateSchema,
    CategoryUpdateSchema,
    TagReadSchema,
    TagCreateSchema,
    TagUpdateSchema,
)

from .dependencies import GenericView


def build_jsonapi_app(app: FastAPI):
    """https://mts-ai.github.io/FastAPI-JSONAPI/"""

    builder = ApplicationBuilder(
        app=app,
        prefix=settings.api.builder_url,
    )

    builder.add_resource(
        path="/prompts",
        tags=["Prompts"],
        resource_type="prompt",
        view=GenericView,
        model=Prompt,
        schema=PromptReadSchema,
        schema_in_post=PromptCreateSchema,
        schema_in_patch=PromptUpdateSchema,
    )

    builder.add_resource(
        path="/categories",
        tags=["Categories"],
        resource_type="category",
        view=GenericView,
        model=Category,
        schema=CategoryReadSchema,
        schema_in_post=CategoryCreateSchema,
        schema_in_patch=CategoryUpdateSchema,
    )

    builder.add_resource(
        path="/tags",
        tags=["Tags"],
        resource_type="tag",
        view=GenericView,
        model=Tag,
        schema=TagReadSchema,
        schema_in_post=TagCreateSchema,
        schema_in_patch=TagUpdateSchema,
    )

    builder.initialize()
