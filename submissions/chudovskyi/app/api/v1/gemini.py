from typing import Annotated

from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.ext.asyncio import AsyncSession

from config import db_helper
from schemas import GeminiPromptSchema
from models import User
from services import (
    get_answer_from_gemini,
    add_prompt_to_db,
)

from .dependencies import current_active_user

router = APIRouter(tags=["Gemini"])


@router.post("/request")
async def send_request(
    prompt: GeminiPromptSchema,
    user: Annotated[
        "User",
        Depends(current_active_user),
    ],
    session: Annotated[
        "AsyncSession",
        Depends(db_helper.session_getter),
    ],
):
    pmpt_response = await get_answer_from_gemini(
        pmpt_request=prompt.pmpt_request,
    )

    new_prompt = await add_prompt_to_db(
        session=session,
        prompt=prompt,
        pmpt_response=pmpt_response,
        user_id=user.id,
    )

    return new_prompt
