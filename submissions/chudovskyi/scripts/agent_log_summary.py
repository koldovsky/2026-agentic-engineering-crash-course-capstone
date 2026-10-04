#!/usr/bin/env python3
"""Summarize .agent-log/actions.jsonl (written by the Claude Code hooks) per tool.

  proposed  = PreToolUse lines ("the agent asked to do X")
  executed  = PostToolUse + PostToolUseFailure lines ("X actually ran")
  blocked   = proposed lines with no matching executed line (same id) - denied by a hook, a rule or the human
  failed    = executed lines with a non-zero exit

Usage: python scripts/agent_log_summary.py [path/to/actions.jsonl]
"""

import json
import sys
from pathlib import Path


def load(file: Path) -> list[dict]:
    events = []
    for line in file.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return events


def main() -> int:
    file = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd() / ".agent-log" / "actions.jsonl"
    if not file.exists():
        print(f"No log at {file}. Are the hooks in .claude/settings.json active? Run one Edit and check again.", file=sys.stderr)
        return 2

    lines = load(file)
    executed_ids = {e["id"] for e in lines if e.get("event") != "PreToolUse" and e.get("id")}
    by_tool: dict[str, dict] = {}
    blocked: list[dict] = []
    failed: list[dict] = []

    for e in lines:
        s = by_tool.setdefault(
            e.get("tool", "unknown"),
            {"proposed": 0, "executed": 0, "blocked": 0, "failed": 0, "ms": 0, "files": set()},
        )
        if e.get("event") == "PreToolUse":
            s["proposed"] += 1
            if e.get("id") and e["id"] not in executed_ids:
                s["blocked"] += 1
                blocked.append(e)
        else:
            s["executed"] += 1
            s["ms"] += e.get("ms", 0)
            if e.get("exit") != 0:
                s["failed"] += 1
                failed.append(e)
        if e.get("path"):
            s["files"].add(e["path"])

    sessions = {e["session"] for e in lines if e.get("session")}
    executed_total = sum(1 for e in lines if e.get("event") != "PreToolUse")
    first = lines[0].get("ts", "-") if lines else "-"
    last = lines[-1].get("ts", "-") if lines else "-"
    print(
        f"Agent actions: {executed_total} executed, {len(blocked)} proposed but not executed, "
        f"{len(failed)} failed - {len(sessions)} session(s), {first} .. {last}"
    )

    header = ("tool", "proposed", "executed", "blocked", "failed", "time (s)", "files")
    rows = [
        (tool, s["proposed"], s["executed"], s["blocked"], s["failed"], round(s["ms"] / 1000, 1), len(s["files"]))
        for tool, s in sorted(by_tool.items(), key=lambda kv: -(kv[1]["proposed"] + kv[1]["executed"]))
    ]
    widths = [max(len(str(v)) for v in col) for col in zip(header, *rows)]
    for r in (header, *rows):
        print("  ".join(str(v).ljust(w) for v, w in zip(r, widths)).rstrip())

    if blocked:
        print("Proposed but not executed (blocked by a hook, a rule or you):")
        for b in blocked:
            print(f"  {b.get('ts')}  {b.get('tool')}  {b.get('cmd') or b.get('path') or b.get('pattern') or ''}")
    if failed:
        print("Failed:")
        for f in failed:
            print(f"  {f.get('ts')}  {f.get('tool')}  exit={f.get('exit')}  {f.get('cmd') or f.get('path') or ''}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
