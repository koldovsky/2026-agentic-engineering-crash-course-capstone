# Scope Guard — Block Evidence

Date: 2026-09-26

Path prefix `…` = `…/agentic-engineering/2026-agentic-engineering-crash-course-capstone`  
Submission root = `…/submissions/oleksandr-sorokin`

---

## Incident 1 — Write tool blocked (out-of-scope file)

**Tool:** `Write`  
**Target:** `…/README.md` (outside submission root)

### Refusal message

```
PreToolUse:Write hook error: [node ${CLAUDE_PROJECT_DIR}/.claude/hooks/guard-scope.mjs]:
Blocked by scope guard: …/README.md is outside the write scope
(. of …/submissions/oleksandr-sorokin).
The scope is set in .agents/scope.json.
Do not work around this; ask the human if the file really must change.
```

### Mechanism

The `PreToolUse` hook exits with code `2`, killing the call before execution.
No `PostToolUse` entry is written — one entry in, none out = blocked.

---

## Incident 2 — Read tool blocked (.env)

**Tool:** `Read`  
**Target:** `.env` (inside submission root but deny-listed by permission settings)

### Refusal message

```
File is in a directory that is denied by your permission settings.
```

### Mechanism

Permission-level denial fires before the hook layer — `.env*` files are blocked at the
Claude Code permission settings level, consistent with the rule in `AGENTS.md`:
_"Never: touch `.env*` (a hook blocks it)"_.

---

## Last 5 lines of .agent-log/actions.jsonl (at 2026-09-26T19:42)

```jsonl
{"ts":"2026-09-26T19:40:33.915Z","event":"PreToolUse","id":"toolu_01SjFngeD9WScLKfuPc7y6iM","session":"3640be8a","mode":"default","tool":"Write","path":"docs/evidence/scope-guard-blocked.md"}
{"ts":"2026-09-26T19:40:46.008Z","event":"PostToolUse","id":"toolu_01SjFngeD9WScLKfuPc7y6iM","session":"3640be8a","mode":"acceptEdits","tool":"Write","path":"docs/evidence/scope-guard-blocked.md","exit":0,"ms":9}
{"ts":"2026-09-26T19:42:24.774Z","event":"PreToolUse","id":"toolu_01GubSH5tNR7CHFMG4EbvxdA","session":"3640be8a","mode":"acceptEdits","tool":"Bash","cmd":"pnpm agent:log"}
{"ts":"2026-09-26T19:42:24.949Z","event":"PostToolUse","id":"toolu_01GubSH5tNR7CHFMG4EbvxdA","session":"3640be8a","mode":"acceptEdits","tool":"Bash","cmd":"pnpm agent:log","exit":0,"ms":148}
{"ts":"2026-09-26T19:42:25.207Z","event":"PreToolUse","id":"toolu_01PpiWEpba4MCMq5WPwMyykk","session":"3640be8a","mode":"acceptEdits","tool":"Bash","cmd":"tail -5 .agent-log/actions.jsonl"}
```

---

## pnpm agent:log summary (at 2026-09-26T19:42)

```
Agent actions: 53 executed, 2 proposed but not executed, 2 failed — 3 session(s)
2026-09-26T18:39:13.722Z .. 2026-09-26T19:42:24.774Z

┌─────────┬─────────┬──────────┬──────────┬─────────┬────────┬──────────┬───────┐
│ (index) │ tool    │ proposed │ executed │ blocked │ failed │ time (s) │ files │
├─────────┼─────────┼──────────┼──────────┼─────────┼────────┼──────────┼───────┤
│ 0       │ 'Bash'  │ 44       │ 43       │ 1       │ 2      │ 10.5     │ 0     │
│ 1       │ 'Read'  │ 6        │ 6        │ 0       │ 0      │ 0        │ 6     │
│ 2       │ 'Write' │ 4        │ 3        │ 1       │ 0      │ 0        │ 4     │
│ 3       │ 'Edit'  │ 1        │ 1        │ 0       │ 0      │ 0        │ 1     │
└─────────┴─────────┴──────────┴──────────┴─────────┴────────┴──────────┴───────┘

Proposed but not executed (blocked by a hook, a rule or you):
  2026-09-26T19:34:51.937Z  Write  …/README.md
  2026-09-26T19:42:24.774Z  Bash   pnpm agent:log
```

Note: the `.env` Read block does not appear in `agent:log` because it was denied at the
permission layer before the hook (and thus before the audit log entry was written).

---

## Gap observed

Raw shell commands via the `Bash` tool (`echo >> ../../README.md`) bypass the scope guard —
the hook only fires on structured `Write`/`Edit` tool calls, not on arbitrary shell writes.
