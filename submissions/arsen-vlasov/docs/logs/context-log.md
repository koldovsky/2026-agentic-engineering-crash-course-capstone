# Context log

This log records what an agent sees before it does anything. Each entry measures it before and
after a context change. Byte counts come from `wc -c`. The human pastes the `/context` numbers (the
agent cannot run slash commands).

## Baseline — 2026-09-29, branch `chore/capstone-harness`, after phase 0

Files that load on every request:

| File | Bytes |
|---|---|
| `AGENTS.md` (212 lines) | 9 125 |
| `.cursor/rules/karpathy-guidelines.mdc` (alwaysApply) | 2 643 |
| `.cursor/rules/project-base.mdc` (alwaysApply) | 2 250 |
| `CLAUDE.md` | 733 |
| **Total** | **14 751** |

Path-scoped rules: 20 files, 54 230 bytes in all. `date-helper-seconds-to-ms` has `alwaysApply: true`
and `paths: **/*.ts`, so in practice it loads with any TypeScript file.

Before phase 0, on `main`, `.claude/rules/` was empty: Claude loaded only `CLAUDE.md` and `AGENTS.md`,
and none of the 22 rules applied.

`/context` in a fresh session (pasted by the human):

```
Context window 44k / 1M (4%)
System tools 15.1k · MCP tools 14k · Skills 5.8k · System prompt 4.3k
Memory files 4.1k · MCP server instructions 733 · Autocompact buffer 33k
Deferred: MCP tools 79.4k · System tools 22.7k — MCP tools total 93.3k, 203 tools
```

## Changes

| Date | Change | Always-loaded bytes before → after | `/context` before → after | Same prompt, what changed |
|---|---|---|---|---|
| 2026-09-29 | Phase 1: AGENTS.md 212 → 82 lines, harness detail to `docs/harness/index.md`. `karpathy-guidelines` rule → project skill. `date-helper` scoped to `**/*.ts` for Cursor. Firecrawl MCP removed (29 tools). Compact instructions in `CLAUDE.md` | 14 751 → 6 811 (−54%) | memory files 4.1k → 2.2k (AGENTS.md 1.4k). MCP tools 203 → 226, Firecrawl still loaded — see note | _to be run_ |

Note on phase 1: removing Firecrawl from `.mcp.json` changed nothing for this user. The reason is
that `~/.claude.json` also declares `playwright`, `sequential-thinking`, `markitdown`, `firecrawl-mcp`
and `context7` at **user** scope. Every project server except `atlassian` is registered twice.
The project file is what teammates get. The user-scope copies are on one person's machine only. The
tool count also rose because claude.ai connectors (Atlassian, docs) connected in the second session.
Lesson: measure with `/context` after every config change. The config file alone proved nothing.

Decision (human, 2026-09-29): the user-scope MCP servers stay. The project `.mcp.json` is the team
baseline. So the MCP tool count on this machine is not a phase 1 metric.
