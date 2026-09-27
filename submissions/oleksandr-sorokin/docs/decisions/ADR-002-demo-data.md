# ADR-002 — Demo data

**Date:** 2026-09-26  
**Status:** accepted  
**Decider:** Alex

---

## Context

The app needs ETF data to display. Options are:

1. Fetch live data from a public API (e.g. Yahoo Finance, Morningstar, LSEG).
2. Use a static JSON file checked into the repo.
3. Generate a static JSON file from a seeded script, also checked in.

---

## Decision

Option 3: generate `data/etfs.json` once from `scripts/generate-seed.mjs` with a fixed seed,
and commit the result. The generator is not run at runtime or at build time.

Names and tickers are modelled on popular iShares funds (e.g. "iShares Core MSCI World UCITS ETF",
ticker "IWDA") so the data feels familiar to a retail investor. All numerical values are invented.

The generator may be extended in a later step by accepting a natural-language prompt — this keeps
the interface clean without changing v1 app code.

---

## Rationale

| Concern | Why this approach handles it |
|---|---|
| No live API key needed | The app works offline and in CI with zero secrets |
| Reproducible | Same seed → same file every run; no flaky tests from data drift |
| No legal / ToS risk | No real financial data; "Demo data — not investment advice" banner covers it |
| Familiar to users | iShares names are recognisable to the target persona |
| Extensible | The generator is a separate script; future prompts can add ETFs without touching the app |

---

## Shape

~40 ETFs covering a spread of asset classes, regions, and issuers.
Full field list in [data-model.md](../data-model.md).
Prices: a 252-day random walk; returns and volatility derived from that walk (not independent).

---

## Validation

`lib/etf-repository.ts` parses `data/etfs.json` through `EtfSchema` (Zod) on first import.
A schema violation throws at startup, not at runtime — so a broken data file fails loudly during
`pnpm check` rather than silently serving bad data.

---

## Alternatives considered

| Alternative | Reason not chosen |
|---|---|
| Live API | Requires secrets; rate-limited; data changes between runs; ToS risk |
| Hand-crafted JSON | Tedious for 40 ETFs; errors in prices; hard to maintain |
| Database | Out of scope for v1; no persistence needed |
