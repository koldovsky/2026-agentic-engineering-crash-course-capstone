# Acme Autotest Project — context for AI agents

This is the single root document. Cursor reads it natively. Claude Code reads it through `CLAUDE.md`.
It is a map, not an encyclopedia: detail lives in rules, skills and `docs/`.
[docs/index.md](docs/index.md) lists all documents. [ARCHITECTURE.md](ARCHITECTURE.md) describes the code layers.

## What this is

The project holds end-to-end and API autotests in **Playwright + TypeScript** for the LMS and the Admin Panel.
Allure makes the reports. Environments: `dev` / `stage` / `prod`. The `ENV` variable selects the environment.

## Commands

| Task | Command |
|---|---|
| **Check the work before you deliver it** | **`npm run check`** |
| API tests | `npm run test:api` |
| LMS regression | `npm run test:stage:lms:regression` |
| Admin Panel regression | `npm run test:stage:admin:regression` |
| By tag | `npm run test:tag -- @tag` |
| One spec | `ENV=stage npx playwright test <path>` |
| A flaky spec: run it until it is stable (stage, an agent fixes it) | `npm run loop:stabilize -- <path>` |
| Allure | `npm run allure:generate && npm run allure:open` |
| What this session did | `npm run agent:log` |
| Hook self-test | `npm run hooks:selftest` |
| Install the git hooks (once per clone) | `npm run hooks:install` |

Always set `ENV`. Without it, the environment config does not load.
Playwright projects: `api` (only `tests/specs/api/**`) and `chromium` (everything else).

## Layout

```
tests/specs/     specs: api/ and regression/{lms,admin-panel}/
page-objects/    POM: lms/, admin/, components/
fixtures/        Playwright fixtures (pages, API, users)
core/            API clients
utils/           helpers/, constants/, DateHelper, UserManager
test-data/       static users, admin panel data
schemas/         AJV schemas for API responses
docs/            index.md, harness/, design/, test-strategy/, exec-plans/, logs/, references/, reviews/, bugs/, loops/
```

## Definition of done

`npm run check` is green, and you ran it. It runs typecheck, lint, a compile of every spec without
running it, and `rules:lint`. It takes about 35 seconds and runs offline. Do not claim that it passes
if you did not run it. That is worse than not running it.

A new or changed spec also has to run green on `stage`, once, with `ENV=stage`.

Two ratchets hold inherited debt: `eslint-suppressions.json` and `.rules-lint-baseline.json`.
An old violation does not fail the run. A new violation fails it. **Never add a violation to a baseline
to make a red run green.**

## Boundaries

- Never run tests against `prod`. The guard hook blocks it.
- Never read `.env`, `.auth/` or static user files for `dev` / `prod`. Passwords come from
  `.env` through `UserManager`.
- Treat Jira and AIO Tests as read-only. Never create or change a test case.
- Rules live in `.claude/rules/*.md`. `.cursor/` is local and git-ignored. Never add it to git.
  Never delete files in it. To refresh it, run `npm run cursor:sync`.
- Harness files, dependencies and baselines change only with the human's explicit approval.

## Where to look

| Need | Go to |
|---|---|
| Write a regression spec from a test case | skill `ui-autotest`, then subagent `spec-reviewer` before "done" |
| Cover an API endpoint | skill `api-test`. The endpoint must exist in `docs/references/endpoints.csv` |
| A test failed: is it a bug? | skill `bug-report`. Drafts go to `docs/bugs/`. A human files them |
| Is the Jenkins build green? | skill `jenkins-verify`: PASS / FAIL / NOT-EARNED |
| A spec is flaky | `npm run loop:stabilize -- <path>`. Reports go to `docs/loops/`. The loop never commits |
| Change harness behaviour | OpenSpec: `openspec/changes/<name>/`, spec before code, `npm run spec:check` |
| Report what this session did | skill `agent-log-report` |
| Conventions for specs, POM, users, tags | rules in `.claude/rules/`, loaded by file path |
| How rules, skills, hooks, MCP and secrets connect | `docs/harness/index.md` |
| Principles behind the rules / known debt | `docs/core-beliefs.md` / `docs/exec-plans/tech-debt-tracker.md` |
| Where the last session stopped | newest block of `docs/logs/session-notes.md` |

## Session state

To open a session, read the newest block of `docs/logs/session-notes.md`. Continue from its
`Start from` line. To close a session, add a new block on top, before `/compact` or `/clear`.

## Language

All harness and document text is English, and it passes the `asd-ste100` skill after each change.
`npm run docs:lint` and `npm run docs:ste` check this. Product UI strings (`Поиск студента`), admin
role names (`Ментор`) and test titles stay as they are, in «…» or backticks, because they are data.
Bug text in `docs/bugs/` is Russian. Details: `docs/harness/language-and-style.md`.
