# Capstone: an agentic harness for a Playwright autotest repository

Author: Arsen Vlasov. Course: fwdays, Crash Course: Agentic Engineering, September 2026.

## The project

The repository has Playwright and TypeScript autotests for the LMS and the Admin Panel of an online
trading school. About 400 regression tests run each night in Jenkins on stage. The capstone is the
harness around these tests: rules, skills, hooks, a checker agent, specs before code, a loop and the
logs. The main tool is Claude Code. Cursor gets the same rules through a sync script.

This folder is an export, because the repository is private. A script copied the harness and the
evidence here. It replaced the company names, domains, e-mails and Jira keys with `Acme`,
`*.example.com` and `PRJ-`. A gate stopped the export on any leftover. The product code and most
tests stay private. A link to a private file is plain text here.

## Practices and evidence

| Practice | What the harness has | Evidence | What went wrong |
|---|---|---|---|
| Context engineering, static | `AGENTS.md` is a map of 90 lines. Before, it had 212 lines. 21 rules load by file path, and 7 skills load by task | [AGENTS.md](AGENTS.md), [rules](.claude/rules), [skills](.claude/skills). The [context log](docs/logs/context-log.md) shows 14 751 → 6 811 always-loaded bytes. Commit `c6cb469` | The removal of an MCP server from `.mcp.json` had no effect. The same server was also at user scope. Only a `/context` measurement showed it |
| Context engineering, dynamic | At session start, a hook prints the newest block of the session notes. After each edit, a hook returns the lint and STE findings to the agent | [session-start.mjs](.claude/hooks/session-start.mjs), [post-edit-check.mjs](.claude/hooks/post-edit-check.mjs), [session notes](docs/logs/session-notes.md). Commits `bce7631` → `ecaee28` → `fe74fa0` | The edit hook does not see a file that a Bash command changes. Row 13 of the [tech-debt tracker](docs/exec-plans/tech-debt-tracker.md) |
| Loop engineering | `npm run loop:stabilize -- <spec>` runs a spec with `--repeat-each=5`. On a failure, `claude -p` fixes the test code, and the loop runs the spec again. Limits: 3 attempts, 20 min, 3 USD, a stall of 2. A hash of the protected files and a weakening check. The loop never commits | [stabilize.mjs](scripts/loop/stabilize.mjs), [spec](openspec/specs/stabilize-loop/spec.md), [loop reports](docs/loops/index.md). Loop 1: `NOT_REPRODUCED`, 0 USD. Loop 2: `GREEN` after 2 attempts, 2.96 USD | The loop 2 fix changed a shared helper and broke 5 stable tests. The loop did not see this. The checker and a stage run of the callers found it. The human discarded the fix and stopped the loop for these tests. [Review](docs/reviews/2026-09-30-loop2-helper-review.md) |
| Checks and tests | `npm run check` runs offline in about 35 s: typecheck, ESLint, a compile of each spec, `rules:lint`, `docs:lint`, `docs:ste`, `spec:check` and `harness:test`. A mutation run shows that a new spec can fail | Red → green commits: `9c4cc05` → `c9fe9a2`, `011afe2` → `7e3be2a`, `51ace4a` → `e292bc1`. The [phase 7 report](docs/reviews/2026-09-29-phase7-gd-tc-69.md) has 7 red runs from agent mistakes, then 4 of 4 green | The first version of `collect-evidence.mjs` reported 0 failures when there were 112. The agent saw it in a raw count before the commit |
| The verdict on a Jenkins build | A skill reads a Jenkins build and gives PASS, FAIL or NOT-EARNED. A green build with 0 executed tests is NOT-EARNED. Known failures are a ratchet | The skill is in [.claude/skills/](.claude/skills), [jenkins-report.mjs](scripts/ci/jenkins-report.mjs), [known failures](ci/known-failures.json) | The first design read JUnit. The live run showed that the jobs publish only Allure. Its live run is in the [archived changes](openspec/changes/archive) of 2026-09-29 |
| Maker ≠ checker | [spec-reviewer](.claude/agents/spec-reviewer.md) is read-only and uses a different model (`sonnet`). It reads the test case before the code | [Control review](docs/reviews/2026-09-29-control-review.md): 4 of 4 planted defects found. [PRJ-TC-84 review](docs/reviews/2026-09-29-mentor-stats-filters-review.md): CHANGES. [Loop 2 review](docs/reviews/2026-09-30-loop2-helper-review.md): CHANGES, and a stage run agreed | In phase 7, the reviewer found an empty test (0 = 0) that the maker did not see |
| Specs before code (SDD) | OpenSpec with a pinned version. Each harness change goes spec → red tests → code → archive | [Current specs](openspec/specs), [archived changes](openspec/changes/archive). Commit order `bd6147f` → `9c4cc05` → `c9fe9a2` | Reality changed the spec two times: `d37ad84` (Allure, not JUnit), and the loop design after loop 2 |
| Autonomy log | The level before each piece of work, and the fact after it | [autonomy-log.md](docs/logs/autonomy-log.md), with two decreases of the level | The agent went around its own guard once, with a path built from string pieces. It recorded this and lowered its level for secrets |
| Other: hooks and a guard | The guard blocks reads of secrets, runs on `prod`, reads of the journal and skipped git hooks. A journal hook records each action. A git pre-commit hook blocks the growth of a baseline | [guard-policy.mjs](scripts/harness/guard-policy.mjs), [control.md](docs/harness/control.md), [hooks-selftest.mjs](scripts/hooks-selftest.mjs). The guard blocked a `prod` run and the agent's own commit that skipped the git hooks | The guard matches the command text only. Row 4 of the [tech-debt tracker](docs/exec-plans/tech-debt-tracker.md) |

All commit hashes are in [git-log.md](git-log.md).

## Who decided what

The human chose the scope, the autonomy levels, OpenSpec, the model of the loop agent, and each
"done". The human also decided that PRJ-6789 is not a bug, discarded the loop 2 fix, and stopped the
loop. The agent wrote the harness code, the specs, the tests and the docs, and it ran the checks.
The pull request has the text of the human. The details are in the [autonomy log](docs/logs/autonomy-log.md).

## How to check

These commands run in the private repository: `npm run check`, `npm run hooks:selftest` and
`npm run loop:stabilize -- <spec>`. They need the stage environment and the keys. This folder is not a
project that you can run. The pull request has the output of the last run.

## What is in this folder

| Path | Content |
|---|---|
| [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md), [ARCHITECTURE.md](ARCHITECTURE.md) | The map for agents, the Claude Code notes, the code layers |
| [.claude/](.claude) | Rules, skills, the checker agent, hooks, settings |
| [scripts/](scripts) | The harness scripts and their tests |
| [openspec/](openspec) | The current specs and the archived changes |
| [docs/](docs/index.md) | Logs, reviews, loop reports, plans |
| [ci/known-failures.json](ci/known-failures.json) | The known Jenkins failures |
| [mentor-stats-calculation.spec.ts](tests/specs/regression/admin-panel/mentor-stats/mentor-stats-calculation.spec.ts), its [helper](tests/specs/regression/admin-panel/mentor-stats/helpers/mentor-stats-calculation.ts) and [page objects](page-objects/admin/tabs/mentor-stats) | The real task of phase 7 |

Not in this folder: the export script (its replacement map names the company), the API endpoint
registry, the API test strategy, the bug drafts, and two scripts for a cloud server.
