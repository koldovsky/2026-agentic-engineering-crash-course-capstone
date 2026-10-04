from fastapi import (
    APIRouter,
    Depends,
)

from config import settings

from api.v1.auth import router as auth_router
from api.v1.users import router as users_router
from api.v1.messages import router as messages_router
from api.v1.gemini import router as gemini_router
from api.v1.health import router as health_router
from api.v1.info import router as info_router

from .dependencies import get_http_bearer

router = APIRouter(
    prefix=settings.api.v1.prefix,
    dependencies=[Depends(get_http_bearer())],
)

router.include_router(
    gemini_router,
    prefix=settings.api.v1.gemini,
)

router.include_router(
    auth_router,
    prefix=settings.api.v1.auth,
)

router.include_router(
    users_router,
    prefix=settings.api.v1.users,
)

router.include_router(
    messages_router,
    prefix=settings.api.v1.messages,
)

router.include_router(
    health_router,
    prefix=settings.api.v1.health,
)

router.include_router(
    info_router,
    prefix=settings.api.v1.info,
)
