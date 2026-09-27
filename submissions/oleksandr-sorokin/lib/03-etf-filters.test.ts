/**
 * Acceptance tests for openspec/changes/03-etf-filters/
 * Covers every scenario in specs/etf-filters/spec.md and specs/etf-list/spec.md.
 */
import { describe, expect, it } from "vitest";
import { filterEtfs } from "./filter";
import type { Etf } from "./etf-schema";
import { BASE_ETF } from "./test-fixtures";

const ETFS: Etf[] = [
  {
    ...BASE_ETF,
    ticker: "IWDA",
    name: "iShares Core MSCI World UCITS ETF",
    assetClass: "equity",
    region: "global",
    issuer: "iShares",
    distribution: "accumulating",
    ter: 0.2,
  },
  {
    ...BASE_ETF,
    ticker: "CSPX",
    name: "iShares Core S&P 500 UCITS ETF",
    assetClass: "equity",
    region: "north-america",
    issuer: "iShares",
    distribution: "accumulating",
    ter: 0.07,
  },
  {
    ...BASE_ETF,
    ticker: "VWCE",
    name: "Vanguard FTSE All-World UCITS ETF",
    assetClass: "equity",
    region: "global",
    issuer: "Vanguard",
    distribution: "accumulating",
    ter: 0.22,
  },
  {
    ...BASE_ETF,
    ticker: "AGGH",
    name: "iShares Core Global Aggregate Bond UCITS ETF",
    assetClass: "bond",
    region: "global",
    issuer: "iShares",
    distribution: "distributing",
    ter: 0.1,
  },
  {
    ...BASE_ETF,
    ticker: "XMWO",
    name: "Xtrackers MSCI World Swap UCITS ETF",
    assetClass: "equity",
    region: "global",
    issuer: "Xtrackers",
    distribution: "accumulating",
    ter: 0.15,
    replication: "synthetic",
  },
];

// ── Text search ─────────────────────────────────────────────────────────────

describe("text search", () => {
  // Scenario: Ticker prefix match
  it("returns ETFs whose ticker starts with the search string (case-insensitive)", () => {
    const result = filterEtfs(ETFS, { search: "IW" });
    expect(result.map((e) => e.ticker)).toContain("IWDA");
    result.forEach((e) => {
      const upper = e.ticker.toUpperCase();
      const nameUpper = e.name.toUpperCase();
      expect(upper.startsWith("IW") || nameUpper.includes("IW")).toBe(true);
    });
  });

  // Scenario: Name substring match
  it("returns ETFs whose name contains the search string (case-insensitive)", () => {
    const result = filterEtfs(ETFS, { search: "vanguard" });
    expect(result.map((e) => e.ticker)).toContain("VWCE");
    result.forEach((e) => {
      const nameUpper = e.name.toUpperCase();
      const tickerUpper = e.ticker.toUpperCase();
      expect(nameUpper.includes("VANGUARD") || tickerUpper.startsWith("VANGUARD")).toBe(true);
    });
  });

  // Scenario: No filter params shows full catalogue
  it("returns all ETFs when query is empty", () => {
    const result = filterEtfs(ETFS, {});
    expect(result).toHaveLength(ETFS.length);
  });

  // Scenario: Search term persists in URL (pure logic side: passing search param is respected)
  it.todo("search term in URL param is read and applied on page load (component/integration test)");
});

// ── Asset class multi-select ─────────────────────────────────────────────────

describe("assetClass filter", () => {
  // Scenario: Single asset class selected
  it("shows only ETFs with the selected asset class", () => {
    const result = filterEtfs(ETFS, { assetClass: ["bond"] });
    expect(result.map((e) => e.ticker)).toContain("AGGH");
    result.forEach((e) => expect(e.assetClass).toBe("bond"));
  });

  // Scenario: Multiple asset classes selected
  it("shows ETFs matching any of the selected asset classes (OR within one filter)", () => {
    const result = filterEtfs(ETFS, { assetClass: ["equity", "bond"] });
    const tickers = result.map((e) => e.ticker);
    expect(tickers).toContain("IWDA");
    expect(tickers).toContain("AGGH");
    result.forEach((e) => {
      expect(["equity", "bond"]).toContain(e.assetClass);
    });
  });

  // Scenario: Asset class filter clears when deselected (empty array = no filter)
  it("returns all ETFs when assetClass array is empty", () => {
    const result = filterEtfs(ETFS, { assetClass: [] });
    expect(result).toHaveLength(ETFS.length);
  });
});

