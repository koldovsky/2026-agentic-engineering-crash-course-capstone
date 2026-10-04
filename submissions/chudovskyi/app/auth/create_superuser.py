import contextlib

from config import settings
from config import db_helper
from models import User
from schemas import UserCreate
from services import get_users_db

from .user_manager import UserManager
from .user_manager import get_user_manager

get_users_db_context = contextlib.asynccontextmanager(get_users_db)
get_user_manager_context = contextlib.asynccontextmanager(get_user_manager)


async def create_user(
    user_manager: UserManager,
    user_create: UserCreate,
) -> User:
    user = await user_manager.create(
        user_create=user_create,
        safe=False,
    )
    return user


async def create_superuser_if_not_exists(
    email: str = settings.superuser.default_email,
    password: str = settings.superuser.default_password,
    is_active: bool = settings.superuser.default_is_active,
    is_superuser: bool = settings.superuser.default_is_superuser,
    is_verified: bool = settings.superuser.default_is_verified,
):
    async with db_helper.session_factory() as session:
        async with get_users_db_context(session) as users_db:
            existing_user = await users_db.get_by_email(email)
            if existing_user:
                if existing_user.is_superuser:
                    print(f"***Note: Superuser {email} already exists")
                    return existing_user
                else:
                    print(f"***Note: User {email} exists but is not superuser")
                    return existing_user

            async with get_user_manager_context(users_db) as user_manager:
                user_create = UserCreate(
                    email=email,
                    password=password,
                    is_active=is_active,
                    is_superuser=is_superuser,
                    is_verified=is_verified,
                )
                return await create_user(
                    user_manager=user_manager,
                    user_create=user_create,
                )
