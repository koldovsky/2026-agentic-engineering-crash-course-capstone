from google import genai


from sqlalchemy.ext.asyncio import AsyncSession

from config import settings

from models import Prompt
from schemas import GeminiPromptSchema


def get_client():
    """The client gets the API key from the environment variable `GEMINI_API_KEY`."""

    return genai.Client(
        api_key=settings.gemini.api_key,
    )


async def get_answer_from_gemini(pmpt_request: str) -> str:
    """The answer from the GEMINI API is returned as a string."""

    client = get_client()
    response = client.models.generate_content(
        model=settings.gemini.model,
        contents=pmpt_request,
    )
    return response.text


async def add_prompt_to_db(
    session: AsyncSession,
    prompt: GeminiPromptSchema,
    pmpt_response: str,
    user_id: int,
):
    new_prompt = Prompt(
        type_llm="GEMINI",
        title=prompt.title,
        pmpt_request=prompt.pmpt_request,
        pmpt_response=pmpt_response,
        category_id=prompt.category_id,
        user_id=user_id,
    )

    session.add(new_prompt)
    await session.commit()
    await session.refresh(new_prompt)

    return new_prompt
