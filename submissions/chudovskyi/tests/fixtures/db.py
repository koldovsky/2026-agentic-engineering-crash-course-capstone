import pytest_asyncio

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.config import DatabaseHelper
from app.models import Base
from tests.fakedata.seed_db import seed_test_data


@pytest_asyncio.fixture(
    loop_scope="session",
    scope="session",
)
async def test_db_helper():
    helper = DatabaseHelper(
        url=settings.db.async_url,
        echo=settings.db.sqla.echo,
        echo_pool=settings.db.sqla.echo_pool,
        pool_size=settings.db.sqla.pool_size,
        max_overflow=settings.db.sqla.max_overflow,
    )
    print(settings.db.async_url)
    yield helper
    await helper.dispose()


@pytest_asyncio.fixture(
    loop_scope="session",
    scope="function",
)
async def session(test_db_helper) -> AsyncGenerator[AsyncSession, None]:
    async with test_db_helper.session_factory() as session:
        yield session


@pytest_asyncio.fixture(
    loop_scope="session",
    scope="session",
    autouse=True,
)
async def setup_db(test_db_helper):
    async with test_db_helper.engine.connect() as conn:
        async with conn.begin():
            print(f"DEBUG2: Створюю таблиці: {Base.metadata.tables.keys()}")
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)

    async with test_db_helper.session_factory() as session:
        await seed_test_data(session)

    yield

    async with test_db_helper.engine.connect() as conn:
        async with conn.begin():
            print(f"DEBUG2: Дропаю таблиці: {Base.metadata.tables.keys()}")
            await conn.run_sync(Base.metadata.drop_all)
