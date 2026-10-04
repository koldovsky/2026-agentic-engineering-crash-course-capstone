from typing import Annotated

from fastapi import APIRouter
from fastapi import Depends

from models import User
from schemas import UserRead
from .dependencies import (
    current_active_user,
    current_active_superuser,
)

router = APIRouter(tags=["Messages"])


@router.get("/")
def get_user_massages(
    user: Annotated[
        User,
        Depends(current_active_user),
    ],
):
    return {
        "user": UserRead.model_validate(user),
        "messages": ["m1", "m2", "m3"],
    }


@router.get("/secrets")
def get_superuser_massages(
    user: Annotated[
        User,
        Depends(current_active_superuser),
    ],
):
    return {
        "user": UserRead.model_validate(user),
        "messages": ["secret-m1", "secret-m2", "secret-m3"],
    }
