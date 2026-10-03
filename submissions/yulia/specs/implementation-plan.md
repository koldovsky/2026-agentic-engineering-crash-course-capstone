# Varto — Implementation Plan

## Purpose

This plan translates the approved product contract in [`product.md`](product.md) into a deliberately small, verifiable implementation approach. The product specification remains authoritative if this plan and the product behavior ever conflict.

No application code should be implemented until this plan is approved.

## Approved technical decisions

- React with TypeScript
- Vite
- npm
- browser `localStorage` only; no backend
- Vitest and React Testing Library for unit and component verification
- Playwright for a small set of critical end-to-end acceptance flows
- plain CSS with no UI framework
- Google Chrome's current stable version in the development environment as the reference browser
- the current calendar month as the initially selected month
- the browser's native confirmation dialog for transaction deletion
- malformed persisted data is discarded and the application returns to empty initial setup
- a create or edit that would make any monthly aggregate exceed the safe-integer range is rejected, leaving the previous state unchanged
- no linter in the initial toolchain

The project-level quality gate will use TypeScript checking, unit/component tests, a production build, and Playwright. Adding other frameworks, services, state libraries, routers, or tooling requires a demonstrated need rather than being included preemptively.

## Deliberately small application structure

The future implementation should use approximately this structure:

```text
submissions/yulia/
├── e2e/
│   └── varto.spec.ts
├── src/
│   ├── components/
│   │   ├── CurrencySetup.tsx
│   │   ├── MonthlySummary.tsx
│   │   ├── TransactionForm.tsx
│   │   └── TransactionList.tsx
│   ├── domain/
│   │   ├── model.ts
│   │   ├── transactions.ts
│   │   └── transactions.test.ts
│   ├── App.test.tsx
│   ├── App.tsx
│   ├── main.tsx
│   ├── storage.test.ts
│   ├── storage.ts
│   └── styles.css
├── index.html
├── package-lock.json
├── package.json
├── playwright.config.ts
├── tsconfig.json
└── vite.config.ts
```

This is a guide, not a requirement to create abstraction for its own sake. Files may be combined when doing so remains readable and testable. The application needs one screen and local state; it does not need routing, a global state library, a data-fetching library, or a component library.

## Data and domain design

### Domain model

Use narrow TypeScript types derived from the specification:

- `Currency`: `UAH | USD | EUR`
- `TransactionType`: `income | expense`
- `ExpenseCategory`: the eleven fixed categories from `product.md`
- `Transaction`: stable ID, type, positive amount in minor units, `YYYY-MM-DD` calendar date, and an expense category only for expenses
- selected month: `YYYY-MM`

UAH, USD, and EUR all use two fractional digits. Parse user-entered amounts once at the boundary and represent money as integer minor units in the domain and persisted state. This avoids floating-point aggregation errors. Format values for display with the selected currency, without conversion.

Store calendar dates as local date strings rather than JavaScript timestamps. Month membership must be derived from the `YYYY-MM` portion so timezone conversion cannot move a transaction into another day or month.

### Persisted state

Use one namespaced `localStorage` entry containing a small versioned object:

```text
schema version + selected currency + transactions
```

The storage adapter must parse and validate unknown persisted data before returning domain data. Missing storage means first use. Malformed or unsupported stored data is discarded, the bad value is removed, and the application restarts with no currency and no transactions. This recovery path must not invent or partially recover transactions.

Changing currency, schema migration, backup, import, export, and recovery after browser storage is cleared remain out of scope.

## Logic kept independent from React

The following behavior belongs in pure TypeScript functions with no React, DOM, `localStorage`, current-time, or network dependencies:

- amount parsing and validation into integer minor units;
- validation of transaction type, date, and expense category;
- normalization when type changes, including removal of category from income;
- transaction creation/update inputs to validated domain transactions;
- filtering transactions by selected calendar month;
- calculation of income, expenses, balance, and expense totals by category;
- safe-integer validation of monthly aggregates before accepting a create or edit;
- immutable replacement and removal of transactions where useful;
- validation of data decoded from storage.

The current month should be passed into UI state initialization or obtained at a thin application boundary, not read inside calculation functions. IDs may be created at an application boundary and supplied to domain operations so tests remain deterministic.

React is responsible only for rendering, collecting input, maintaining the current UI state, calling domain functions, and coordinating persistence. The storage adapter is responsible only for reading, validating, writing, and clearing the single Varto storage entry.

