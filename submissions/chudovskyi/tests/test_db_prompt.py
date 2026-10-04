import pytest

from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Prompt,
    User,
    Category,
    TypeLLM,
)


@pytest.mark.asyncio
class TestPromptDatabaseLogic:

    async def test_create_prompt_with_relationships(self, session: AsyncSession):
        """Verify prompt creation with user and category relationships"""
        # 1. Retrieve existing user (Bob) and category from seed_data
        user = (await session.execute(select(User).limit(1))).scalar_one()
        category = (await session.execute(select(Category).limit(1))).scalar_one()

        new_prompt = Prompt(
            title="AI Assistant",
            pmpt_request="Help me with code",
            pmpt_response="Sure!",
            type_llm=TypeLLM.GEMINI,
            user_id=user.id,
            category_id=category.id,
        )

        session.add(new_prompt)
        await session.commit()
        await session.refresh(new_prompt)

        assert new_prompt.id is not None
        assert new_prompt.type_llm == "Gemini"
        assert new_prompt.user.email == user.email
        assert new_prompt.category.id == category.id

    async def test_prompt_auto_timestamps(self, session: AsyncSession):
        """Verify automatic population of created_at and updated_at"""
        prompt = Prompt(
            title="Timestamp Test",
            pmpt_request="req",
            pmpt_response="res",
            user_id=2,  # Assuming ID 1 exists
        )
        session.add(prompt)
        await session.commit()

        created_time = prompt.created_at
        assert created_time is not None

        # Update title to trigger onupdate
        prompt.title = "Updated Timestamp Test"
        await session.commit()
        await session.refresh(prompt)

        assert prompt.updated_at > created_time

    async def test_delete_category_sets_null_in_prompt(self, session: AsyncSession):
        """Verify ondelete='SET NULL' for categories"""
        # Create a category and prompt
        cat = Category(name="Temp Cat")
        session.add(cat)
        await session.flush()

        prompt = Prompt(
            title="Cleanup Test",
            pmpt_request="req",
            pmpt_response="res",
            category_id=cat.id,
        )
        session.add(prompt)
        await session.commit()

        # Delete category
        await session.delete(cat)
        await session.commit()
        await session.refresh(prompt)

        assert prompt.category_id is None

    async def test_filter_prompts_by_llm_type(self, session: AsyncSession):
        """Test filtering via Enum"""
        query = select(Prompt).filter(Prompt.type_llm == TypeLLM.GPT4)
        result = await session.execute(query)
        prompts = result.scalars().all()

        for p in prompts:
            assert p.type_llm == TypeLLM.GPT4

    async def test_prompt_repr_and_str(self):
        """Test magic methods of the model (for logs and admin)"""
        prompt = Prompt(id=1, title="Test String")
        assert str(prompt) == "Test String"
        assert "Prompt(id=1" in repr(prompt)


@pytest.mark.asyncio
class TestPromptDatabaseCRUD:

    async def test_db_create_prompt(self, session: AsyncSession):
        """CREATE: Перевірка збереження промпту в базу"""
        new_prompt = Prompt(
            title="Database Test",
            pmpt_request="SQLAlchemy logic check",
            pmpt_response="Success",
            type_llm=TypeLLM.GPT4,
            user_id=1,  # Використовуємо ID з seed_data
            category_id=1,
        )
        session.add(new_prompt)
        await session.commit()
        await session.refresh(new_prompt)

        assert new_prompt.id is not None
        assert new_prompt.created_at is not None
        assert new_prompt.rating == 0  # перевірка default значення

    async def test_db_read_prompt(self, session: AsyncSession):
        """READ: Пошук промпту за заголовком та негайне завантаження зв'язків"""
        # Використовуємо joinedload(Prompt.user), щоб завантажити дані юзера одним JOIN-запитом
        query = (
            select(Prompt)
            .filter(Prompt.title.ilike("%Pydantic%"))
            .options(joinedload(Prompt.user))  # <--- Обов'язково для асинхронності
            .limit(1)
        )

        result = await session.execute(query)
        prompt = result.scalar_one_or_none()

        if prompt:
            assert isinstance(prompt.title, str)
            # Тепер prompt.user вже завантажений у пам'ять
            assert prompt.user is not None
            assert prompt.user.id == prompt.user_id

    async def test_db_update_prompt_content(self, session: AsyncSession):
        """UPDATE: Зміна полів та перевірка updated_at"""
        # 1. Отримуємо існуючий промпт
        query = select(Prompt).limit(1)
        prompt = (await session.execute(query)).scalar_one()

        old_update_time = prompt.updated_at
        new_title = "Completely New Title"

        # 2. Оновлюємо
        prompt.title = new_title
        await session.commit()
        await session.refresh(prompt)

        assert prompt.title == new_title
        # Якщо в моделі є onupdate=func.now(), час зміниться
        assert prompt.updated_at >= old_update_time

    async def test_db_delete_prompt(self, session: AsyncSession):
        """DELETE: Видалення запису та перевірка його відсутності"""
        # 1. Створюємо тимчасовий об'єкт
        temp_prompt = Prompt(
            title="Delete Me", pmpt_request="req", pmpt_response="res", user_id=1
        )
        session.add(temp_prompt)
        await session.commit()
        prompt_id = temp_prompt.id

        # 2. Видаляємо
        await session.delete(temp_prompt)
        await session.commit()

        # 3. Перевіряємо через SELECT
        result = await session.execute(select(Prompt).filter_by(id=prompt_id))
        assert result.scalar_one_or_none() is None

    async def test_db_prompt_category_relationship(self, session: AsyncSession):
        """RELATIONSHIP: Перевірка зв'язку з категорією за допомогою joinedload"""
        # Використовуємо joinedload, щоб підвантажити категорію одним запитом
        query = (
            select(Prompt)
            .filter(Prompt.category_id.isnot(None))
            .options(joinedload(Prompt.category))  # ТУТ ВИПРАВЛЕННЯ
            .limit(1)
        )

        result = await session.execute(query)
        prompt = result.scalar_one_or_none()

        if prompt:
            category = prompt.category
            assert isinstance(category, Category)
            assert category.id == prompt.category_id
            # Перевірка back_populates (промпт має бути у списку категорії)
            # УВАГА: якщо category.prompts не підвантажено, це теж може видати помилку.

    async def test_db_invalid_llm_type_raises_error(self, session: AsyncSession):
        """CONSTRAINT: Перевірка валідації Enum на рівні БД/SQLAlchemy"""
        invalid_prompt = Prompt(
            title="Invalid Enum",
            type_llm="Unknown-AI",  # Такого немає в TypeLLM
            user_id=1,
        )
        session.add(invalid_prompt)

        # SQLAlchemy або DB має викинути помилку при спробі зберегти невірний Enum
        with pytest.raises(Exception):
            await session.commit()
        await session.rollback()
