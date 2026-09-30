# Proposal

## Why

The documents are now the system of record (`docs/index.md`, `ARCHITECTURE.md`, a small `AGENTS.md`).
The human decided that every harness and document text is English and passes the ASD-STE100 skill.
Rules that a person must remember drift. The OpenAI "Harness engineering" article and
`koldovsky/project-factory` both keep documents accurate with mechanical checks. Each check has a
message that tells the reader how to fix the problem.

## What Changes

- `npm run docs:lint` checks the document tree:
  - the size of `AGENTS.md`
  - relative links
  - that every doc is reachable from `docs/index.md`
  - Cyrillic prose in harness and doc text
  - the git-ignore policy
- `npm run docs:ste` runs the vendored ASD-STE100 linter on the same files, with a per-file baseline
  ratchet. A new or worse hard violation fails the run.
- Both run in `npm run check`.

## Capabilities

### New Capabilities

- `docs-gates`: mechanical checks that keep the harness and the documents structured, English, and
  written in plain structure.

### Modified Capabilities

_none_

## Impact

- New: `scripts/docs/docs-lint.mjs`, `scripts/docs/docs-ste.mjs`, their tests, `.ste-baseline.json`.
- `package.json`: `docs:lint` and `docs:ste`, both in `check`.
- `docs:ste` needs `python3` (stdlib only), because the vendored linter is Python.
