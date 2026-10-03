# ADR-0002: Static context budget for AGENTS.md

- **Status:** Accepted
- **Date:** 2026-09-30
- **Deciders:** delivery orchestrator, following the factory template

## Context

Every agent turn pays for the static layer. AI Requirements Assistant is a small capstone, so the static layer should stay the cross-cutting rules in `AGENTS.md`. Domain behavior lives in OpenSpec specs and `docs/requirements.md`, loaded when a task needs them.

## Decision

We will keep `AGENTS.md` as the static layer with a budget of 4k tokens. `CLAUDE.md` only points at `AGENTS.md`. Specs, the capability plan, and framework docs are dynamic. If `AGENTS.md` grows past the budget, detail moves out. The budget is not raised silently.

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| Lean AGENTS.md plus on-demand specs (chosen) | Turns stay small; requirements stay the source of truth | Agents must open the spec for a slice |
| Inline the full requirements into AGENTS.md | Always in context | Paid on every turn, including unrelated ones |

## Consequences

- Handoff starts at `docs/current-state.md`, then the spec for the active capability.
- This boundary is versioned here. A later change to the budget gets a new ADR.
