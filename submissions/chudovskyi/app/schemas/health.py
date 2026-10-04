from typing import Literal

from pydantic import BaseModel


class HealthRead(BaseModel):
    """Read schema for the health check"""

    status: Literal["ok"]
    service: str
    version: str
    uptime_seconds: int
