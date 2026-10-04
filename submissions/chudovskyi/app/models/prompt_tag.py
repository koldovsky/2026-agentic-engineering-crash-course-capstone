from sqlalchemy import (
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from .base import Base
from ._mixins import IntIdMixin


class PromptTag(IntIdMixin, Base):
    __tablename__ = "prompt_tag_association"

    prompt_id: Mapped[int] = mapped_column(
        ForeignKey(
            "prompts.id",
            ondelete="CASCADE",
        ),
    )
    tag_id: Mapped[int] = mapped_column(
        ForeignKey(
            "tags.id",
            ondelete="CASCADE",
        ),
    )

    __table_args__ = (
        UniqueConstraint(
            prompt_id,
            tag_id,
        ),
    )
