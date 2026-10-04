from contextlib import asynccontextmanager
from fastapi import FastAPI

from config import db_helper
from config import settings
from auth import create_superuser_if_not_exists


def _init_router(_app: FastAPI) -> None:
    from api import router as main_router

    _app.include_router(main_router)


def _init_builder(_app: FastAPI) -> None:
    from api.v1.prompts import build_jsonapi_app

    build_jsonapi_app(_app)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await create_superuser_if_not_exists()
    yield
    await db_helper.dispose()


def create_app(lifespan_karg=None) -> FastAPI:
    _app = FastAPI(
        title=settings.project.title,
        version=settings.project.version,
        description=settings.project.description,
        lifespan=lifespan_karg or lifespan,
    )

    _init_router(_app)
    _init_builder(_app)

    return _app


app = create_app()
