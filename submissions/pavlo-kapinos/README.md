# Capstone — Pavlo Kapinos

**ORACUL**: a local web app that builds possible futures from real current news. ORACUL collects and checks
the evidence (GDELT news), the user sets the scenario and adds wildcards, and ChatGPT reasons over that evidence
inside fixed limits (an evidence guard and a separate critic pass). Sign-in uses the official "Sign in with ChatGPT"
(OAuth + PKCE), so no API key is needed.
Stack: Spring Boot (Java) + Angular + PostgreSQL + Playwright E2E, in Docker Compose.

The code is in two separate repositories, so the full commit history stays intact as evidence:

| Repo | What it is |
|---|---|
| [Kass271/oracul-engine](https://github.com/Kass271/oracul-engine) | the app that was built: backend, frontend, OpenAPI contract, E2E, and phase docs |
| [Kass271/oracul-factory-engine](https://github.com/Kass271/oracul-factory-engine) | the "factory" that built it: a Claude Code plugin with skills, sub-agents, hooks, checks, and workflows |

## How it was built

I did not prompt the app step by step. I built a Claude Code plugin (the factory) and gave it the product spec. The
factory takes every phase through
`00_setup → 01_scope → 02_specs → 03_plan → 04_build (one slice at a time) → 05_release`.
Every step ends in a commit and has to pass gates the factory checks itself. My job was to approve scope, specs and
the plan, decide when the factory was wrong, and fix the factory in a separate session.

| Practice | Where to see it |
|---|---|
| **Context engineering** | static: [`AGENTS.md`](https://github.com/Kass271/oracul-factory-engine/blob/main/AGENTS.md), [`skills/`](https://github.com/Kass271/oracul-factory-engine/tree/main/skills) (stack, testing and QA rules loaded on demand); dynamic: [`hooks/session-start.mjs`](https://github.com/Kass271/oracul-factory-engine/blob/main/hooks/session-start.mjs) adds the current phase and step state |
| **Specs first (SDD)** | [`docs/phase-01_mvp/01_scope`](https://github.com/Kass271/oracul-engine/tree/main/docs/phase-01_mvp/01_scope) (FR-1..FR-34, clarification log) → [`02_specs`](https://github.com/Kass271/oracul-engine/tree/main/docs/phase-01_mvp/02_specs) + [`api/openapi.yaml`](https://github.com/Kass271/oracul-engine/blob/main/api/openapi.yaml) → [`03_plan/plan.md`](https://github.com/Kass271/oracul-engine/blob/main/docs/phase-01_mvp/03_plan/plan.md), all committed before the first line of code |
| **Loops** | [`workflows/build-slice.js`](https://github.com/Kass271/oracul-factory-engine/blob/main/workflows/build-slice.js): red → red-check → green → verify → review → fix rounds, per slice; [`rounds.md`](https://github.com/Kass271/oracul-engine/blob/main/docs/phase-01_mvp/04_build/02_chatgpt-connection/rounds.md) logs every round of every slice |
| **Verification** | [`checks/verify.mjs`](https://github.com/Kass271/oracul-factory-engine/blob/main/checks/verify.mjs) (traceability FR→test, coverage, contract, review, artifacts); a `red-evidence.md` per slice proves the tests failed before the code existed; backend tests and ITs, Angular specs, and [Playwright E2E](https://github.com/Kass271/oracul-engine/tree/main/e2e/tests); the factory checks itself with [`self-test/run.mjs`](https://github.com/Kass271/oracul-factory-engine/blob/main/self-test/run.mjs) |
| **Maker ≠ checker** | [`agents/`](https://github.com/Kass271/oracul-factory-engine/tree/main/agents): `tester` writes failing tests, `backend-builder`/`frontend-builder` implement, `reviewer` reviews independently; [`check-review.mjs`](https://github.com/Kass271/oracul-factory-engine/blob/main/checks/check-review.mjs) blocks a slice while any high or medium finding is open |
| **Guardrails** | [`hooks/guard-edits.mjs`](https://github.com/Kass271/oracul-factory-engine/blob/main/hooks/guard-edits.mjs): the engine is read-only during app builds, and there are phase and step guards |

## Status

- `phase-01_mvp`: released GREEN, 19 slices ([`05_release`](https://github.com/Kass271/oracul-engine/commit/dcaad67)).
- `phase-02_codex-provider`: in progress. The sign-in fix is done; news search and model resolution are WIP.
