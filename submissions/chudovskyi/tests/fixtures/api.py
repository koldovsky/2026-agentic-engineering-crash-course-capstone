import pytest

from app.config import settings


@pytest.fixture
def api_prefix():
    """/api/v1"""
    parts = (settings.api.prefix, settings.api.v1.prefix)
    path = "".join(parts)
    return path
