@AGENTS.md

## Claude Code

- Start `claude` in this folder (`submissions/oleksandr-sorokin`), never in the repo root — otherwise no hooks run.
- Start in plan mode for anything touching config files or `openspec/`; a one-line diff needs no plan.
- Do not edit `.agent-log/` or `.claude/{hooks,skills,agents}/` — the scope guard blocks it. Edit `.agents/` and run `pnpm agents:sync`.
- Reviewer subagents live in `.agents/agents/` (synced to `.claude/agents/`). Use them for review; never review your own diff in the same context.
