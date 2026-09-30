@AGENTS.md

## Claude Code — additional notes

- Rules live in `.claude/rules/*.md`. They are the source of truth, and git tracks them. `.cursor/` is
  local and git-ignored. After you change a rule, run `npm run cursor:sync` to update the Cursor copies.
- Before you show work, run `npm run check`. Report the real result. Do not claim that it passes if you did not run it.
- To check what actually loaded, use `/context` (memory files) and `/doctor`.
- Before you work on API specs, check `docs/references/endpoints.csv`. If the endpoint is not in the
  registry, stop. Report that it is missing. Do not invent a path.
- Run tests with an explicit `ENV`: `ENV=stage npx playwright test …`.
- Use plan mode for multi-step spec changes. The test style rules are strict. It costs less to agree
  on a plan than to rewrite the result.

# Compact instructions

When you compact, keep these items:

- the current branch and phase
- every command that ran, with its real result (`npm run check`, test runs, exit codes)
- the files that changed, and why
- the decisions that the human made
- the open blockers

Remove file dumps, full test logs and tool listings.
