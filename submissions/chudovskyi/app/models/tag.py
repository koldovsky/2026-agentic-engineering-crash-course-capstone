from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from .base import Base
from .prompt_tag import PromptTag
from ._mixins import IntIdMixin

if TYPE_CHECKING:
    from .prompt import Prompt


class Tag(IntIdMixin, Base):
    name: Mapped[str] = mapped_column(
        String(50),
        unique=True,
    )
    description: Mapped[str] = mapped_column(
        String(125),
        default="",
        server_default="",
    )

    prompts: Mapped[list["Prompt"]] = relationship(
        back_populates="tags",
        secondary=PromptTag.__table__,
    )

    def __str__(self) -> str:
        return self.name

    def __repr__(self) -> str:
        return f"Tag(id={self.id}, title={self.name!r})"
