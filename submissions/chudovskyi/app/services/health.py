from datetime import datetime


def build_health(
    service_name: str,
    version: str,
    started_at: datetime,
    now: datetime,
) -> dict:
    """Health payload: status, service name, version and uptime in whole seconds."""

    if not service_name or not service_name.strip():
        raise ValueError("service_name must not be empty")

    uptime = (now - started_at).total_seconds()

    return {
        "status": "ok",
        "service": service_name,
        "version": version,
        "uptime_seconds": max(int(uptime), 0),
    }
