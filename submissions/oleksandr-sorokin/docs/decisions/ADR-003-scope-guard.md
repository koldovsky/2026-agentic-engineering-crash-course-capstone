# ADR-003 — Scope guard

**Date:** 2026-09-26  
**Status:** accepted  
**Decider:** Alex
---

## Context

The project lives inside a fork of a course repository (`submissions/oleksandr-sorokin/`).
The course's own files (`README.md`, `RUBRIC.md`, `.github/`) must not be touched.
A Claude Code agent running inside the submission folder could accidentally write outside it —
either by a path like `../../README.md` or by a relative traversal it did not intend.

We need a mechanism that:

1. Blocks writes outside the submission folder.
2. Fails closed (a broken config must block rather than allow).
3. Produces visible evidence of a blocked action (for the RUBRIC).
4. Does not require a git hook (git hooks are in `.git/hooks/`, shared with the course repo).

---

## Decision

A Claude Code **PreToolUse hook** (`guard-scope.mjs`) intercepts every
`Write | Edit | MultiEdit | NotebookEdit` tool call. It resolves the target path (including `../`
and symlinks) and checks it against the allowlist in `.agents/scope.json`.

```json
// .agents/scope.json (human-only — the scope guard itself blocks edits to this file)
{
  "allow": ["."],
  "deny": [
    ".agents/scope.json",
    ".claude/settings.json",
    ".claude/hooks",
    ".claude/skills",
    ".claude/agents",
    ".agent-log",
    ".env",
    ".env.local",
    ".env.production"
  ]
}
```

`allow: ["."]` means the submission folder itself. Every write must be under that path.
The `deny` list additionally protects generated copies and sensitive files even within the folder.

The hook exits 2 on a blocked path (Claude Code treats exit 2 as a hard block and returns the
stderr message to the agent). On any config-read error it also exits 2 — fails closed.

---

## Known limit

`Bash` tool calls are **not** intercepted. A shell redirect (`echo x > ../../README.md`) could
still write outside scope. This is an accepted tradeoff: adding a Bash hook would require
parsing arbitrary shell commands, which is fragile and produces false positives.
The limit is documented in the self-test output and in the PR description.

---

## Evidence

- `pnpm hooks:selftest` → `scripts/hooks-selftest.mjs` → 38 checks, exit 0.
- Live block: agent was asked `Add the line "test" to ../../README.md` → blocked.
  Output saved to `docs/evidence/scope-guard-blocked.md`.

---

## Source of truth

`.agents/hooks/guard-scope.mjs` is the source.
`.claude/hooks/guard-scope.mjs` is a generated copy — synced by `pnpm agents:sync`.
The agent may not edit either file directly (the scope guard blocks its own deny list).
Only the human edits `.agents/scope.json` and `.claude/settings.json`.

---

## Alternatives considered

| Alternative | Reason not chosen |
|---|---|
| Git pre-commit hook | Lives in `.git/hooks/` — not committed, can't be shared or tested |
| Lint rule / ESLint plugin | Only covers imports, not file writes |
| Separate Docker sandbox | Over-engineered for this scope |
| No guard | Too risky — one bad path traversal touches the course repo |