## Requirement-to-implementation map

| Product requirements | Planned implementation | Primary verification |
|---|---|---|
| FR-1–FR-4 | `CurrencySetup` gates the application until UAH, USD, or EUR is persisted; no currency-change control exists afterward | Component tests and Playwright flow 1 |
| FR-5–FR-10 | `TransactionForm` plus pure validation and amount parsing | Domain unit tests, component tests, Playwright flow 3 |
| FR-11–FR-15 | `TransactionList`, edit mode, immutable domain updates, and native deletion confirmation | Component tests and Playwright flows 2–3 |
| FR-16–FR-22 | Selected-month state, pure month filtering and summary calculation, `MonthlySummary` | Domain unit tests, component tests, Playwright flows 1–2 |
| FR-23–FR-25 | Validating `localStorage` adapter and application hydration | Storage unit tests and Playwright flow 1 |
| NFR-1–NFR-2 | Pure domain functions and deterministic fixtures | Vitest |
| NFR-3–NFR-4 | No backend or external runtime service; no application network calls after load | Dependency review, code review, and Playwright request observation |
| NFR-5–NFR-6 | Field-associated validation, semantic controls, accessible names, keyboard-operable flows, non-color-only feedback | React Testing Library and targeted Playwright checks |
| NFR-7 | Empty-state rendering and malformed-storage recovery | Unit/component tests and Playwright flow 3 |
| NFR-8 | Specification traceability and review against this plan | Review before each milestone is accepted |

## Acceptance-criteria verification map

Every acceptance criterion receives automated coverage at the lowest useful level. Playwright is reserved for three cross-layer flows rather than duplicating every unit and component case end to end.

| Acceptance criterion | Unit/domain | React component | Playwright |
|---|---:|---:|---:|
| AC-1 first-use setup and persistence | Storage validation | Setup gate and locked currency | Flow 1 |
| AC-2 add expense | Amount/domain calculation | Expense form and rendered totals | Flow 1 |
| AC-3 add income without category | Income normalization | Income form and rendered totals | Flow 1 |
| AC-4 reject invalid transactions | Validation matrix | Field errors and no submitted change | Flow 3, representative invalid cases |
| AC-5 calculate selected month | Full calculation example | Summary rendering | Flow 1 |
| AC-6 isolate months | Month filtering | Month selection and list/summary update | Flow 2 |
| AC-7 edit transaction | Update and recalculation | Edit form behavior | Flow 2 |
| AC-8 move transaction between months | Month filtering after update | Affected views update | Flow 2 |
| AC-9 confirm or cancel deletion | Removal operation | Confirmation outcomes | Flow 3 |
| AC-10 restore latest state | Storage round-trip | Hydration without duplication | Flow 1 |
| AC-11 empty month | Zero summary | Empty-state rendering | Flow 3 |
| AC-12 operate locally | No service-dependent domain code | No service-dependent UI behavior | Flow 1 request observation plus code/dependency review |

### Critical Playwright flows

1. **Setup, record, summarize, and restore:** select a currency, add income and an expense, verify totals and category spending, reload, and verify the same currency and data without duplication. Observe that the app makes no unexpected external requests. Covers AC-1, AC-2, AC-3, AC-5, AC-10, and the runtime portion of AC-12.
2. **Select a month and edit:** create transactions in different months, switch months, edit amount/category, then move a transaction to another month and verify both affected summaries. Covers AC-6, AC-7, and AC-8.
3. **Validation, deletion, and empty state:** reject representative invalid input, cancel deletion, confirm deletion, and verify the resulting empty state and zero summary. Covers critical integration behavior from AC-4, AC-9, and AC-11.

Vitest and React Testing Library must cover the fuller input matrix and edge cases; Playwright should not grow into an exhaustive duplicate suite.

## Verification commands and quality gate

The future `package.json` should expose these stable commands:

```text
npm run typecheck   # TypeScript compiler check without emitting files
npm run test:unit   # Vitest unit and component suite in one-shot mode
npm run build       # Vite production build
npm run test:e2e    # Playwright critical flows
npm run check       # runs all four commands above and fails on any failure
```

`npm run check` is the single project-level quality gate and should execute, in order:

```text
npm run typecheck && npm run test:unit && npm run build && npm run test:e2e
```

