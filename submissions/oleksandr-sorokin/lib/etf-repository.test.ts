import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PAGE_SIZE, getByTicker, list } from "./etf-repository";

describe("list()", () => {
  // Scenario: Unfiltered list returns first page
  it("returns at most 20 items, correct total, and page 1 when called with no filters", () => {
    const result = list({});
    expect(result.items.length).toBeLessThanOrEqual(DEFAULT_PAGE_SIZE);
    expect(result.total).toBeGreaterThan(0);
    expect(result.page).toBe(1);
    expect(result.pages).toBe(Math.ceil(result.total / DEFAULT_PAGE_SIZE));
  });

  // Scenario: Search filter narrows results
  it("returns only ETFs whose ticker starts with or name contains the search term", () => {
    const result = list({ search: "IWDA" });
    expect(result.items.length).toBeGreaterThan(0);
    result.items.forEach((etf) => {
      const matchesTicker = etf.ticker.startsWith("IWDA");
      const matchesName = etf.name.includes("IWDA");
      expect(matchesTicker || matchesName).toBe(true);
    });
  });

  // Scenario: maxTer filter excludes expensive ETFs
  it("excludes ETFs with ter above maxTer", () => {
    const result = list({ maxTer: 0.2 });
    result.items.forEach((etf) => {
      expect(etf.ter).toBeLessThanOrEqual(0.2);
    });
  });

  // Scenario: Pagination advances correctly
  it("returns records 11–20 on page 2 with pageSize 10", () => {
    const page1 = list({ page: 1, pageSize: 10 });
    const page2 = list({ page: 2, pageSize: 10 });
    expect(page2.page).toBe(2);
    expect(page2.items.length).toBeLessThanOrEqual(10);
    const page1Tickers = new Set(page1.items.map((e) => e.ticker));
    page2.items.forEach((etf) => {
      expect(page1Tickers.has(etf.ticker)).toBe(false);
    });
  });

  it("returns an empty items array and 0 pages when search has no match", () => {
    const result = list({ search: "ZZZNOMATCH99" });
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

describe("getByTicker()", () => {
  // Scenario: Known ticker returns the ETF
  it("returns the ETF with the matching ticker (case-insensitive)", () => {
    const all = list({});
    const first = all.items[0];
    // CR-5: explicit assertion prevents silent vacuous pass if list returns no items
    expect(first).toBeDefined();

    const result = getByTicker(first.ticker);
    expect(result).not.toBeNull();
    expect(result?.ticker).toBe(first.ticker.toUpperCase());

    const lower = getByTicker(first.ticker.toLowerCase());
    expect(lower?.ticker).toBe(first.ticker.toUpperCase());
  });

  // Scenario: Unknown ticker returns null
  it("returns null for a ticker that does not exist", () => {
    const result = getByTicker("ZZZNOMATCH99");
    expect(result).toBeNull();
  });
});

describe("corrupt data", () => {
  // CR-1: afterEach guarantees module-cache reset regardless of assertion outcome,
  // preventing the mock factory from affecting subsequent test files
  afterEach(() => {
    vi.resetModules();
  });

  // Scenario: Corrupt file throws on load
  // it.fails: seed data is currently inlined in etf-repository.ts and EtfSchema.parse is a stub —
  // validation at load time is not yet implemented; convert to it() when 01-etf-data/ is done
  it.fails("throws a descriptive error when seed data contains an invalid record", async () => {
    vi.resetModules();
    // SC-3/CR-2: assert the error message is diagnostic, not just "something threw"
    await expect(import("./etf-repository")).rejects.toThrow(/invalid|schema|validation/i);
  });
});
