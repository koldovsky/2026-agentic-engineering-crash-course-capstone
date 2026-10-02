# BOMKeeper MVP-1: harness, specs and build plan

## Context

BOMKeeper is a web app for tracking DIY-project parts (solar station, smart home) that are bought from
shops (Rozetka, Amazon) and private sellers (OLX, Allegro, eBay). Today this lives in browser tabs.
The app tracks the parts you need, the ads that could supply them, and the state of each negotiation.

It is also the fwdays Agentic Engineering capstone. The repo is a fork of the course template. The
course asks for the project to sit in `submissions/<name>/` on its own branch, which you confirmed.
Your first `AGENTS.md` is currently at the fork root on `main`.

The project is AI-first and greenfield:
- OpenSpec is the source of truth.
- Rules, skills and hooks are tool-agnostic across Claude Code, Codex and Antigravity.
- There are two maker agents (BE, FE) working in parallel and two cross-vendor checker agents.
- The docs must be complete enough to rebuild the project if all the code were deleted.

**MVP-1 outcome:** a documented, tested app that one command launches, where I can create projects,
add the items I need, and track listings and offers for them.

## Decisions made in planning

| Topic | Decision |
|---|---|
| Location | `submissions/kyrylo-tsekhanovskyi/`, branch `kyrylo-tsekhanovskyi`; course files untouched |
| Domain | Project 1–N Item; Project 1–N Listing; Item 1–N Offer N–1 Listing (bundle ads = one Listing, several Offers) |
| Status split | negotiation status on **Listing**, fit status on **Offer**, sourcing status on **Item** |
| Users | single user, no auth |
| Money | amount + ISO currency per price, totals grouped per currency, no FX |
| API | ASP.NET Core **controllers** in `BOMKeeper.Api` |
| Launch | **.NET Aspire AppHost**: one `dotnet run` starts the Postgres 17 container and the API; the API serves the pre-built Angular app |
| FE | Angular 22.2 + Angular Material, **Vitest** (Angular's built-in runner; Jest dropped) |
| Tests | BLL unit (xUnit), **API integration (xUnit + WebApplicationFactory + Testcontainers PG17)**, FE unit (Vitest), E2E smoke (Playwright) |
| Parallelism | contract-first: OpenAPI contract approved in the spec, then BE and FE makers run **in parallel** on disjoint folders |
| Checkers | cross-vendor: `codex exec review` with repo role prompts |
| Models | **planning:** Opus 5.5, high effort · **implementation (makers):** Opus 5.5, low effort · **reviews (checkers):** Astra 6, high effort |
| UI language | English (my default, easy to change) |
| Process | **TDD** per task (checks from spec scenarios, red → green → refactor, red run saved as evidence); **every checker review logged**; **every retry-limit stop logged** (declared in AGENTS.md Boundaries 2026-09-28) |

## Issues in the current AGENTS.md, and how they get fixed

1. **The skills it names are not installed anywhere** (`~/.claude/skills`, `~/.codex/skills`, repo).
   Vendor them into the repo so every tool and every clone has them:
   - `angular-developer` and `angular-new-app` from the official `angular/skills`;
   - `dotnet-best-practices` and `dotnet-design-pattern-review` from `github/awesome-copilot`;
   - `dotnet-backend-patterns` from `wshobson/agents`.

   Record their sources and hashes in `skills-lock.json`.
2. **Skill conflicts.** awesome-copilot `dotnet-best-practices` prescribes MSTest + FluentAssertions,
   ResourceManager localization and Semantic Kernel. AGENTS.md gets an explicit rule: *AGENTS.md
   wins over any skill*. The overrides are xUnit, plain `Assert`, no localization and no SK.
   FluentAssertions v8 is also commercially licensed, so it is avoided.
3. **Jest does not match Angular 22.** The official builder supports Vitest and Karma only. Switch to
   Vitest.
4. **"APIs in the root project" is ambiguous.** Rename it: `BOMKeeper.Api` is the HTTP host and
   composition root, and it contains the controllers. `BOMKeeper.AppHost` is only the launcher.
   State the allowed reference direction explicitly and enforce it with a test.
5. **Boundaries aren't enforced, only stated.** Add a git `pre-commit` hook (works in every tool)
   that runs the full check. Add a tool-level deny on `git commit` / `git push` for agents. Agents
   write the proposed commit message to a file, and you commit.
6. **"Build and test commands: extend later".** Fill this in with the real commands once they exist
   (phase 3).
7. **"Keep docs up to date" is vague.** Make it part of the definition of done: every change goes
   through an OpenSpec change that is archived into `openspec/specs`, plus docs/ADR updates.
8. Fix typos ("Teck", "accross", "succeded") and keep AGENTS.md short (~80 lines). Detail goes in
   `docs/` and `openspec/`, linked from AGENTS.md.

## Target layout

```
submissions/kyrylo-tsekhanovskyi/
  AGENTS.md                  # canonical rules for all tools (moved from repo root)
  CLAUDE.md                  # "@AGENTS.md" + Claude-only notes
  README.md                  # what it is, how to run, how it was built agentically
  package.json               # task runner only: check[:be|:fe], build:fe, start, e2e, review:be|fe, skills:sync, setup
  skills-lock.json
  .agents/skills/            # canonical vendored skills (Codex AND Antigravity read .agents/skills)
  .agents/roles/             # tool-neutral role prompts: be-maker, fe-maker, be-checker, fe-checker, harness-checker
  .agents/hooks.json         # Antigravity hooks (Antigravity also reads AGENTS.md directly; no .agent/ folder needed)
  .agents/workflows/         # OpenSpec /opsx-* workflows for Antigravity (generated by openspec init)
  .claude/                   # adapters: settings.json (allow/ask/deny + hooks), agents/*.md, skills/ (synced), commands/opsx
  .codex/config.toml         # project Codex defaults (checker model, read-only sandbox)
  .codex/hooks.json          # Codex hooks (loaded only after the project is trusted)
  .githooks/pre-commit       # runs `npm run check` when staged files are in this folder
  scripts/*.mjs              # cross-platform Node scripts: check, review, skills-sync, setup, hooks
  openspec/                  # project config, specs/<capability>/spec.md, changes/ (incl. contracts/openapi.yaml)
  docs/architecture.md, docs/adr/NNNN-*.md, docs/autonomy-log.md (copied from course template)
  docs/reviews/<date>-<scope>-<role>.md   # full checker reports, committed (never gitignored)
  docs/logs/reviews.md                    # append-only ledger: one row per review
  docs/logs/retry-stops.md                # append-only ledger: one entry per retry-limit stop
  backend/BOMKeeper.slnx
    src/BOMKeeper.Entities         # POCO entities + enums, no references
    src/BOMKeeper.DAL              # DbContext, EF configs, migrations, repositories → Entities
    src/BOMKeeper.BLL              # services, input/result types, validation, domain rules → DAL, Entities
    src/BOMKeeper.Api              # HTTP host: controllers, DTOs (Contracts/), DI, ProblemDetails, OpenAPI, SPA hosting (wwwroot, gitignored)
                                   #   → BLL, ServiceDefaults (+DAL for DI registration only)
    src/BOMKeeper.ServiceDefaults  # Aspire: health checks, OpenTelemetry, resilience
    src/BOMKeeper.AppHost          # Aspire launcher: Postgres 17 container + Api. No business code
    tests/BOMKeeper.BLL.Tests              # xUnit unit tests + architecture (reference-direction) test
    tests/BOMKeeper.Api.IntegrationTests   # WebApplicationFactory + Testcontainers postgres:17
  frontend/                  # single Angular app (Material, Vitest, ESLint, Prettier)
    e2e/                     # Playwright smoke
```

Everything tool-specific is a thin adapter that points at `AGENTS.md`, `.agents/roles` and
`.agents/skills`. Nothing tool-specific is canonical.

## Database and launch

- **Dev DB:** Aspire runs `postgres:17` in Docker. The AppHost defines
  `AddPostgres("pg").WithDataVolume("bomkeeper-data").AddDatabase("bomkeeper")`, and the Api is set
  up with `.WithReference(db).WaitFor(db)`. The connection string is injected as
  `ConnectionStrings__bomkeeper`, so no ports or passwords need to be managed by hand. Your native
  PG13 service on 5432 is left alone.
- **Migrations:** EF Core code-first in `BOMKeeper.DAL`. The Api applies them on startup when
  `ASPNETCORE_ENVIRONMENT=Development`. `dotnet ef migrations add` is a documented script.
- **SPA hosting:** Angular `outputPath: { base: "../backend/src/BOMKeeper.Api/wwwroot", browser: "" }`.
  The Api uses `UseStaticFiles()` and `MapFallbackToFile("index.html")`, and `/api/**` is excluded
  from the fallback.
- **One-command launch:** `npm run build:fe` once (or after FE changes), then
  `npm run start` = `dotnet run --project backend/src/BOMKeeper.AppHost`. You get the API + UI on
  one URL plus the Aspire dashboard.
- **FE hot reload** is still available: `ng serve` with a proxy for `/api` to the running Api.
- **Tests** never touch the dev DB. Integration tests start their own `postgres:17` via
  Testcontainers.
- **Prerequisite, documented in the README:** Docker Desktop must be running for `start`, `check`
  and `e2e`. The check script detects a stopped daemon and says so, instead of failing obscurely.
  It is currently not running on this machine.

## MVP-1 domain (goes into OpenSpec specs)

- **Project**: name, description, createdAt. Summary: item counts by status; per-currency total of
  chosen offers; items with no chosen offer.
- **Item**: projectId, name, quantity (≥1), notes, status `Needed | Sourcing | Ordered | Received`.
- **Listing**: projectId, url, platform (free text with UI suggestions), sellerName, sellerContact,
  status `Found → Contacted → Negotiating → Agreed → Purchased → Received | NotResponding | Declined | Scam`,
  agreedTotal? + currency, notes, statusChangedAt. Any transition is allowed in MVP-1. History
  comes later.
- **Offer**: itemId, listingId, askingPrice? / agreedPrice? (amount + currency, the price for this
  item from this listing), fit `Unverified | Fits | NotQuiteRight | WrongItem`, isChosen.
- **Rules (BLL, unit-tested):** an Offer's Item and Listing belong to the same Project; at most one
  chosen Offer per Item; an item cannot be linked to the same Listing twice; prices ≥ 0; ISO
  currency code; deleting a Listing deletes its Offers.
- **Not in MVP-1:** auth, FX, status history, a separate Seller entity with a scammer flag across ads,
  scraping ad URLs, attachments. Each becomes an OpenSpec change later.

## Parallel BE / FE work (contract-first)

1. **The spec phase produces the contract.** `openspec/changes/add-mvp1-core-tracking/contracts/openapi.yaml`
   holds every route, DTO, enum and ProblemDetails error shape. You approve it together with the
   spec.
2. **Tasks are split** in `tasks.md` into `## Backend` and `## Frontend` sections. Each maker ticks
   only its own section, so they don't conflict.
3. **The makers run concurrently.** One orchestrator session dispatches `be-maker` and `fe-maker` as
   background subagents. Each one:
   - may write only in its own folder (`backend/` or `frontend/`);
   - treats `openspec/**` and `AGENTS.md` as read-only; a contract change is escalated to you, not
     edited.

   This also works as two separate sessions or tools, each in its own git worktree.
4. **Each side is held to the contract independently:**
   - BE: an integration test fetches `/openapi/v1.json` from the running test host and compares it
     with the approved contract. Any drift fails the test.
   - FE: TS types are generated from the same `openapi.yaml` (`openapi-typescript`, a dev
     dependency). HTTP services are unit-tested with `HttpTestingController`, so the FE doesn't need
     a running BE.
5. **Sync point:** when both sides are green, run the full `npm run check`, `npm run e2e`, and both
   checkers (`review:be` and `review:fe` run in parallel too).

## Harness details

- **Model policy** (written into AGENTS.md so every tool sees it, and pinned in each adapter):

  | Role | Model | Effort | Where it's pinned |
  |---|---|---|---|
  | Planning / orchestration (OpenSpec proposal, design, contract, task split) | Opus 5.5 (`claude-opus-5-5`) | high | the planning session; CLAUDE.md note ("use plan mode + high effort for `/opsx` proposals") |
  | `be-maker`, `fe-maker` (implementation per approved plan) | Opus 5.5 (`claude-opus-5-5`) | low | `.claude/agents/*-maker.md` frontmatter `model` + `effort` |
  | `be-checker`, `fe-checker` (reviews) | Astra 6 | high | `.codex/config.toml` checker profile (`model`, `model_reasoning_effort="high"`), passed by `scripts/review.mjs` |

  Low effort for makers is safe only because the plan, contract and tests constrain them. If a
  maker hits the 5-failed-attempts stop, the orchestrator retries that task at high effort and logs
  it in the autonomy log (a deliberate level change, which is good evidence).
  The Astra 6 model id is `gpt-6-astra` (verified in phase 1; it is the Codex CLI default on this
  machine). If it isn't reachable there, only the runner in `scripts/review.mjs`
  changes; the role prompts stay the same.
- **TDD, checks before code** (every task, both makers):
  1. **Checks first.** Write the tests for the task from its OpenSpec scenarios (BLL unit,
     API integration, Vitest, or Playwright, whichever level the scenario needs). No production code
     yet, apart from the minimal stubs needed to compile.
  2. **Red.** Run `npm run check:be|fe -- --red <task-id>`. The script requires the new tests to
     fail for the right reason: a compile error in the test itself doesn't count. It saves the output
     to `openspec/changes/<change>/evidence/<task-id>-red.txt`.
  3. **Green.** Implement until the scoped check passes.
  4. **Refactor** with the check still green. Tick the task in `tasks.md`.

  `tasks.md` is written in this shape in phase 2, one checks sub-task before each implementation
  sub-task. The checkers verify that every ticked task has a red evidence file and that the tests
  cover the task's scenarios. Tests and code land in the same green commit, so the commit gate needs
  no exception.
- **Maker agents** (`be-maker`, `fe-maker`) run in Claude Code as `.claude/agents/*.md`, generated
  from `.agents/roles/*`. Each one:
  - loads its stack skills;
  - follows the TDD loop above;
  - loops on its scoped check until green, stopping after 5 failed attempts;
  - never commits.
- **Retry-limit stops are logged, always.** A stop can come from the maker's 5 failed attempts,
  the Claude Stop hook's 3 re-entries, or a checker run that fails twice. Before anything else,
  `node scripts/log-retry-stop.mjs` appends an entry to `docs/logs/retry-stops.md` with:
  - date, agent/role, model + effort, OpenSpec task id;
  - the limit that was hit;
  - the last failing check output (trimmed);
  - what happened next (escalated to high effort / human took over / spec or contract changed).

  The Stop hook calls this script itself when it gives up. The maker role prompt requires it for
  the attempt limit. Each stop also becomes a "Зниження" / "Підвищення" line in the autonomy log.
- **Checker agents** (`be-checker`, `fe-checker`) are started with `npm run review:be|fe`. That runs
  `codex exec review -m gpt-6-astra -c model_reasoning_effort="high" -c sandbox_mode="read-only" -`, with a
  stdin prompt made of the role prompt plus the instruction to review the uncommitted changes in its
  folder, and the OpenSpec change, the contract and the red-evidence files as context. (Phase 1
  finding: `--uncommitted` cannot take custom instructions, and `exec review` has no `-s` flag.) The checker gets the specs, not the
  maker's reasoning.
- **Every review is logged, and committed with the work it reviewed.** `scripts/review.mjs`:
  - writes the full report to `docs/reviews/<date>-<scope>-<role>.md`, including reviews that found
    nothing;
  - appends a row to `docs/logs/reviews.md`: date, scope, reviewer role, model + effort, findings
    by severity, verdict, report link;
  - leaves a Resolution cell (fixed / waived by human + reason / won't fix) for the orchestrator or
    you to fill before the commit.

  A re-review after fixes gets its own row.
- **Hooks:**
  - git `pre-commit` is the universal gate, installed by `npm run setup`, which sets
    `core.hooksPath`; you run it once.
  - Claude adapters: `protect-env` (PreToolUse), an action log (`log-action.mjs` and
    `protect-env.mjs`, written in this project), and a Stop hook that runs the scoped fast
    check and hands failures back to the agent, at most 3 re-entries (loop engineering).
  - Codex: `.codex/hooks.json` with protect-env + the action log (it needs trust via `/hooks`). There's
    no Stop loop, because Codex is the read-only checker here.
  - Antigravity: `.agents/hooks.json` with protect-env + the action log.
- **OpenSpec:** `openspec init --tools claude,codex,antigravity` inside the subfolder (OpenSpec 1.13.x
  is installed). Capabilities are `projects`, `items`, `listings`, `offers`. The first change is
  `add-mvp1-core-tracking`, with proposal, design, `contracts/openapi.yaml`, tasks and spec deltas.
- **Commit protocol:**
  1. `npm run check` is green.
  2. Checker findings are resolved or explicitly waived by you, and the Resolution cells in
     `docs/logs/reviews.md` are filled in.
  3. The agent writes `.agent-work/COMMIT_MSG.md` (Conventional Commit plus an extensive body:
     what, why, evidence; no Co-Authored-By trailer).
  4. You review and run `git commit -F .agent-work/COMMIT_MSG.md`.

## Backend conventions

- .NET 10 / C# 14, Aspire 13.
- `Directory.Build.props`: Nullable, ImplicitUsings, `TreatWarningsAsErrors`,
  `AnalysisLevel=latest-recommended`, `EnforceCodeStyleInBuild`. Plus `.editorconfig` and
  `dotnet format --verify-no-changes`.
- EF Core 10 + Npgsql. Controllers stay thin: validation happens in the BLL, and errors map to
  ProblemDetails. OpenAPI comes from the built-in `Microsoft.AspNetCore.OpenApi`.
- Manual DTO mapping (no AutoMapper, which is now commercial).
- REST routes:
  - `/api/projects[/{id}]`
  - `/api/projects/{id}/items`
  - `/api/projects/{id}/listings`
  - `/api/items/{id}/offers`
  - `PATCH` for status changes and choosing an offer.
- **Integration tests:**
  - one Testcontainers `postgres:17` per test collection, with state reset between tests;
  - they cover controllers, EF mappings, migrations, cascade deletes, ProblemDetails shapes and the
    contract-drift test.

## Frontend conventions

- Angular 22.2 standalone components with signals (angular-developer skill), created via
  angular-new-app.
- Angular Material.
- Types generated from the contract, with typed `HttpClient` services per resource.
- Screens:
  - project list;
  - project detail (items table with chosen offer and status chips; listings tab);
  - item detail (its offers);
  - listing detail (its offers across items).
- ESLint via angular-eslint, Prettier, Vitest.

## Execution phases (each ends with checker review, then your commit)

0. **Reshape. DONE** (commit `5894f4f`). Branch `kyrylo-tsekhanovskyi` created, `AGENTS.md` moved
   into `submissions/kyrylo-tsekhanovskyi/`, autonomy log started, Claude Code permissions added
   (`.claude/settings.json`, plus a local root mirror). On 2026-09-28 the TDD, review-log and
   retry-stop rules were added to AGENTS.md Boundaries as a phase 0 follow-up commit.
1. **Harness. DONE 2026-09-29** (three harness reviews logged, 14 findings fixed; see
   `docs/logs/reviews.md`). Rewrite AGENTS.md (fixes above; keep the three process rules) and add:
   - CLAUDE.md;
   - vendored skills + lock + sync script;
   - role prompts and adapters (the maker prompts include the TDD loop and the retry-stop logging
     duty);
   - hooks (the Stop hook calls `log-retry-stop.mjs` when it gives up);
   - `package.json` scripts, including `check:* -- --red <task>`, `review:*` (writes the report +
     ledger row) and `log-retry-stop.mjs`;
   - `docs/logs/reviews.md` and `docs/logs/retry-stops.md` with their table headers;
   - `.codex/config.toml`, OpenSpec init, and `.gitignore` additions (`wwwroot/`).

   Add ADRs for the decisions made so far: Listing model, currency, no auth, controllers, Aspire,
   Vitest, contract-first parallelism, Codex checkers, TDD + logging. The harness is itself
   reviewed with `review` and logged, as the first ledger row.
2. **Spec first (SDD). DONE 2026-09-29** (commit `9967c6e`; spec review logged; the decisions made
   in planning: manual item status, unit price × quantity, auto-switch when choosing, and
   `review:spec`). Write the `add-mvp1-core-tracking` change: proposal, design, spec deltas
   and `contracts/openapi.yaml`. Every requirement gets testable scenarios, which become the checks.
   `tasks.md` has BE/FE sections, and each task is split into "write checks (red)" → "implement
   (green)" → "refactor". Run `openspec validate --strict`. **You review and approve before any
   code.**
3. **Walking skeleton (sequential, shared plumbing). DONE 2026-09-30** (tasks 1.1–1.10; Aspire
   13.5.4, Central Package Management, LF line endings, and TypeScript 6 with a scoped override for
   openapi-typescript; be/fe/harness reviews logged).
   - Backend: solution with all 6 src projects + 2 test projects, analyzers, AppHost with Postgres,
     first migration, `/api/health`, and one integration test against Testcontainers.
   - Frontend: app shell + Material, building into Api `wwwroot`, contract type generation.
   - Playwright configured.
   - `npm run start` serves the UI from the Api, and `npm run check` is green end to end. Fill in
     AGENTS.md "Build and test commands".
4. **Features, in parallel, TDD. DONE 2026-10-01** (be-maker: tasks 2–7, 5.6–5.7, 14; fe-maker: 8–12, 15;
   the be and fe reviews were logged and their 9 P2 findings fixed through tasks 14/15; the special
   currency codes are excluded by the human's decision; then a visual review, UI polish in tasks 16–18,
   and `npm run screens`, which made the visual review a permanent definition-of-done step).
   be-maker handles the entities, DAL, BLL rules, controllers and
   integration tests. fe-maker handles the screens and services (Vitest). Every task follows
   checks → red evidence → green → refactor, and both are held to the contract. Sync point: full
   check, then `review:be` and `review:fe`. Both are logged, and findings are resolved or waived in
   the ledger before your commit.
5. **E2E + docs. DONE 2026-10-01** (tasks 13.1–13.4. The flow's red is a mutation check, because
   the feature already existed; the classifier now rejects selector errors. The canonical contract
   moved to `openspec/contracts/` (ADR 0010). README and architecture were verified by a clean clone,
   and the pre-commit hook proof was saved in `docs/evidence/`. The change is archived (70 scenarios in
   `openspec/specs`). The rebuild check found 14 gaps. The doc gaps were fixed in `docs/architecture.md`;
   the spec wording ones are listed for a follow-up change).
   - Playwright smoke through the AppHost-launched stack: create project → add item → add listing +
     offer → change listing status → choose offer → summary shows the total.
   - Write README run instructions and `docs/architecture.md`.
   - `openspec archive add-mvp1-core-tracking` so `openspec/specs` holds the full MVP-1 behaviour.
   - Rebuild check: a fresh agent session, given only `openspec/specs` + `docs/` + AGENTS.md, can
     explain how to rebuild each module. Fix any gaps it finds.
6. **Capstone PR.** Open a PR to the course repo with the course template filled in, the video,
   and evidence links: commits, reviews, autonomy log, loop runs, parallel-run logs.

## Verification (MVP-1 definition of done)

- With Docker Desktop running, `npm run check` passes with:
  - `dotnet build` with zero warnings;
  - `dotnet format --verify-no-changes`;
  - `dotnet test` (BLL unit + API integration incl. the contract test);
  - `ng lint`, `prettier --check`, `ng test` and `ng build`.
- `npm run build:fe && npm run start` shows the UI and API on one URL, with Postgres in the Aspire
  dashboard. Data survives a restart (volume).
- `npm run e2e` passes.
- Manual: create "Solar station", add inverter + battery, add one OLX bundle listing linked to
  both, mark one offer `WrongItem`, set the listing to `Negotiating`, choose the other offer, and
  see the per-currency total.
- `openspec validate --strict` is clean, and specs are archived.
- The pre-commit hook blocks a commit when a test fails. Prove it once and log it in the autonomy
  log as evidence.
- Every ticked task in `tasks.md` has an `evidence/<task-id>-red.txt` that shows the task's tests
  failing. A small script check lists any tasks without one.
- `docs/logs/reviews.md` has a row, with a report in `docs/reviews/`, for every review run in phases
  1–5, and every row has a Resolution filled in.
- `docs/logs/retry-stops.md` exists. Each stop that happened is recorded there and cross-referenced
  in the autonomy log. An empty ledger is stated explicitly, not left blank.

## Known risks

- **Docker is a hard dependency** for run, integration tests and e2e. It is documented, and the
  scripts check for it upfront.
- **Parallel makers can collide on shared files** (root `package.json`, `.gitignore`). Those are
  created in the skeleton phase and are read-only for makers in phase 4.
- **Adapter formats may differ from what's assumed here.** Antigravity skills/rules paths, Codex
  hook support and the exact Aspire 13 package names get verified against current docs in phase 1,
  before the adapters are written.
