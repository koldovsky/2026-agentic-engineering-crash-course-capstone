from typing import Literal

from pydantic import BaseModel


class InfoRead(BaseModel):
    """Read schema for the service info"""

    status: Literal["ok"]
    service: str
    version: str
    api_version: str
    uptime_seconds: float
