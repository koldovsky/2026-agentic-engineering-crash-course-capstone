from pydantic import BaseModel


class ProjectConfig(BaseModel):
    title: str = "Prompt Manager"
    version: str = "1.0.0"
    description: str = "Async FastAPI with SQLAlchemy 2.0 Pet Project"
