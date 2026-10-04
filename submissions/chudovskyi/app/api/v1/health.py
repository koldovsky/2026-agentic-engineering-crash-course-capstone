from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi import status

from config import settings
from schemas import HealthRead
from services import build_health

router = APIRouter(tags=["Health"])

STARTED_AT = datetime.now(timezone.utc)


@router.get(
    "",
    response_model=HealthRead,
    status_code=status.HTTP_200_OK,
)
async def get_health():
    return build_health(
        service_name=settings.project.title,
        version=settings.project.version,
        started_at=STARTED_AT,
        now=datetime.now(timezone.utc),
    )
