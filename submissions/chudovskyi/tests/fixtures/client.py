import pytest_asyncio

from fastapi import FastAPI
from typing import AsyncGenerator
from contextlib import asynccontextmanager
from httpx import AsyncClient, ASGITransport
from asgi_lifespan import LifespanManager

from app.config import db_helper
from app.server.server import create_app


@pytest_asyncio.fixture(
    loop_scope="function",
    scope="function",
)
async def ac(test_db_helper) -> AsyncGenerator[AsyncClient, None]:
    @asynccontextmanager
    async def test_lifespan(_app: FastAPI):
        yield

    _app = create_app(lifespan_karg=test_lifespan)
    _app.dependency_overrides[db_helper.session_getter] = test_db_helper.session_getter

    async with LifespanManager(_app) as manager:
        transport = ASGITransport(app=_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # print("\n--- Клієнт створений, lifespan має запуститися ---")
            yield client

    _app.dependency_overrides.clear()
