import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
class TestPromptGemini:

    async def test_send_request_success(
        self,
        ac: AsyncClient,
        api_prefix: str,
        auth_headers,
    ):
        payload = {
            "title": "Тестовий заголовок",
            "pmpt_request": "Привіт, як справи?",
            "category_id": 1,
        }

        mock_gemini_response = "Все добре!"

        mock_db_result = {
            "id": 999,
            "title": payload["title"],
            "pmpt_request": payload["pmpt_request"],
            "pmpt_response": mock_gemini_response,
            "category_id": payload["category_id"],
            "user_id": 2,
        }

        with (
            patch(
                "api.v1.gemini.get_answer_from_gemini", new_callable=AsyncMock
            ) as mock_gemini,
            patch("api.v1.gemini.add_prompt_to_db", new_callable=AsyncMock) as mock_db,
        ):
            mock_gemini.return_value = mock_gemini_response
            mock_db.return_value = mock_db_result

            response = await ac.post(
                f"{api_prefix}/gemini/request",
                json=payload,
                headers=auth_headers,
            )

        if response.status_code != 200:
            print(f"DEBUG: {response.status_code} - {response.text}")

        assert response.status_code == 200
        data = response.json()
        assert data["pmpt_response"] == mock_gemini_response
        assert data["title"] == payload["title"]
