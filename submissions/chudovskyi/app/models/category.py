from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from .base import Base
from ._mixins import IntIdMixin

if TYPE_CHECKING:
    from .prompt import Prompt


class Category(IntIdMixin, Base):
    name: Mapped[str] = mapped_column(
        String(100),
    )
    description: Mapped[str] = mapped_column(
        String(255),
        default="",
        server_default="",
    )
    prompts: Mapped[list["Prompt"]] = relationship(
        back_populates="category",
    )

    def __str__(self) -> str:
        return self.name

    def __repr__(self) -> str:
        return f"Category(id={self.id}, title={self.name!r})"
