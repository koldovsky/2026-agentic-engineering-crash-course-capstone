import pytest
from typing import Any, cast
from httpx import AsyncClient
from fastapi import status
from fastapi_users.router import ErrorCode


@pytest.mark.asyncio
class TestRegister:

    async def test_empty_body(
        self,
        ac: AsyncClient,
        api_prefix: str,
    ):
        response = await ac.post(
            f"{api_prefix}/auth/register",
            json={},
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    async def test_missing_email(
        self,
        ac: AsyncClient,
        api_prefix: str,
    ):
        json = {"password": "guinevere"}
        response = await ac.post(
            f"{api_prefix}/auth/register",
            json=json,
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    async def test_missing_password(
        self,
        ac: AsyncClient,
        api_prefix: str,
    ):
        json = {"email": "king.arthur@camelot.bt"}
        response = await ac.post(
            f"{api_prefix}/auth/register",
            json=json,
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    async def test_wrong_email(
        self,
        ac: AsyncClient,
        api_prefix: str,
    ):
        json = {"email": "king.arthur", "password": "guinevere"}
        response = await ac.post(
            f"{api_prefix}/auth/register",
            json=json,
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    @pytest.mark.parametrize("email", ["lancelot@camelot.bt", "king.arthur@camelot.bt"])
    async def test_valid_body(
        self,
        email,
        ac: AsyncClient,
        api_prefix: str,
    ):
        json = {"email": email, "password": "guinevere"}
        response = await ac.post(
            f"{api_prefix}/auth/register",
            json=json,
        )
        assert response.status_code == status.HTTP_201_CREATED

        data = cast(dict[str, Any], response.json())
        assert "hashed_password" not in data
        assert "password" not in data
        assert data["id"] is not None

    @pytest.mark.parametrize("email", ["lancelot@camelot.bt", "king.arthur@camelot.bt"])
    async def test_existing_user(
        self,
        email,
        ac: AsyncClient,
        api_prefix: str,
    ):
        json = {"email": email, "password": "guinevere"}
        response = await ac.post(
            f"{api_prefix}/auth/register",
            json=json,
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        data = cast(dict[str, Any], response.json())
        assert data["detail"] == ErrorCode.REGISTER_USER_ALREADY_EXISTS

    @pytest.mark.parametrize("is_superuser", [True, False])
    async def test_valid_body_is_superuser(
        self,
        is_superuser,
        ac: AsyncClient,
        api_prefix: str,
    ):
        json = {
            "email": "lancelot@camelot.bt",
            "password": "guinevere",
            "is_superuser": is_superuser,
        }
        response = await ac.post(f"{api_prefix}/auth/register", json=json)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.parametrize("is_active", [True, False])
    async def test_valid_body_is_active(
        self,
        is_active,
        ac: AsyncClient,
        api_prefix: str,
    ):
        json = {
            "email": "lancelot@camelot.bt",
            "password": "guinevere",
            "is_active": is_active,
        }
        response = await ac.post(f"{api_prefix}/auth/register", json=json)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
