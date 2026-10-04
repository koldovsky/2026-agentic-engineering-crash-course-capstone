from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.orm import declared_attr

from config import settings
from ._utils import camel_case_to_snake_case


class Base(DeclarativeBase):
    __abstract__ = True

    metadata = MetaData(
        naming_convention=settings.db.naming_convention,
    )

    @declared_attr.directive
    def __tablename__(cls) -> str:
        base_name = camel_case_to_snake_case(cls.__name__)
        if base_name.endswith("y"):
            return base_name[:-1] + "ies"
        else:
            return base_name + "s"
