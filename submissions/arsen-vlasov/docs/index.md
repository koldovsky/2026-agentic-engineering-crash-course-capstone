# Documentation index

This is the entry point to `docs/`. This index lists every document, directly or through the index of
its folder. "Verified" is the date when a person or an agent last checked the document against the
code.

## Start here

| Document | Purpose | Verified |
|---|---|---|
| [../AGENTS.md](../AGENTS.md) | The map for agents: commands, definition of done, boundaries | 2026-09-30 |
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | The code layers and the direction of imports | 2026-09-30 |
| [core-beliefs.md](core-beliefs.md) | The principles behind every rule and check | 2026-09-30 |

## Harness

| Document | Purpose | Verified |
|---|---|---|
| [harness/index.md](harness/index.md) | How rules, skills, agents, hooks, MCP servers and secrets connect | 2026-09-30 |
| [harness/git-policy.md](harness/git-policy.md) | What is committed and what is local | 2026-09-30 |

## Design

| Document | Purpose | Verified |
|---|---|---|
| [design/admin-panel-tables/index.md](design/admin-panel-tables/index.md) | Architecture of Admin Panel tables and filters | 2026-09-30 |
| [design/autotest-tags-and-allure.md](design/autotest-tags-and-allure.md) | Playwright tags and Allure labels: taxonomy and usage | 2026-09-30 |

## Test strategy

| Document | Purpose | Verified |
|---|---|---|
| test-strategy/api/index.md | The API test strategy: scope, approach, coverage by priority | 2026-09-30 |
| references/endpoints.csv | The API endpoint registry, read by `api-test` through `endpoint-lookup.mjs` | 2026-09-30 |

## Plans

| Document | Purpose | Verified |
|---|---|---|
| [exec-plans/completed/capstone-plan.md](exec-plans/completed/capstone-plan.md) | The capstone plan: phases, decisions, schedule. Completed | 2026-09-30 |
| [exec-plans/tech-debt-tracker.md](exec-plans/tech-debt-tracker.md) | Known debt, one row per item | 2026-09-30 |

A finished plan moves from `exec-plans/active/` to `exec-plans/completed/`. Harness specs live in
`../openspec/`, and each spec comes before its code. `openspec/specs/` is current, and
`openspec/changes/archive/` is history.

## Logs

| Document | Purpose | Verified |
|---|---|---|
| [logs/session-notes.md](logs/session-notes.md) | Where the last session stopped. Read the newest block first | 2026-09-30 |
| [logs/autonomy-log.md](logs/autonomy-log.md) | Autonomy levels per piece of work, and the agent's mistakes | 2026-09-30 |
| [logs/context-log.md](logs/context-log.md) | Context size before and after each change | 2026-09-30 |

## Evidence

| Document | Purpose | Verified |
|---|---|---|
| [reviews/index.md](reviews/index.md) | Reviews by the `spec-reviewer` agent, and the phase reports | 2026-09-30 |
| [bugs/index.md](bugs/index.md) | Bug drafts for Jira (the bug text is Russian on purpose) | 2026-09-30 |
| [loops/index.md](loops/index.md) | Reports of the stabilize loop: runs, attempts, stop reason, cost | 2026-09-30 |
