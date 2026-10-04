import time

from fastapi import APIRouter
from fastapi import status

from config import settings
from schemas import InfoRead
from services import build_info
from services.info import STARTED_AT

router = APIRouter(tags=["Info"])


@router.get(
    "",
    response_model=InfoRead,
    status_code=status.HTTP_200_OK,
)
async def get_info():
    return build_info(
        service_name=settings.project.title,
        version=settings.project.version,
        api_version=settings.api.v1.prefix.strip("/"),
        started_at=STARTED_AT,
        now=time.monotonic(),
    )
