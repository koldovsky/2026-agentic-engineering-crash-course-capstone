import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import func
from sqlalchemy import (
    Integer,
    String,
    ForeignKey,
    Text,
    DateTime,
    Enum,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from .base import Base
from .prompt_tag import PromptTag
from ._mixins import IntIdMixin

if TYPE_CHECKING:
    from .category import Category
    from .tag import Tag
    from .user import User


class TypeLLM(str, enum.Enum):
    GPT4 = "GPT-4"
    GPT35 = "GPT-3.5"
    GEMINI = "Gemini"
    COPILOT = "Copilot"
    CLAUDE = "Claude"
    LLAMA3 = "Llama-3"
    CUSTOM = "custom"


class Prompt(IntIdMixin, Base):
    type_llm: Mapped[TypeLLM] = mapped_column(
        Enum(TypeLLM),
        default=TypeLLM.GPT4,
    )
    title: Mapped[str] = mapped_column(
        String(255),
        index=True,
    )
    pmpt_request: Mapped[str] = mapped_column(
        String(1000),
    )
    pmpt_response: Mapped[str] = mapped_column(
        Text,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    rating: Mapped[int] = mapped_column(
        Integer,
        default=0,
    )
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "categories.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    category: Mapped["Category"] = relationship(
        back_populates="prompts",
    )

    tags: Mapped[list["Tag"]] = relationship(
        back_populates="prompts",
        secondary=PromptTag.__table__,
    )

    user: Mapped["User"] = relationship(
        # "User",
        back_populates="prompts",
    )

    def __str__(self) -> str:
        return self.title

    def __repr__(self) -> str:
        return f"Prompt(id={self.id}, title={self.title!r})"
