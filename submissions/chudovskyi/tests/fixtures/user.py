import pytest_asyncio
from httpx import AsyncClient


@pytest_asyncio.fixture(
    loop_scope="session",
    scope="function",
)
async def auth_headers(ac: AsyncClient, api_prefix: str):
    response = await ac.post(
        f"{api_prefix}/auth/login",
        data={
            "username": "bob@example.com",
            "password": "bobpass",
        },
    )

    if response.status_code != 200:
        print(f"\nLogin failed! Status: {response.status_code}")
        print(f"Response body: {response.text}")
        response.raise_for_status()

    data = response.json()
    token = data["access_token"]

    return {
        "Accept": "application/vnd.api+json",
        # "Content-Type": "application/vnd.api+json",
        "Authorization": f"Bearer {token}",
    }
