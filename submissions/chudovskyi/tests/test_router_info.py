import pytest
from httpx import AsyncClient

from app.config import settings


@pytest.mark.asyncio
class TestRouterInfo:
    async def test_get_info_without_auth_returns_200(
        self,
        ac: AsyncClient,
        api_prefix: str,
    ):
        response = await ac.get(f"{api_prefix}/info")

        assert response.status_code == 200

    async def test_get_info_returns_exact_keys(
        self,
        ac: AsyncClient,
        api_prefix: str,
    ):
        response = await ac.get(f"{api_prefix}/info")

        data = response.json()
        assert set(data) == {
            "status",
            "service",
            "version",
            "api_version",
            "uptime_seconds",
        }

    async def test_get_info_returns_project_and_api_values(
        self,
        ac: AsyncClient,
        api_prefix: str,
    ):
        response = await ac.get(f"{api_prefix}/info")

        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == settings.project.title
        assert data["version"] == settings.project.version
        assert data["api_version"] == settings.api.v1.prefix.strip("/")

    async def test_get_info_uptime_is_non_negative_number(
        self,
        ac: AsyncClient,
        api_prefix: str,
    ):
        response = await ac.get(f"{api_prefix}/info")

        uptime = response.json()["uptime_seconds"]
        assert isinstance(uptime, (int, float))
        assert not isinstance(uptime, bool)
        assert uptime >= 0
