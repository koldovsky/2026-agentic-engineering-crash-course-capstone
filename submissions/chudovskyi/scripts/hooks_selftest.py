#!/usr/bin/env python3
"""Self-test for the Claude Code hooks in .claude/hooks/ - no agent needed.

Pipes realistic hook payloads through both scripts against a TEMP project dir and checks:
  1. protect_env.py blocks Read/Edit/Write of .env, .env.prod, sets/secrets/* (exit 2)
     and allows .env.template, .env.dev, .env.test and normal files
  2. log_action.py appends one JSON line per event (PreToolUse = proposed, Post* = executed) with repo-relative paths
  3. a PreToolUse line without a Post line for the same id is reported as "proposed but not executed"
Usage: python scripts/hooks_selftest.py   (run from the repo root)
"""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

here = Path.cwd()
hooks = here / ".claude" / "hooks"
tmp = Path(tempfile.mkdtemp(prefix="hooks-selftest-"))
env = {**os.environ, "CLAUDE_PROJECT_DIR": str(tmp)}
failed = 0


def run(script: Path, payload: dict) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(script)], input=json.dumps(payload), env=env, capture_output=True, text=True, encoding="utf-8"
    )


def check(name: str, ok: bool, extra: str = "") -> None:
    global failed
    print(f"{'PASS' if ok else 'FAIL'}  {name}{'  ' + extra if extra else ''}")
    if not ok:
        failed += 1


base = {"session_id": "selftest-0001", "cwd": str(tmp), "permission_mode": "default"}

# 1. guard
cases = [
    ("Edit", tmp / ".env", 2),
    ("Write", tmp / "app" / "config" / "envs" / ".env.prod", 2),
    ("Read", str(tmp) + "\\.env.local", 2),
    ("Read", tmp / "sets" / "secrets" / "TOKEN.txt", 2),
    ("Read", tmp / "app" / "config" / "envs" / ".env.template", 0),
    ("Edit", tmp / "app" / "config" / "envs" / ".env.dev", 0),
    ("Read", tmp / "app" / "config" / "envs" / ".env.test", 0),
    ("Read", tmp / "app" / "config" / "settings.py", 0),
]
for tool, file, expect in cases:
    r = run(hooks / "protect_env.py", {**base, "hook_event_name": "PreToolUse", "tool_name": tool, "tool_input": {"file_path": str(file)}})
    name = str(file).replace("\\", "/").split("/")[-1]
    check(f"protect_env {tool} {name} -> exit {expect}", r.returncode == expect, r.stderr.strip() if r.returncode == 2 else "")

# 2. logger: proposed+executed Bash, proposed+executed Edit, proposed+failed Bash, proposed-only Edit (blocked)
edit_path = str(tmp / "app" / "main.py")
events = [
    {**base, "hook_event_name": "PreToolUse", "tool_use_id": "t1", "tool_name": "Bash", "tool_input": {"command": "uv run pytest"}},
    {**base, "hook_event_name": "PostToolUse", "tool_use_id": "t1", "tool_name": "Bash", "tool_input": {"command": "uv run pytest"}, "tool_response": {"stdout": "ok"}, "duration_ms": 4200},
    {**base, "hook_event_name": "PreToolUse", "tool_use_id": "t2", "tool_name": "Edit", "tool_input": {"file_path": edit_path}},
    {**base, "hook_event_name": "PostToolUse", "tool_use_id": "t2", "tool_name": "Edit", "tool_input": {"file_path": edit_path}, "duration_ms": 15},
    {**base, "hook_event_name": "PreToolUse", "tool_use_id": "t3", "tool_name": "Bash", "tool_input": {"command": "uv run ruff check app"}},
    {**base, "hook_event_name": "PostToolUseFailure", "tool_use_id": "t3", "tool_name": "Bash", "tool_input": {"command": "uv run ruff check app"}, "error": "Exit code 2\nE501 line too long", "duration_ms": 900},
    {**base, "hook_event_name": "PreToolUse", "tool_use_id": "t4", "tool_name": "Edit", "tool_input": {"file_path": str(tmp / ".env")}},
]
for e in events:
    r = run(hooks / "log_action.py", e)
    check(f"log_action {e['hook_event_name']} {e['tool_name']} exits 0 silently", r.returncode == 0 and r.stdout == "")

log_file = tmp / ".agent-log" / "actions.jsonl"
lines = [json.loads(line) for line in log_file.read_text(encoding="utf-8").strip().split("\n")]
check("log has 7 lines", len(lines) == 7)
check("PreToolUse line has no exit field", lines[0]["event"] == "PreToolUse" and "exit" not in lines[0] and lines[0]["id"] == "t1")
check("PostToolUse Bash keeps cmd and exit 0", lines[1]["cmd"] == "uv run pytest" and lines[1]["exit"] == 0 and lines[1]["ms"] == 4200)
check("Edit line stores repo-relative path", lines[3]["path"] == "app/main.py", str(lines[3].get("path")))
check("failure line carries exit code 2", lines[5]["exit"] == 2)

# 3. summary pairs Pre/Post by id
executed_ids = {line["id"] for line in lines if line["event"] != "PreToolUse"}
proposed_only = [line for line in lines if line["event"] == "PreToolUse" and line["id"] not in executed_ids]
check("exactly one proposed-but-not-executed action (.env edit)", len(proposed_only) == 1 and proposed_only[0]["path"] == ".env")
summary = subprocess.run(
    [sys.executable, str(here / "scripts" / "agent_log_summary.py"), str(log_file)], capture_output=True, text=True, encoding="utf-8"
)
check("agent_log_summary reports 1 proposed but not executed", summary.returncode == 0 and "1 proposed but not executed" in summary.stdout)

import shutil  # noqa: E402

shutil.rmtree(tmp, ignore_errors=True)
print(f"\n{failed} check(s) failed" if failed else "\nall hook checks passed")
sys.exit(1 if failed else 0)
