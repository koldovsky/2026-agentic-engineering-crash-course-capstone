---
name: agent-log-report
description: >-
  Reports what this session actually did, from the action journal that the hooks write:
  how many actions the agent proposed, which ran, which a hook or a permission rule
  stopped, which failed, what commands the agent proposed and what files it wrote.
  Use it when asked what you did this session, what you changed, what was blocked
  or denied, or why something did not run. Also use it for a handover summary at the
  end of a piece of work.
---

# Reporting on this session from the action journal

Answer from the journal, never from memory. Your memory of a long session is not
reliable. It tends to omit the failed and the blocked actions. Those are usually the
actions worth reporting.

## Run the script

```bash
node .claude/skills/agent-log-report/scripts/report.mjs
```

By default, it reports the most recent session, which is this one. Other forms:

```bash
node .claude/skills/agent-log-report/scripts/report.mjs --sessions          # list sessions
node .claude/skills/agent-log-report/scripts/report.mjs --session <id>      # a specific one
node .claude/skills/agent-log-report/scripts/report.mjs --all               # every session
```

## Report what it printed

- Quote the real numbers and paths. Do not round. Do not omit actions in a summary.
  Do not add actions that the journal does not contain.
- **If the Stopped section is not empty, start with it.** It holds the actions that you
  proposed and that never ran. One of these stopped each action:
  - `guard-secrets.mjs` blocked it
  - a rule in `.claude/settings.json` denied it
  - the person said no

  If you said earlier in the conversation that any of them succeeded, correct yourself now.
- Mention the Failed section separately. Those actions ran and errored. That is a
  different thing from a stopped action.
- If the journal is empty or missing, say so plainly. It means that the hooks did not fire.
  Do not write a summary from memory instead.

## What the journal does and does not contain

`.claude/hooks/log-action.mjs` writes the journal on three events:

- `PreToolUse`, when the agent proposes an action
- `PostToolUse`, when the action ran
- `PostToolUseFailure`, when the action errored

`tool_use_id` links the entries into pairs. A `PreToolUse` with no pair is a stopped action.

Each entry holds the timestamp, event, tool, ids, and one truncated target field: the
command, path, pattern or URL. It holds no file contents, no tool output and no secrets.
So the journal can tell you *that* the session wrote a file, and which file. It can never
tell you what the session wrote into it. For that, read the file or the diff.

The journal is local and gitignored, so it covers only this machine.
