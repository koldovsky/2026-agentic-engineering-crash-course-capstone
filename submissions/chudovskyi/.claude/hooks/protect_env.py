#!/usr/bin/env python3
"""Claude Code PreToolUse hook (matcher: Read|Edit|Write|NotebookEdit).

Blocks reading or writing secrets: `.env`, `.env.prod`, `.env.local`, ... and everything under `sets/` (env scripts and Docker secrets).
Open on purpose: `.env.template` / `.env.example` (templates) and `.env.test` (demo values
committed in app/config/envs/, needed to run and test the project). `.env.dev` is blocked, same as in
the permissions.deny rules in settings.json.
Exit code 2 = the tool call is BLOCKED and stderr is fed back to the agent as the reason.
PreToolUse hooks run BEFORE the permission check, in EVERY permission mode (even bypassPermissions):
hooks enforce, CLAUDE.md only advises. The permissions.deny rules in settings.json are the second line of defence.
"""

import json
import re
import sys

ALLOWED = {".env.template", ".env.example", ".env.test"}


def main() -> int:
    try:
        sys.stdin.reconfigure(encoding="utf-8")
        ev = json.loads(sys.stdin.read() or "{}")
    except Exception:
        return 0

    tool_input = ev.get("tool_input") or {}
    p = str(tool_input.get("file_path") or tool_input.get("notebook_path") or "").replace("\\", "/")
    base = p.rsplit("/", 1)[-1]

    is_env = re.fullmatch(r"\.env(\..+)?", base) is not None and base not in ALLOWED
    is_secret_dir = "/sets/" in f"/{p.lstrip('/')}"

    if is_env or is_secret_dir:
        verb = "read" if ev.get("tool_name") == "Read" else "edit"
        sys.stderr.write(
            f"Blocked by hook: {p} is a secrets file; the agent must not {verb} it. "
            "Use app/config/envs/.env.template instead and ask the user to update the real file manually.\n"
        )
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
