# Proposal

## Why

The ETF Dashboard needs a stable, validated set of demo ETF records and a typed repository interface before any UI can be built. This change establishes the data layer — seed generator, JSON data file, Zod schema, and repository module — so that all downstream features can depend on a well-defined contract.

## What Changes

- `scripts/generate-seed.mjs` — deterministic seed generator that writes `~40` ETF objects to `data/etfs.json` using a fixed PRNG seed; values derived from iShares fund naming conventions; prices generated as a 252-day random walk; no external API calls.
- `lib/etf-schema.ts` — canonical Zod schema for all ETF field types (`EtfSchema`, `AssetClassSchema`, `RegionSchema`, etc.) and exported TypeScript types.
- `data/etfs.json` — committed output of the generator; never hand-edited; validated on load.
- `lib/etf-repository.ts` — module that loads and validates `data/etfs.json` on cold import (fails loudly on corruption) and exports `list(query: ListQuery): ListResult` and `getByTicker(ticker: string): Etf | null`.

## Capabilities

### New Capabilities

- `etf-data`: Seed generator, Zod schema, and repository module; the contract all list, filter, and detail features depend on.

### Modified Capabilities

*(none — this is greenfield; no existing spec-level requirements change)*

## Impact

- **New files**: `scripts/generate-seed.mjs`, `lib/etf-schema.ts`, `lib/etf-repository.ts`, `data/etfs.json`.
- **Tests**: `lib/etf-repository.test.ts` validates `list()` and `getByTicker()` behaviour against the generated data.
- **Dependencies**: `zod` (already in devDependencies via `@fission-ai/openspec`); must be added as a runtime dependency if not already present.
- **No UI changes** in this step.
