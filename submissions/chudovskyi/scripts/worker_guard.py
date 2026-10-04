#!/usr/bin/env python3
"""PreToolUse hook for the `worker` subagent (matcher: Edit|Write|NotebookEdit), wired in .claude/agents/worker.md.

Workers may only write under app/ and tests/, and never to files the orchestrator owns:
app/config/**, app/schemas/**, any __init__.py, README.md, plus secrets (.env*, sets/).
Paths are resolved against the top of the worker's worktree (from the hook's `cwd`), because
${CLAUDE_PROJECT_DIR} keeps pointing at the main checkout. The git root can sit above the project
(here: `submissions/chudovskyi/` inside a larger repo), so the project's prefix, taken from the main
checkout, is stripped first. Anything outside the project is blocked as well.
Exit code 2 = BLOCKED, stderr is fed back to the agent. Standard library only.
"""

import json
import os
import subprocess
import sys

ALLOWED_ROOTS = ("app/", "tests/")
ORCHESTRATOR_OWNED = ("app/config/", "app/schemas/")


def reason(rel: str) -> str | None:
    base = rel.rsplit("/", 1)[-1]
    if rel.startswith("../") or os.path.isabs(rel):
        return "it is outside your worktree"
    if base.startswith(".env") or rel.startswith("sets/") or "/sets/" in rel:
        return "it is a secrets file"
    if not rel.startswith(ALLOWED_ROOTS):
        return "workers may only change files under app/ and tests/"
    if rel.startswith(ORCHESTRATOR_OWNED) or base == "__init__.py":
        return "it is a shared file owned by the orchestrator (contract, config or package exports)"
    return None


def git(cwd: str, *args: str) -> str:
    try:
        out = subprocess.run(
            ["git", "-C", cwd, *args],
            capture_output=True,
            text=True,
            timeout=5,
        )
    except (OSError, subprocess.SubprocessError):
        return ""
    return out.stdout.strip() if out.returncode == 0 else ""


def project_relpath(root: str, path: str) -> str:
    top = git(root, "rev-parse", "--show-toplevel") or root
    prefix = git(os.environ.get("CLAUDE_PROJECT_DIR") or root, "rev-parse", "--show-prefix")
    try:
        rel = os.path.relpath(os.path.abspath(os.path.join(root, path)), os.path.abspath(top))
    except ValueError:
        return "../" + path
    rel = rel.replace("\\", "/")
    if prefix:
        if not rel.startswith(prefix):
            return "../" + rel
        rel = rel[len(prefix) :]
    return rel


def main() -> int:
    try:
        sys.stdin.reconfigure(encoding="utf-8")
        ev = json.loads(sys.stdin.read() or "{}")
    except Exception:
        return 0

    ti = ev.get("tool_input") or {}
    path = str(ti.get("file_path") or ti.get("notebook_path") or "")
    if not path:
        return 0
    root = ev.get("cwd") or os.getcwd()
    rel = project_relpath(root, path)

    why = reason(rel)
    if why:
        sys.stderr.write(
            f"Blocked by worker_guard: {rel} - {why}. "
            "Stay within the owned files of your brief; if you need this change, "
            "return Status: blocked with a proposal for the orchestrator.\n"
        )
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
