import pytest
from httpx import AsyncClient
from datetime import datetime, timezone


@pytest.mark.asyncio
class TestPromptBuilder:

    async def test_create_prompt(
        self,
        ac: AsyncClient,
        api_prefix: str,
        auth_headers,
    ):
        payload = {
            "data": {
                "type": "prompt",
                "attributes": {
                    "type_llm": "GPT-4",
                    "title": "My Prompt Create Test",
                    "pmpt_request": "How to create prompt?",
                    "pmpt_response": "Very very easy...",
                    "category_id": 1,
                    "user_id": 2,
                },
            }
        }

        response = await ac.post(
            f"{api_prefix}/prompts/",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["data"]["attributes"]["title"] == "My Prompt Create Test"
        assert data["data"]["attributes"]["pmpt_request"] == "How to create prompt?"
        assert data["data"]["attributes"]["pmpt_response"] == "Very very easy..."
        assert "id" in data["data"]

    async def test_get_prompts_list(
        self,
        ac: AsyncClient,
        api_prefix: str,
        auth_headers,
    ):
        response = await ac.get(
            f"{api_prefix}/prompts/",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)

    async def test_update_prompt(
        self,
        ac: AsyncClient,
        api_prefix: str,
        auth_headers,
    ):
        # Спочатку створимо об'єкт, щоб отримати реальний ID
        create_payload = {
            "data": {
                "type": "prompt",
                "attributes": {
                    "type_llm": "GPT-4",
                    "title": "Initial Title",
                    "pmpt_request": "Initial request",
                    "pmpt_response": "Initial response",
                    "category_id": 2,
                    "user_id": 2,
                },
            }
        }
        create_resp = await ac.post(
            f"{api_prefix}/prompts/",
            json=create_payload,
            headers=auth_headers,
        )
        prompt_id = create_resp.json()["data"]["id"]

        # Тепер оновлюємо його
        now_timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        update_payload = {
            "data": {
                "id": str(prompt_id),
                "type": "prompt",
                "attributes": {
                    "type_llm": "GPT-4",
                    "title": "Updated Title",
                    "pmpt_request": "Updated request",
                    "pmpt_response": "Initial response",
                    "updated_at": now_timestamp,
                    # "updated_at": "2026-05-02T19:58:10.243Z",
                    "category_id": 2,
                    "user_id": 2,
                },
            }
        }

        response = await ac.patch(
            f"{api_prefix}/prompts/{prompt_id}/",
            json=update_payload,
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["attributes"]["title"] == "Updated Title"
        assert data["data"]["attributes"]["pmpt_request"] == "Updated request"

    async def test_delete_prompt_forbidden_for_regular_user(
        self,
        ac: AsyncClient,
        api_prefix: str,
        auth_headers,
    ):
        create_payload = {
            "data": {
                "type": "prompt",
                "attributes": {
                    "type_llm": "GPT-4",
                    "title": "Prompt to stay",
                    "pmpt_request": "I will not be deleted",
                    "pmpt_response": "...",
                    "category_id": 3,
                    "user_id": 2,
                },
            }
        }
        create_resp = await ac.post(
            f"{api_prefix}/prompts/",
            json=create_payload,
            headers=auth_headers,
        )
        prompt_id = create_resp.json()["data"]["id"]

        # 2. Спробуємо видалити (очікуємо помилку 403, бо DELETE вимагає SuperuserViewsDependencies)
        response = await ac.delete(
            f"{api_prefix}/prompts/{prompt_id}/",
            headers=auth_headers,
        )

        # Перевіряємо, що доступ заборонено
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"

        # 3. Додатково перевіримо, що промпт все ще існує
        check_resp = await ac.get(
            f"{api_prefix}/prompts/{prompt_id}/",
            headers=auth_headers,
        )
        assert check_resp.status_code == 200
