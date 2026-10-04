#!/usr/bin/env python3
"""Claude Code hook for PreToolUse, PostToolUse and PostToolUseFailure.

Appends ONE JSON line per event to .agent-log/actions.jsonl:
  PreToolUse         -> {ts, event, id, session, mode, tool, path | cmd | pattern | url}   = "agent proposed"
  PostToolUse        -> {..., exit: 0, ms}                                                  = "agent did"
  PostToolUseFailure -> {..., exit: N | "error" | "interrupted", ms}                        = "agent tried, it failed"
A PreToolUse line without a matching Post line (same id) = proposed but never executed (blocked or denied).
The hook never blocks the agent: any error -> exit 0 silently.
Standard library only, so it runs with any system `python` (no uv environment needed).
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


def main() -> int:
    try:
        sys.stdin.reconfigure(encoding="utf-8")
        ev = json.loads(sys.stdin.read() or "{}")
    except Exception:
        return 0

    root = os.environ.get("CLAUDE_PROJECT_DIR") or ev.get("cwd") or os.getcwd()
    event = ev.get("hook_event_name", "unknown")
    ti = ev.get("tool_input") or {}
    tool = ev.get("tool_name", "unknown")

    def norm(p: str) -> str:
        """Normalize Windows (`D:\\x`), POSIX (`/d/x`, Git Bash) and mixed paths."""
        p = str(p).replace("\\", "/")
        p = re.sub(r"^/([a-zA-Z])/", lambda m: f"{m.group(1).upper()}:/", p)
        p = re.sub(r"^([a-zA-Z]):/", lambda m: f"{m.group(1).upper()}:/", p)
        return p.rstrip("/")

    roots = [norm(r) + "/" for r in (root, ev.get("cwd")) if r]

    def rel(p):
        if not isinstance(p, str):
            return None
        n = norm(p)
        for r in roots:
            if n.startswith(r):
                return n[len(r) :]
        return n

    now = datetime.now(timezone.utc)
    entry = {
        "ts": now.strftime("%Y-%m-%dT%H:%M:%S.") + f"{now.microsecond // 1000:03d}Z",
        "event": event,
        "id": ev.get("tool_use_id"),
        "session": str(ev.get("session_id") or "")[:8],
        "mode": ev.get("permission_mode"),
        "tool": tool,
    }
    if ti.get("file_path"):
        entry["path"] = rel(ti["file_path"])
    if ti.get("notebook_path"):
        entry["path"] = rel(ti["notebook_path"])
    if ti.get("command"):
        entry["cmd"] = str(ti["command"])[:200]
    if ti.get("pattern"):
        entry["pattern"] = ti["pattern"]
    if ti.get("url"):
        entry["url"] = ti["url"]

    if event == "PostToolUse":
        entry["exit"] = 0
    elif event == "PostToolUseFailure":
        m = re.match(r"^Exit code (\d+)", ev.get("error") or "")
        entry["exit"] = int(m.group(1)) if m else ("interrupted" if ev.get("is_interrupt") else "error")
    if isinstance(ev.get("duration_ms"), (int, float)):
        entry["ms"] = ev["duration_ms"]

    try:
        log_dir = Path(root) / ".agent-log"
        log_dir.mkdir(parents=True, exist_ok=True)
        with open(log_dir / "actions.jsonl", "a", encoding="utf-8", newline="\n") as f:
            f.write(json.dumps(entry, ensure_ascii=False, separators=(",", ":")) + "\n")
    except Exception:
        pass  # logging must never fail the session
    return 0


if __name__ == "__main__":
    sys.exit(main())
