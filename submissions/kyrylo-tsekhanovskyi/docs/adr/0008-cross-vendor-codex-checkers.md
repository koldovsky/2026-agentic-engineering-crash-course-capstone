# 0008. Cross-vendor checkers with the Codex CLI

- Status: accepted · Date: 2026-09-27 (verified 2026-09-29) · Decided by: human

## Context
A reviewer from the same model family shares the maker's blind spots.

## Decision
- The makers are Claude (Opus 5.5, low effort). The checkers are OpenAI Astra 6 (`gpt-6-astra`, high
  effort) through the Codex CLI, run by `scripts/review.mjs` with a read-only sandbox.
- The checkers get the role prompt (`.agents/roles/*-checker.md`), AGENTS.md, the ADRs and the
  OpenSpec change, not the maker's reasoning.
- Verified in phase 1: `codex exec review --uncommitted` cannot take custom instructions, so the
  script uses custom-prompt mode (`codex exec review -`) and the prompt names the uncommitted changes
  to review. `exec review` has no `-s` flag, so the sandbox is set with `-c sandbox_mode="read-only"`.

## Consequences
- Every review costs Codex quota and takes minutes, so reviews run at the sync points, not per edit.
- If the model id changes, only `MODEL` in `scripts/review.mjs` and `.codex/config.toml` change.
