import json
import asyncio
from datetime import datetime

from sqlalchemy import text, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from config import BASE_DIR
from config import db_helper
from models import (
    Tag,
    Category,
    User,
    Prompt,
    PromptTag,
)


def open_mock_json(model: str):
    with open(BASE_DIR / f"fakedata/mock_{model}.json") as f:
        return json.load(f)


async def seed_fake_data(session: AsyncSession):
    tables = [
        "tags",
        "categories",
        "users",
        "prompts",
        "prompt_tag_association",
    ]

    result = await session.execute(select(func.count()).select_from(User))
    count = result.scalar()
    if count > 0:
        print("***Note: The database is already containing data.")
        return

    json_tags = open_mock_json(tables[0])
    json_categories = open_mock_json("categories")
    json_users = open_mock_json("users")
    json_prompts = open_mock_json("prompts")
    for inst in json_prompts:  # from str format to date format
        inst["created_at"] = datetime.fromisoformat(inst["created_at"])
        inst["updated_at"] = datetime.fromisoformat(inst["updated_at"])
    json_prompts_tags = open_mock_json("prompt_tag_association")

    fakedata_tags = [Tag(**item) for item in json_tags]
    fakedata_categories = [Category(**item) for item in json_categories]
    fakedata_users = [User(**item) for item in json_users]
    fakedata_prompts = [Prompt(**item) for item in json_prompts]
    fakedata_prompts_tags = [PromptTag(**item) for item in json_prompts_tags]

    session.add_all(fakedata_tags)
    session.add_all(fakedata_categories)
    session.add_all(fakedata_users)
    session.add_all(fakedata_prompts)
    await session.flush()
    # await session.commit()

    session.add_all(fakedata_prompts_tags)
    # await session.flush()
    await session.commit()

    for table in tables:
        await session.execute(
            text(
                f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
                f"max(id)) FROM {table};"
            )
        )
    await session.commit()


async def main():
    async with db_helper.session_factory() as session:
        await seed_fake_data(session)


if __name__ == "__main__":
    asyncio.run(main())
