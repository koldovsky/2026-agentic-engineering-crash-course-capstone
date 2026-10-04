import time

STARTED_AT = time.monotonic()


def build_info(
    service_name: str,
    version: str,
    api_version: str,
    started_at: float,
    now: float,
) -> dict:
    """Info payload: status, service name, versions and uptime in seconds."""

    if not service_name or not service_name.strip():
        raise ValueError("service_name must not be empty")

    return {
        "status": "ok",
        "service": service_name,
        "version": version,
        "api_version": api_version,
        "uptime_seconds": now - started_at,
    }
