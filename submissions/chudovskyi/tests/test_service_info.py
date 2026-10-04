import pytest

from app.services.info import build_info


class TestServiceInfo:
    def test_build_info_with_valid_input_returns_ok_status(self):
        info = build_info("Prompt Manager", "1.0.0", "v1", 100.0, 100.0)

        assert info["status"] == "ok"
        assert info["service"] == "Prompt Manager"
        assert info["version"] == "1.0.0"
        assert info["api_version"] == "v1"

    def test_build_info_after_90_5_seconds_returns_uptime_90_5(self):
        info = build_info("Prompt Manager", "1.0.0", "v1", 100.0, 190.5)

        assert info["uptime_seconds"] == 90.5

    def test_build_info_returns_exactly_expected_keys(self):
        info = build_info("Prompt Manager", "1.0.0", "v1", 100.0, 190.5)

        assert set(info) == {
            "status",
            "service",
            "version",
            "api_version",
            "uptime_seconds",
        }

    def test_build_info_with_empty_name_raises_value_error(self):
        with pytest.raises(ValueError):
            build_info("", "1.0.0", "v1", 100.0, 190.5)

    def test_build_info_with_blank_name_raises_value_error(self):
        with pytest.raises(ValueError):
            build_info("   ", "1.0.0", "v1", 100.0, 190.5)