// ── Region multi-select ──────────────────────────────────────────────────────

describe("region filter", () => {
  // Scenario: Region filter restricts results
  it("shows only ETFs with the selected region", () => {
    const result = filterEtfs(ETFS, { region: ["north-america"] });
    expect(result.map((e) => e.ticker)).toContain("CSPX");
    result.forEach((e) => expect(e.region).toBe("north-america"));
  });
});

// ── Issuer multi-select ──────────────────────────────────────────────────────

describe("issuer filter", () => {
  // Scenario: Issuer filter restricts results
  it("shows only ETFs from the selected issuer", () => {
    const result = filterEtfs(ETFS, { issuer: ["Vanguard"] });
    expect(result).toHaveLength(1);
    expect(result[0].ticker).toBe("VWCE");
  });
});

// ── Distribution multi-select ─────────────────────────────────────────────────

describe("distribution filter", () => {
  // Scenario: Distribution filter restricts results
  it("shows only ETFs with the selected distribution policy", () => {
    const result = filterEtfs(ETFS, { distribution: ["accumulating"] });
    result.forEach((e) => expect(e.distribution).toBe("accumulating"));
    expect(result.map((e) => e.ticker)).not.toContain("AGGH"); // distributing
  });
});

// ── Max TER ──────────────────────────────────────────────────────────────────

describe("maxTer filter", () => {
  // Scenario: TER threshold excludes more expensive funds
  it("excludes ETFs with TER above the threshold", () => {
    const result = filterEtfs(ETFS, { maxTer: 0.2 });
    result.forEach((e) => expect(e.ter).toBeLessThanOrEqual(0.2));
    expect(result.map((e) => e.ticker)).not.toContain("VWCE"); // ter 0.22
  });

  // Scenario: TER threshold includes ETFs exactly at the boundary
  it("includes ETFs with TER exactly equal to the threshold", () => {
    const result = filterEtfs(ETFS, { maxTer: 0.2 });
    expect(result.map((e) => e.ticker)).toContain("IWDA"); // ter === 0.2
  });
});

// ── Combined filters (AND logic) ─────────────────────────────────────────────

describe("combined filters", () => {
  // Scenario: Two filters applied together
  it("applies all active filters with AND logic", () => {
    const result = filterEtfs(ETFS, {
      assetClass: ["equity"],
      issuer: ["iShares"],
    });
    result.forEach((e) => {
      expect(e.assetClass).toBe("equity");
      expect(e.issuer).toBe("iShares");
    });
    // AGGH is iShares bond — must be excluded
    expect(result.map((e) => e.ticker)).not.toContain("AGGH");
  });

  // Scenario: Filter params forwarded to list query (etf-list spec)
  it("returns empty array when no ETFs match the combination", () => {
    const result = filterEtfs(ETFS, { search: "ZZZNOMATCH99" });
    expect(result).toHaveLength(0);
  });
});

// ── URL / UI scenarios (component-level, not pure logic) ─────────────────────

describe("URL and UI behaviour (component-level)", () => {
  // Scenario: Reset clears all active filters
  it.todo("Reset filters button removes all filter params from the URL");

  // Scenario: Reset preserves sort state
  it.todo("Reset filters button preserves sort params in the URL");

  // Scenario: Shared URL restores filter state
  it.todo("loading a URL with filter params applies those filters to the rendered list");

  // Scenario: Filter change resets pagination to page 1
  it.todo("changing any filter removes or resets the page param to 1");

  // Scenario: Filter params forwarded to list query (page wiring)
  it.todo("etfs page passes filter searchParams to list() and renders only matching rows");
});