During Milestones 1–3, a milestone is complete when the focused checks and evidence named for that milestone pass. The full `npm run check` gate becomes required in Milestone 4, after the planned Playwright acceptance flows exist. Do not add placeholder end-to-end tests or bypass Playwright's no-tests failure merely to make the full gate pass early. Test failures must be fixed or escalated; tests must not be weakened, skipped, or bypassed to obtain a green result.

## Implementation milestones

### Milestone 1 — Foundation, domain, and storage

- Create the minimal Vite React TypeScript project and approved verification tooling.
- Define domain types, fixed constants, amount/date validation, month filtering, and summary calculations.
- Implement the validating versioned `localStorage` adapter and malformed-data recovery.
- Add unit tests for calculations, validation, normalization, month boundaries, storage round trips, and invalid stored data.

**Traceability:** FR-3, FR-5–FR-10, FR-13, FR-16–FR-25; AC-4–AC-6, AC-8, AC-10–AC-12.

**Milestone evidence:** typecheck, domain/storage Vitest suite, and production build pass; no UI acceptance is claimed yet.

### Milestone 2 — Setup, create, view, and summarize

- Add initial currency setup with UAH, USD, and EUR only.
- Initialize the current calendar month and provide month selection.
- Add income and expense creation, the selected-month transaction list, empty state, and monthly summary.
- Persist every valid change and hydrate state on reload.
- Add component tests for accessible setup/form controls, validation, rendering, and summary updates.

**Traceability:** FR-1–FR-12, FR-16–FR-25; AC-1–AC-6, AC-10–AC-12.

**Milestone evidence:** focused component tests and all Milestone 1 checks pass; manual behavior matches the covered criteria in current stable Chrome.

### Milestone 3 — Edit and confirmed deletion

- Add edit behavior using the same validation path as creation.
- Ensure type changes normalize category data and date changes update both affected months.
- Add native confirmation for deletion, preserving state on cancel and removing it on confirm.
- Add component tests for edit, cross-month movement, cancel, confirm, persistence, and final empty state.

**Traceability:** FR-12–FR-15 and affected FR-17–FR-23; AC-7–AC-11.

**Milestone evidence:** relevant unit/component tests and the full non-E2E checks pass; manual Chrome verification confirms the native confirmation interaction.

### Milestone 4 — Critical acceptance flows and final quality gate

- Add only the three Playwright flows defined above.
- Check keyboard operation, accessible naming, validation messaging, and non-color-only states across core flows.
- Confirm there are no application calls to external services and no backend dependency.
- Run the complete project-level quality gate and record its output as capstone verification evidence.

**Traceability:** all FR-1–FR-25, NFR-1–NFR-8, and AC-1–AC-12.

**Milestone evidence:** `npm run check` passes in the development environment, including Playwright, followed by a current-stable-Chrome spot-check.

## Technical risks and controls

| Risk | Control |
|---|---|
| Floating-point or safe-integer overflow errors corrupt totals | Parse input to integer minor units, use checked integer arithmetic, and reject creates or edits that would make a monthly aggregate unsafe |
| Timezone conversion assigns a date to the wrong month | Store and compare calendar strings; do not use timestamps for transaction dates |
| Invalid `localStorage` content crashes rendering | Validate unknown data at the storage boundary, discard it, and restart setup safely |
| Storage is cleared or unavailable | Treat cleared data as first use; report storage write failures rather than claiming persistence |
| Edit logic leaves an income category behind | Normalize and validate type-specific data in pure domain code |
| UI and persisted state diverge | Use one application state, persist after successful domain changes, and test reload behavior |
| End-to-end tests become large or brittle | Limit Playwright to three cross-layer flows and cover matrices in Vitest |
| Native confirmation behaves differently in tests | Handle Playwright's dialog event explicitly and test both dismiss and accept paths |
| Current stable Chrome differs from Playwright's bundled Chromium | Use Playwright for automation and perform the specified final Chrome spot-check |
| Accidental network or privacy regression | Keep dependencies client-only, review code/dependencies, and observe requests in the critical E2E flow |

## Remaining decisions requiring human input

None at plan approval time. The product owner has resolved the stack, persistence, verification tools, styling constraint, backend boundary, initial month, deletion mechanism, malformed-storage recovery, quality-gate composition, and absence of a linter.

If implementation exposes a new decision that changes product behavior, scope, privacy, persisted-data handling, the approved toolchain, or acceptance evidence, work on that decision must pause and be escalated to the human. The specification or this plan must be updated and approved before implementing the changed direction.
