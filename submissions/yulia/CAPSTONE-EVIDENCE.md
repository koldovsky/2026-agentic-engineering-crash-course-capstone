# Varto capstone evidence

Varto is an intentionally small, single-user personal finance tracker. This document lists only Agentic Engineering practices supported by repository artifacts and Git history. It is source material for the final PR description and 1–2 minute demo, not an additional product specification.

## Decision ownership

### Decisions made by the project owner

- Product scope: local-only, manual income and expense transactions, fixed expense categories, one initially selected currency (UAH, USD, or EUR), monthly summaries, editing, and confirmed deletion.
- Explicit exclusions: authentication, backend, cloud sync, bank integrations, budgets, multi-currency conversion, and the other items in [`specs/product.md`](specs/product.md).
- Persistence and privacy: browser `localStorage`; financial data must not be sent to external services.
- Overflow behavior: reject a create or edit that would make a monthly aggregate unsafe, preserving the previous state.
- Technical boundaries: React, TypeScript, Vite, npm, Vitest, React Testing Library, Playwright, plain CSS, no UI framework, no backend, and current stable Google Chrome as the reference browser.
- Process: approve the specification and plan before implementation, accept work milestone by milestone, and require independent review findings to be fixed before approval.

### Decisions made by the agent within those constraints

- Proposed the small component/domain/storage structure documented in [`specs/implementation-plan.md`](specs/implementation-plan.md).
- Represented money as integer minor units and calendar dates as `YYYY-MM-DD` strings; kept validation, month filtering, checked aggregation, and immutable transaction operations outside React.
- Used one versioned, validated `localStorage` record with explicit malformed/unavailable-storage recovery.
- Split verification by risk: deterministic domain/storage tests, user-facing component tests, and three cross-layer Playwright acceptance flows.
- Kept the implementation to one screen with no router, global state library, data-fetching layer, backend, or UI framework.

These agent choices remained subject to the approved product contract and implementation plan.

## Supported Agentic Engineering practices

### 1. Specification-driven development

Evidence:

- [`specs/product.md`](specs/product.md) defines the product goal, scope, FR-1–FR-25, NFR-1–NFR-8, AC-1–AC-12, and explicit exclusions.
- [`specs/implementation-plan.md`](specs/implementation-plan.md) maps requirements and acceptance criteria to implementation layers, tests, milestones, and the final quality gate.
- Git order proves the documents preceded production code: `b134967` (product specification), `75eebf5` (agent context), and `b583105` (implementation plan) all precede `924f4f2` (first implementation milestone).
- Review exposed a missing overflow product decision; commit `ce9d47e` records the human-approved behavior in the specification and implements matching checked arithmetic and regression tests rather than silently changing behavior.

### 2. Context engineering

Evidence:

- [`AGENTS.md`](AGENTS.md), committed as `75eebf5` before implementation, defines stable project-wide rules: product-spec authority, scope control, escalation of unresolved decisions, local-only privacy, deterministic business logic, and mandatory verification without weakening tests.
- The same file explicitly separates static context (`AGENTS.md`), the current product contract (`specs/product.md`), and dynamic task instructions supplied per Codex session.
- The milestone and review-fix commits remain inside `submissions/yulia/` and preserve the specified local-only, no-backend boundary.

### 3. Verification

Evidence:

- [`package.json`](package.json) exposes one final gate: `npm run check`, running typecheck, unit/component tests, production build, and Playwright sequentially.
- [`scripts/verify-current.sh`](scripts/verify-current.sh) is a fail-fast harness for the checks applicable at the current milestone; it does not skip or weaken failures.
- [`src/domain/transactions.test.ts`](src/domain/transactions.test.ts), [`src/storage.test.ts`](src/storage.test.ts), and [`src/App.test.tsx`](src/App.test.tsx) cover deterministic calculations, validation, safe-integer limits, persistence/recovery, setup, create/edit/delete behavior, monthly isolation, accessibility-facing validation, and empty states.
- [`e2e/varto.spec.ts`](e2e/varto.spec.ts), added in `d9df417`, contains three critical Chrome flows: setup/create/summary/reload with external-request observation; editing and moving a transaction between months; and validation plus confirmed deletion, reload persistence, and the final empty state.
- Review findings produced regression coverage: `ce9d47e` covers safe aggregate overflow; `36263eb` covers denied `window.localStorage` access and explicit expense-type rendering.
- Fresh verification on 2026-09-29 with the pinned Node 20.19.6 passed: TypeScript check; 3 Vitest files with 85 tests; Vite production build; and 3 Playwright tests in stable Chrome.

### 4. Maker ≠ checker

Evidence:

- Implementation commits were followed by independent review and dedicated corrective commits rather than self-declared completion.
- After Milestone 1 (`924f4f2`), review found contradictory quality-gate timing and unsafe aggregate overflow; `ce9d47e` corrected the plan, product contract, domain/storage implementation, and tests.
- After Milestone 2 (`f4d4c2a`), review found an unhandled `window.localStorage` getter failure and missing explicit `Expense` text; `36263eb` fixed both and added regression tests.
- The final acceptance suite is isolated in `d9df417`, after the feature milestones and reviews.

## Practice deliberately not claimed

**Loop Engineering is not claimed.** The repository contains a useful verification harness, but no executable agent-until-green loop, authentic multi-iteration log, or equivalent defensible evidence. The harness is evidence of Verification only.

Project Factory and a confidence-level log are also not claimed because no supporting artifacts exist.

## Short PR/video summary

Varto was built specification-first: the product contract, durable agent rules, and implementation/verification plan were committed before code. The owner chose the product scope, privacy boundary, stack, and overflow behavior; the agent designed and implemented the smallest structure within those constraints. Verification combines 85 unit/component tests, a production build, and three critical Chrome acceptance flows behind `npm run check`. Independent reviews found real issues—unsafe aggregate overflow, denied storage access, and incomplete transaction rendering—which were fixed in dedicated commits with regression coverage. Loop Engineering is intentionally not claimed because the repository does not contain sufficient evidence for it.
