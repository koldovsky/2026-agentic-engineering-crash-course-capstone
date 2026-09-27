# Tasks

## 1. Zod schema and types

- [x] 1.1 Write failing tests for EtfSchema validation — create `lib/etf-schema.test.ts` with cases for valid records, missing fields, wrong enum values, and wrong price-array length; verify `pnpm test` fails on those cases before any implementation
- [ ] 1.2 Implement `lib/etf-schema.ts` with all Zod schemas and exported TypeScript types as specified in `docs/data-model.md`; verify `pnpm test` passes the schema tests and `pnpm typecheck` exits 0

## 2. Seed generator

- [x] 2.1 Write failing tests for the generator contract — create a test that imports and runs `scripts/generate-seed.mjs` twice and asserts identical JSON output; verify `pnpm test` fails (file does not exist yet)
- [ ] 2.2 Implement `scripts/generate-seed.mjs` using a seeded PRNG; run it to produce `data/etfs.json` (~40 records); verify every record passes `z.array(EtfSchema).parse(...)` and the determinism test passes

## 3. ETF repository

- [x] 3.1 Write failing tests for `etf-repository` — create `lib/etf-repository.test.ts` covering: `list({})` returns ≤20 items with correct total, search filter, `maxTer` filter, page-2 pagination, `getByTicker` hit, `getByTicker` miss, and corrupt-data throws on load; verify `pnpm test` fails (module does not exist yet)
- [ ] 3.2 Implement `lib/etf-repository.ts`: validate `data/etfs.json` on load with `z.array(EtfSchema).parse(...)`; implement `list(query)` delegating filter/sort to `lib/filter.ts` and `lib/sort.ts` (create stubs if not yet present); implement `getByTicker(ticker)` with case-insensitive match; verify all repository tests pass

## 4. Filter and sort stubs

- [x] 4.1 Write failing tests for `filterEtfs` in `lib/filter.test.ts` covering: no-op query, search match, assetClass/region/issuer/distribution multi-select, maxTer boundary; verify `pnpm test` fails
- [ ] 4.2 Implement `lib/filter.ts` exporting `filterEtfs(etfs, query)`; verify filter tests pass
- [x] 4.3 Write failing tests for `sortEtfs` in `lib/sort.test.ts` covering: sort by `ter` asc/desc, sort by `name` asc, stable ordering on equal values; verify `pnpm test` fails
- [ ] 4.4 Implement `lib/sort.ts` exporting `sortEtfs(etfs, sortBy, sortDir)`; verify sort tests pass

## 5. Integration check

- [ ] 5.1 Run `pnpm check` and quote the exit code and test count; all tests must pass, typecheck and lint must be clean
