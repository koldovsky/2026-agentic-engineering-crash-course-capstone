from pydantic import (
    BaseModel,
    SecretStr,
)
from sqlalchemy import URL


class SQLAlchemyConfig(BaseModel):
    echo: bool = False
    echo_pool: bool = False
    pool_size: int = 50
    max_overflow: int = 10


class DatabaseConfig(BaseModel):
    name: str = "app_db"
    host: str = "localhost"
    port: int = 5432
    username: str = "user"
    password: SecretStr = SecretStr("pass")
    drivername: str = "postgresql+asyncpg"

    sqla: SQLAlchemyConfig = SQLAlchemyConfig()

    naming_convention: dict[str, str] = {
        "ix": "ix_%(column_0_label)s",
        "uq": "uq_%(table_name)s_%(column_0_N_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    }

    @property
    def async_url(self) -> URL:
        return URL.create(
            database=self.name,
            host=self.host,
            port=self.port,
            username=self.username,
            password=self.password.get_secret_value(),
            drivername=self.drivername,
        )


class SuperuserConfig(BaseModel):
    default_email: str
    default_password: str
    default_is_active: bool
    default_is_superuser: bool
    default_is_verified: bool
