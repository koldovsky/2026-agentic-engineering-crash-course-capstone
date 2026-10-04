import pytest

from datetime import datetime, timedelta, timezone

from app.services.health import build_health


STARTED_AT = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)


class TestServiceHealth:
    def test_build_health_with_valid_input_returns_ok_status(self):
        health = build_health("Prompt Manager", "1.0.0", STARTED_AT, STARTED_AT)

        assert health["status"] == "ok"
        assert health["service"] == "Prompt Manager"
        assert health["version"] == "1.0.0"

    def test_build_health_after_90_seconds_returns_uptime_90(self):
        now = STARTED_AT + timedelta(seconds=90)

        health = build_health("Prompt Manager", "1.0.0", STARTED_AT, now)

        assert health["uptime_seconds"] == 90

    def test_build_health_with_now_before_start_returns_zero_uptime(self):
        now = STARTED_AT - timedelta(seconds=5)

        health = build_health("Prompt Manager", "1.0.0", STARTED_AT, now)

        assert health["uptime_seconds"] == 0

    def test_build_health_with_empty_name_raises_value_error(self):
        with pytest.raises(ValueError):
            build_health("", "1.0.0", STARTED_AT, STARTED_AT)

    def test_build_health_with_blank_name_raises_value_error(self):
        with pytest.raises(ValueError):
            build_health("   ", "1.0.0", STARTED_AT, STARTED_AT)
