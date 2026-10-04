from fastapi import APIRouter

from auth import fastapi_users
from schemas import UserRead, UserUpdate

router = APIRouter(tags=["Users"])

# /me
# /{id}
router.include_router(
    router=fastapi_users.get_users_router(
        UserRead,
        UserUpdate,
    ),
)
