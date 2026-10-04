import os
from enum import Enum
from pathlib import Path

from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
    PydanticBaseSettingsSource,
    NestedSecretsSettingsSource,
)

from config.components.run_config import RunConfig
from config.components.project_config import ProjectConfig
from config.components.api_config import ApiPrefixConfig
from config.components.db_config import DatabaseConfig
from config.components.db_config import SuperuserConfig
from config.components.token_config import AccessTokenConfig
from config.components.gemini_config import GeminiConfig
from config.components.logging_config import LoggingConfig

BASE_DIR = Path(__file__).resolve().parent.parent
ENVS_DIR = BASE_DIR / "config" / "envs"


class AppEnv(str, Enum):
    DEV = "dev"
    TEST = "test"
    PROD = "prod"


ENV = os.getenv("APP_CONFIG__ENV", AppEnv.DEV.value)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            ENVS_DIR / ".env.template",
            ENVS_DIR / f".env.{ENV}",
        ),
        env_prefix="APP_CONFIG__",
        env_nested_delimiter="__",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    run: RunConfig = RunConfig()
    api: ApiPrefixConfig = ApiPrefixConfig()
    project: ProjectConfig = ProjectConfig()
    logging: LoggingConfig = LoggingConfig()
    db: DatabaseConfig
    access_token: AccessTokenConfig
    superuser: SuperuserConfig
    gemini: GeminiConfig

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:

        # base (for dev or test)
        sources = [
            init_settings,
            env_settings,
            dotenv_settings,
        ]

        # for prod
        if ENV == AppEnv.PROD.value:
            secrets_source = NestedSecretsSettingsSource(
                file_secret_settings,
                secrets_dir="/run/secrets",
                secrets_prefix="APP_CONFIG__",
                secrets_nested_delimiter="__",
                secrets_case_sensitive=False,
            )
            sources.insert(1, secrets_source)

        return tuple(sources)


settings = Settings()
