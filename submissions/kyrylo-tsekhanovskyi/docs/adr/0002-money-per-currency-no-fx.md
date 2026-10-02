# 0002. Money as amount + currency, totals per currency, no FX

- Status: accepted · Date: 2026-09-27 · Decided by: human

## Context
Parts are bought in UAH, EUR, PLN and USD from different platforms. Exchange rates change and would
need an external source.

## Decision
Every price is `amount` (decimal, ≥ 0) + `currency` (an ISO 4217 code). Project totals are grouped per
currency. There is no conversion.

## Consequences
- The data is simple and deterministic, with no external dependency.
- The user sees several totals ("1 200 UAH + 85 EUR") instead of a single number. FX can be added as a
  later change on top of the stored data.
