import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User
from app.services import get_users_db


@pytest.mark.asyncio
class TestUserDatabase:

    async def test_get_users_db_returns_user_db(self, session: AsyncSession):
        gen = get_users_db(session)
        user_db = await gen.__anext__()  # отримуємо перший yield

        assert hasattr(user_db, "get_by_email")
        assert callable(user_db.get_by_email)
        assert isinstance(session, AsyncSession)

    async def test_user_bob_exists_in_db(self, session: AsyncSession):
        query = select(User).filter_by(email="sam@example.com")
        result = await session.execute(query)
        user = result.scalar_one_or_none()

        assert user is not None
        # assert user.id == 1
        assert user.email == "sam@example.com"
        assert user.hashed_password.startswith("$argon2id$")
        assert user.is_active is True
        assert user.is_superuser is False
        assert user.is_verified is True

    async def test_create_user_success(self, session: AsyncSession):
        """Перевірка успішного створення користувача"""
        new_user = User(
            email="new_user@example.com",
            hashed_password="fake_hashed_password",
            is_active=True,
            is_superuser=False,
            is_verified=False,
        )
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)

        assert new_user.id is not None
        assert new_user.email == "new_user@example.com"

        # Перевірка через новий запит
        query = select(User).filter_by(email="new_user@example.com")
        result = await session.execute(query)
        user_in_db = result.scalar_one()
        assert user_in_db.id == new_user.id

    async def test_duplicate_email_raises_error(self, session: AsyncSession):
        """Перевірка унікальності email (Constraint)"""
        # Сем вже є в базі згідно з вашим попереднім тестом
        duplicate_user = User(
            email="sam@example.com",
            hashed_password="another_password",
            is_active=True,
        )
        session.add(duplicate_user)

        with pytest.raises(IntegrityError):
            await session.commit()

        await session.rollback()

    async def test_update_user_permissions(self, session: AsyncSession):
        """Тест зміни прав користувача (наприклад, надання прав суперюзера)"""
        query = select(User).filter_by(email="sam@example.com")
        result = await session.execute(query)
        user = result.scalar_one()

        user.is_superuser = True
        await session.commit()
        await session.refresh(user)

        assert user.is_superuser is True

    async def test_delete_user(self, session: AsyncSession):
        """Тест видалення користувача та перевірка його відсутності"""
        # Створимо тимчасового юзера для видалення
        temp_user = User(email="delete_me@example.com", hashed_password="pw")
        session.add(temp_user)
        await session.commit()

        # Видаляємо
        await session.delete(temp_user)
        await session.commit()

        query = select(User).filter_by(email="delete_me@example.com")
        result = await session.execute(query)
        assert result.scalar_one_or_none() is None

    async def test_user_password_hash_storage(self, session: AsyncSession):
        """Перевірка, що пароль зберігається коректно (не у відкритому вигляді)"""
        query = select(User).filter_by(email="sam@example.com")
        result = await session.execute(query)
        user = result.scalar_one()

        assert (
            user.hashed_password != "sampass"
        )  # припускаючи, що sampass - це сирий пароль
        assert len(user.hashed_password) > 20  # Argon2 хеші зазвичай довгі
