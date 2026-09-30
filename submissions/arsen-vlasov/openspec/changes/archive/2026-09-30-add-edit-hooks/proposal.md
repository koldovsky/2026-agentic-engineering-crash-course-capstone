# Proposal

## Why

The checks in `npm run check` run only when someone starts them. An agent can edit ten files before
it runs the check, and then it must find its mistakes again. The human also decided that the STE pass
is part of every edit, not a step that someone must remember. `koldovsky/project-factory` solves this
with a PostToolUse hook that returns lint errors to the agent at once, and with git hooks.

The guard also has four known gaps (see `docs/exec-plans/tech-debt-tracker.md`):

- a glob reads the raw journal
- the guard blocks `.env.example`, a template with no secrets
- `Grep` and `Glob` reach the static user files, and `Read(...)` rules do not cover them
- nothing stops `git commit --no-verify`, so a git hook alone is not a gate for the agent.

## What Changes

- A PostToolUse hook checks each file right after `Edit`, `Write` or `MultiEdit`:
  - for harness and doc text: the language check and the STE linter, against the baselines
  - for specs and page objects: `rules:lint` and ESLint errors for that file.
  A finding exits 2, so the agent sees it at once.
- `rules:lint` also checks new files that git does not track yet.
- The guard closes the four gaps above.
- A git pre-commit hook, installed with `npm run hooks:install`:
  - blocks staged `.env` files, except `.env.example`
  - blocks any baseline that grows
  - blocks a new `ci/known-failures.json` entry without a `PRJ-` issue.
- A SessionStart hook prints the newest block of `docs/logs/session-notes.md`.

## Capabilities

### New Capabilities

- `edit-hooks`: checks that run on each edit, on each commit and at session start, plus the guard rules
  that make them binding for the agent.

### Modified Capabilities

_none_

## Impact

- New: `.claude/hooks/post-edit-check.mjs`, `.claude/hooks/session-start.mjs`,
  `scripts/harness/pre-commit.mjs`, `.githooks/pre-commit`, and their tests.
- Changed: `scripts/harness/guard-policy.mjs`, `.claude/hooks/guard-secrets.mjs`,
  `scripts/rules-lint.mjs`, `.claude/settings.json`, `package.json`, `scripts/hooks-selftest.mjs`.
- `npm run hooks:install` sets `core.hooksPath` in the local git config of this repository.
