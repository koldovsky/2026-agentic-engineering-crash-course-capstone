# Design

## Context

See proposal.md — Why. The project has no data layer yet. `docs/data-model.md` already defines the canonical Zod schema and repository interface contract; this design makes them real.

## Goals / Non-Goals

**Goals:**
- Implement `lib/etf-schema.ts` (Zod schema + TS types) exactly as specified in `docs/data-model.md`.
- Implement `scripts/generate-seed.mjs` that produces a deterministic, commit-ready `data/etfs.json`.
- Implement `lib/etf-repository.ts` that validates on load and satisfies the `list()` / `getByTicker()` contract.
- Ship Vitest unit tests covering all repository behaviours specified in the spec.

**Non-Goals:**
- No UI, no routes, no React components.
- No runtime caching or database — the JSON file is the store.
- Prices are a simple random walk; statistical realism is not required.

## Decisions

### Zod for schema validation
**Decision**: Use Zod (already a transitive dependency via `@fission-ai/openspec`) as the validation layer, and add it explicitly as a production dependency.  
**Why**: `data/etfs.json` is validated once on cold import; Zod gives clear error messages when a record is malformed. Alternatives (hand-written type guards, `ajv`) add more code for no gain.

### Module-level eager validation in etf-repository
**Decision**: Parse and validate the entire JSON array once at module load time (top-level `await` in a Server Component context, or a synchronous `JSON.parse` + `z.array(EtfSchema).parse(...)` at module scope).  
**Why**: Fails loudly at startup rather than at query time, making data corruption obvious immediately. The data set is ~40 records (~small); there is no measurable startup cost.

### Pure functions for filter and sort in lib/
**Decision**: `list()` delegates to `filterEtfs()` and `sortEtfs()` in `lib/filter.ts` and `lib/sort.ts` (pure, no React/Next imports), which are tested independently.  
**Why**: Keeps `etf-repository.ts` thin and makes filter/sort logic independently testable. Matches the architecture convention.

### PRNG for seed generator
**Decision**: Use a seeded linear-congruential PRNG (no external package) to keep the generator dependency-free.  
**Why**: `scripts/generate-seed.mjs` is a dev utility; adding a package for PRNG is unnecessary. A simple LCG seeded from a fixed string is reproducible and sufficient.

### data/etfs.json committed to the repo
**Decision**: The generated file is committed; the generator is run manually (or in CI) only when the schema changes.  
**Why**: Avoids a build-time side-effect in `next build`. The file is stable until the schema changes.

## Risks / Trade-offs

- **Schema drift**: If `lib/etf-schema.ts` is edited without re-running the generator, `data/etfs.json` will fail Zod validation and break the server on startup. Mitigation: the validation error message names the failing field; `docs/data-model.md` notes to delete and regenerate on breaking schema changes.
- **Prices are synthetic**: The random walk does not reflect real market data. For a demo dashboard this is intentional and acceptable.

## Migration Plan

No migration needed — this is a greenfield addition. If the schema is changed after the data file is committed, delete `data/etfs.json` and re-run `node scripts/generate-seed.mjs`.
