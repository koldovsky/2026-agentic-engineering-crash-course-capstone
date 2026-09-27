# Data model

---

## Etf type (TypeScript + Zod)

Canonical definition lives in `lib/etf-schema.ts`.
`data/etfs.json` is validated against this schema on every cold import.

```ts
// lib/etf-schema.ts (canonical — this doc mirrors it)
import { z } from 'zod';

export const AssetClassSchema = z.enum([
  'equity', 'bond', 'commodity', 'real-estate', 'multi-asset',
]);

export const RegionSchema = z.enum([
  'europe', 'north-america', 'global', 'asia-pacific', 'emerging-markets',
]);

export const DistributionSchema = z.enum(['accumulating', 'distributing']);

export const ReplicationSchema = z.enum(['physical', 'synthetic', 'sampling']);

export const HoldingSchema = z.object({
  name: z.string(),
  weight: z.number().min(0).max(100),   // percent
});

export const WeightSchema = z.object({
  label: z.string(),
  weight: z.number().min(0).max(100),   // percent
});

export const DailyPriceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),  // ISO date
  price: z.number().positive(),
});

export const EtfSchema = z.object({
  ticker:        z.string().toUpperCase(),
  name:          z.string(),
  issuer:        z.string(),
  assetClass:    AssetClassSchema,
  region:        RegionSchema,
  currency:      z.string().length(3),              // ISO 4217
  ter:           z.number().min(0).max(5),          // annual %, e.g. 0.07
  aum:           z.number().positive(),             // million USD
  inceptionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  distribution:  DistributionSchema,
  replication:   ReplicationSchema,
  return1y:      z.number(),                        // decimal, e.g. 0.12 = 12%
  return3y:      z.number(),
  return5y:      z.number(),
  volatility1y:  z.number().nonnegative(),
  prices:        z.array(DailyPriceSchema).length(252), // ~1 trading year
  holdings:      z.array(HoldingSchema).max(10),
  sectorWeights: z.array(WeightSchema),
  countryWeights: z.array(WeightSchema),
});

export type Etf = z.infer<typeof EtfSchema>;
```

---

## Repository interface

```ts
// lib/etf-repository.ts interface contract

export type ListQuery = {
  search?:       string;                  // ticker prefix or name substring
  assetClass?:   AssetClass[];
  region?:       Region[];
  issuer?:       string[];
  distribution?: Distribution[];
  maxTer?:       number;
  sortBy?:       SortField;
  sortDir?:      'asc' | 'desc';
  page?:         number;                  // 1-based
  pageSize?:     number;                  // default 20
};

export type ListResult = {
  items: Etf[];
  total: number;
  page:  number;
  pages: number;
};

export interface EtfRepository {
  list(query: ListQuery): ListResult;
  getByTicker(ticker: string): Etf | null;
}
```

`SortField` covers: `ticker | name | ter | aum | return1y | return3y | return5y | volatility1y`.

---

## Seed generator contract (`scripts/generate-seed.mjs`)

- Deterministic: same seed string → same `data/etfs.json` every run.
- Source names from real iShares fund families (e.g. "iShares Core MSCI World UCITS ETF").
- Does not call any external API; all values are computed from a PRNG.
- Output: a JSON array of `~40` objects conforming to `EtfSchema`.
- Prices: a random walk from a plausible starting NAV over 252 trading days.
- Returns and volatility derived from the generated price series (not independent random).

---

## `data/etfs.json` — constraints

- Committed to the repo; not regenerated at runtime.
- If the schema changes in a breaking way, delete the file and re-run the generator.
- Never hand-edit; the Zod validation will catch shape errors on load.

---

## Filter and sort functions

`lib/filter.ts` exports `filterEtfs(etfs: Etf[], query: ListQuery): Etf[]`  
`lib/sort.ts` exports `sortEtfs(etfs: Etf[], sortBy: SortField, sortDir: 'asc'|'desc'): Etf[]`

Both are pure (no side-effects, no imports from React or Next.js).
Unit tests live next to the file (`lib/filter.test.ts`, `lib/sort.test.ts`).
