# .agent-log

The observability layer of this project. `actions.jsonl` gets ONE JSON line per hook event,
written by `.claude/hooks/log-action.mjs` and wired in `.claude/settings.json`:

    {"ts":"2026-09-20T10:31:07.000Z","event":"PreToolUse","id":"toolu_01","session":"7d3c1a2f","mode":"default","tool":"Edit","path":"app/page.tsx"}
    {"ts":"2026-09-20T10:31:07.412Z","event":"PostToolUse","id":"toolu_01","session":"7d3c1a2f","mode":"default","tool":"Edit","path":"app/page.tsx","exit":0,"ms":14}

- `PreToolUse` = the agent PROPOSED an action. The line is written before the permission check.
- `PostToolUse` and `PostToolUseFailure` = the action actually RAN. `exit` is 0, or N from
  "Exit code N", or "error", or "interrupted".
- A `PreToolUse` line whose `id` never gets a Post line = proposed but not executed. A hook blocked
  it, a permission rule blocked it, or the human refused it.

Fields: `ts`, `event`, `id` (tool_use_id), `session` (first 8 chars), `mode` (permission mode),
`tool`, `path` | `cmd` | `pattern` | `url`, `exit`, `ms`.

Read the log with `pnpm agent:log`. It counts proposed, executed, blocked and failed per tool.
Verify the hooks without an agent with `pnpm hooks:selftest`.

The file is committed on purpose. What the agent DID then sits next to what it SAID.
