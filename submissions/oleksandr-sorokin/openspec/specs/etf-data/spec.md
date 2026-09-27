# etf-data

## Purpose

Provides the demo ETF data set and the typed repository interface that all list, filter, and detail features depend on.

## Requirements

### Requirement: Seed generator produces deterministic demo data
The system SHALL provide `scripts/generate-seed.mjs` that generates `~40` ETF records and writes them to `data/etfs.json`. Running the script with the same fixed seed MUST always produce identical output. The script MUST NOT call any external API or network resource.

#### Scenario: Deterministic output
- **WHEN** the generator script is run twice with no code changes
- **THEN** `data/etfs.json` is byte-for-byte identical on both runs

#### Scenario: No network calls
- **WHEN** the generator runs without network access
- **THEN** it completes successfully and produces valid output

### Requirement: ETF records conform to the canonical schema
Every record in `data/etfs.json` SHALL conform to `EtfSchema` as defined in `lib/etf-schema.ts`. Fields: `ticker` (uppercase), `name`, `issuer`, `assetClass`, `region`, `currency` (ISO 4217, 3 chars), `ter` (0–5 %), `aum` (positive number, million USD), `inceptionDate` (ISO date), `distribution` (accumulating | distributing), `replication` (physical | synthetic | sampling), `return1y`, `return3y`, `return5y` (decimal fractions), `volatility1y` (non-negative decimal), `prices` (array of exactly 252 daily-price objects), `holdings` (up to 10 objects with `name` and `weight`), `sectorWeights`, `countryWeights` (arrays of label+weight objects).

#### Scenario: Valid record shape
- **WHEN** `data/etfs.json` is parsed with `EtfSchema`
- **THEN** every record passes validation without error

#### Scenario: Prices cover ~1 trading year
- **WHEN** a record's `prices` array is inspected
- **THEN** it contains exactly 252 entries each with a valid ISO date and a positive price

### Requirement: Repository fails loudly on corrupt data
`lib/etf-repository.ts` SHALL validate `data/etfs.json` against `EtfSchema` on the first import. If any record fails validation the module MUST throw an error before any query function is called.

#### Scenario: Corrupt file throws on load
- **WHEN** `data/etfs.json` contains a record that violates the schema
- **THEN** importing `etf-repository` throws a descriptive error

### Requirement: Repository list function filters and paginates
`list(query: ListQuery)` SHALL return a `ListResult` containing `items`, `total`, `page`, and `pages`. Filtering by `search`, `assetClass`, `region`, `issuer`, `distribution`, and `maxTer` MUST be applied before pagination. Default page size is 20; pages are 1-based.

#### Scenario: Unfiltered list returns first page
- **WHEN** `list({})` is called
- **THEN** `items.length` is at most 20, `total` equals the full ETF count, and `page` is 1

#### Scenario: Search filter narrows results
- **WHEN** `list({ search: "IWDA" })` is called
- **THEN** only ETFs whose ticker starts with or whose name contains "IWDA" are returned

#### Scenario: maxTer filter excludes expensive ETFs
- **WHEN** `list({ maxTer: 0.2 })` is called
- **THEN** every returned ETF has `ter <= 0.2`

#### Scenario: Pagination advances correctly
- **WHEN** `list({ page: 2, pageSize: 10 })` is called
- **THEN** `items` contains records 11–20 (if they exist) and `page` equals 2

### Requirement: Repository getByTicker returns exact match or null
`getByTicker(ticker: string)` SHALL return the single `Etf` whose `ticker` matches (case-insensitive) or `null` when no such ETF exists.

#### Scenario: Known ticker returns the ETF
- **WHEN** `getByTicker("IWDA")` is called and "IWDA" is in the data set
- **THEN** the returned object has `ticker === "IWDA"`

#### Scenario: Unknown ticker returns null
- **WHEN** `getByTicker("UNKNOWN")` is called
- **THEN** the return value is `null`
