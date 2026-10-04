import pytest
from unittest.mock import MagicMock, patch

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Prompt
from app.schemas import GeminiPromptSchema
from app.services import get_answer_from_gemini, add_prompt_to_db


@pytest.mark.asyncio
class TestServiceGemini:

    @patch("app.services.gemini.get_client")
    async def test_get_answer_from_gemini_success(self, mock_get_client):
        mock_response = MagicMock()
        mock_response.text = "This is a test answer from Gemini"

        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = mock_response
        mock_get_client.return_value = mock_client

        answer = await get_answer_from_gemini("Hi, Gemini!")

        assert answer == "This is a test answer from Gemini"
        mock_client.models.generate_content.assert_called_once()

    @patch("app.services.gemini.get_client")
    async def test_get_answer_from_gemini_empty_response(self, mock_get_client):
        mock_response = MagicMock()
        mock_response.text = ""

        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = mock_response
        mock_get_client.return_value = mock_client

        answer = await get_answer_from_gemini("Test request")
        assert answer == ""

    async def test_add_prompt_to_db_success(self, session: AsyncSession):
        user_id = 1
        prompt_data = GeminiPromptSchema(
            title="Test request",
            pmpt_request="How are you?",
            category_id=1,
        )
        fake_response = "Everything is great, I'm an artificial intelligence."

        new_prompt = await add_prompt_to_db(
            session=session,
            prompt=prompt_data,
            pmpt_response=fake_response,
            user_id=user_id,
        )

        assert new_prompt.id is not None
        assert new_prompt.title == "Test request"
        assert new_prompt.type_llm == "Gemini"

        result = await session.execute(select(Prompt).filter_by(id=new_prompt.id))
        db_prompt = result.scalar_one_or_none()

        assert db_prompt is not None
        assert db_prompt.pmpt_response == fake_response

    async def test_add_prompt_to_db_invalid_user(self, session: AsyncSession):
        invalid_user_id = 999999
        prompt_data = GeminiPromptSchema(
            title="Bad Request",
            pmpt_request="Help",
            category_id=1,
        )

        with pytest.raises(IntegrityError):
            await add_prompt_to_db(
                session=session,
                prompt=prompt_data,
                pmpt_response="Response",
                user_id=invalid_user_id,
            )

        await session.rollback()

    async def test_add_prompt_to_db_invalid_category(self, session: AsyncSession):
        prompt_data = GeminiPromptSchema(
            title="Bad Category",
            pmpt_request="Help",
            category_id=999,
        )

        with pytest.raises(IntegrityError):
            await add_prompt_to_db(
                session=session,
                prompt=prompt_data,
                pmpt_response="Response",
                user_id=1,
            )

        await session.rollback()
