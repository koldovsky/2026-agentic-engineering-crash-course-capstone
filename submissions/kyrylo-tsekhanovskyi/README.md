# BOMKeeper

Track the parts of a DIY project (a solar station, a smart home) and the ads that could supply them,
across shops and private sellers (OLX, eBay, Allegro, Rozetka, …), without browser tabs and bookmarks.

- **Projects** with a summary: item counts by status, per-currency totals of the chosen offers
  (unit price × quantity), items still without an offer.
- **Items** you need, with a quantity and a manual sourcing status (Needed → Sourcing → Ordered → Received).
- **Listings** (ads, shop pages) with the seller and the negotiation status (Found, Contacted, Negotiating,
  Agreed, Purchased, Received, Not responding, Declined, Scam).
- **Offers** that link an item to a listing, with asking and agreed unit prices and whether the part fits.
  One bundle ad can offer several items, and you choose one offer per item.

Single user, no login, money kept per currency (no conversion). The behaviour is specified in
[`openspec/specs/`](openspec/specs/), and the decisions are in [`docs/adr/`](docs/adr/).

## Quick start

Prerequisites: **Node 24+**, **.NET 10 SDK**, and **Docker Desktop running**.

```bash
npm run setup                       # once: git pre-commit hook, dotnet-ef, prerequisite check
npm ci --prefix frontend            # once per clone
npm run build:fe                    # build the UI into the Api (again after UI changes)
npm run start                       # Aspire AppHost: PostgreSQL 17 in Docker + the Api
```

Open **http://localhost:5272**: the UI and the API on one URL. The terminal also prints the Aspire
dashboard login link (logs, traces, the Postgres container). Stop with **Ctrl+C**, or `npm run stop`
from another terminal. Your data lives in the Docker volume `bomkeeper-data` and survives restarts.

UI development with hot reload: keep `npm run start` running, run `npm --prefix frontend start`, and
open http://localhost:4200 (`/api` is proxied to :5272).

## Checks

| Command | What it checks |
|---|---|
| `npm run check` | the full gate (also run by the pre-commit hook): harness, backend (build with warnings as errors, `dotnet format`, unit and integration tests against a Testcontainers `postgres:17`) and frontend (API types vs the contract, ESLint, Prettier, Vitest, build) |
| `npm run e2e` | Playwright against the running stack: the smoke test and the full "project to total" flow |
| `npm run screens` | screenshots of every page and dialog at 390, 1280 and 2048 px, for a visual review |

All commands, and the rules for agents, are in [AGENTS.md](AGENTS.md).

## How it was built

BOMKeeper is the capstone of an agentic-engineering course. It was built by AI agents in a harness that
turns the rules into mechanisms, with a human deciding at every gate:

1. **Spec first.** An [OpenSpec change](openspec/changes/) with testable scenarios and an OpenAPI
   contract, reviewed by a cross-vendor checker and approved by the human before any code.
2. **Contract-first parallel makers.** `be-maker` and `fe-maker` (Claude subagents) build the backend and
   the frontend in parallel, on disjoint folders, held to the same contract: a drift test on the
   backend, generated types on the frontend.
3. **TDD with evidence.** Every task's tests run red before any code. The red output is saved and
   checked by the gate.
4. **Cross-vendor review.** Codex (another vendor's model) reviews every phase. Every finding is logged
   and resolved before the commit.
5. **Visual review.** Screenshots at three widths are looked at, not just tested.
6. **Human-only commits** behind a pre-commit gate.

Evidence:
- the plan: [`docs/plan-mvp1.md`](docs/plan-mvp1.md);
- the autonomy log: [`docs/autonomy-log.md`](docs/autonomy-log.md);
- the review ledger: [`docs/logs/reviews.md`](docs/logs/reviews.md);
- the retry-limit stops: [`docs/logs/retry-stops.md`](docs/logs/retry-stops.md);
- the red runs and screenshots, in the change's `evidence/`.

## Layout

```
backend/    .NET 10: Entities ← DAL ← BLL ← Api, plus the Aspire AppHost, ServiceDefaults and tests
frontend/   Angular 22 + Material: the single app, Vitest specs, Playwright e2e and screens
openspec/   specs (behaviour), the contract (openapi.yaml) and changes (proposals, tasks, evidence)
docs/       architecture, ADRs, the plan, review reports and the logs
scripts/    the harness: check, review, stop, hooks (plain Node, tested with node:test)
.agents/    skills and role prompts shared by Claude Code, Codex and Antigravity
```

The architecture is described in [`docs/architecture.md`](docs/architecture.md).
