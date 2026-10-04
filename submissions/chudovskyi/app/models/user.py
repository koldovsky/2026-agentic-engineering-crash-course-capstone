from typing import TYPE_CHECKING

from sqlalchemy.orm import (
    Mapped,
    relationship,
)

from fastapi_users_db_sqlalchemy import (
    SQLAlchemyBaseUserTable,
    SQLAlchemyUserDatabase,
)

from .base import Base
from ._mixins import IntIdMixin

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession
    from .prompt import Prompt


class User(Base, IntIdMixin, SQLAlchemyBaseUserTable[int]):
    prompts: Mapped[list["Prompt"]] = relationship(
        # "Prompt",
        back_populates="user",
        # cascade="all, delete-orphan",
    )

    @classmethod
    def get_db(cls, session: "AsyncSession"):
        return SQLAlchemyUserDatabase(session, cls)
