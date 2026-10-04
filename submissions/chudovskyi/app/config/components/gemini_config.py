from pydantic import BaseModel


class GeminiConfig(BaseModel):
    api_key: str
    model: str
