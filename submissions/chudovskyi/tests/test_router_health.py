import pytest
from httpx import AsyncClient

from app.config import settings


@pytest.mark.asyncio
class TestRouterHealth:
    async def test_get_health_without_auth_returns_200(
        self,
        ac: AsyncClient,
        api_prefix: str,
    ):
        response = await ac.get(f"{api_prefix}/health")

        assert response.status_code == 200

    async def test_get_health_returns_project_info_and_uptime(
        self,
        ac: AsyncClient,
        api_prefix: str,
    ):
        response = await ac.get(f"{api_prefix}/health")

        data = response.json()
        assert set(data) == {"status", "service", "version", "uptime_seconds"}
        assert data["status"] == "ok"
        assert data["service"] == settings.project.title
        assert data["version"] == settings.project.version
        assert isinstance(data["uptime_seconds"], int)
        assert data["uptime_seconds"] >= 0
