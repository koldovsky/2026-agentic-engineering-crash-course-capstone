import { describe, expect, it } from "vitest";
import type { Etf } from "./etf-schema";
import { sortEtfs } from "./sort";
import { BASE_ETF } from "./test-fixtures";

const ETFS: Etf[] = [
  { ...BASE_ETF, ticker: "VWCE", name: "Vanguard FTSE All-World UCITS ETF", ter: 0.22, aum: 10000, return1y: 0.09 },
  { ...BASE_ETF, ticker: "IWDA", name: "iShares Core MSCI World UCITS ETF", ter: 0.2, aum: 50000, return1y: 0.12 },
  { ...BASE_ETF, ticker: "CSPX", name: "iShares Core S&P 500 UCITS ETF", ter: 0.07, aum: 70000, return1y: 0.15 },
  { ...BASE_ETF, ticker: "AGGH", name: "iShares Core Global Aggregate Bond", ter: 0.1, aum: 20000, return1y: 0.04 },
];

describe("sortEtfs()", () => {
  it.fails("sorts by ter ascending — cheapest first", () => {
    const result = sortEtfs(ETFS, "ter", "asc");
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].ter).toBeLessThanOrEqual(result[i].ter);
    }
  });

  it.fails("sorts by ter descending — most expensive first", () => {
    const result = sortEtfs(ETFS, "ter", "desc");
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].ter).toBeGreaterThanOrEqual(result[i].ter);
    }
  });

  it.fails("sorts by name ascending — alphabetical order", () => {
    const result = sortEtfs(ETFS, "name", "asc");
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].name.localeCompare(result[i].name)).toBeLessThanOrEqual(0);
    }
  });

  it.fails("sorts by return1y descending — best performer first", () => {
    const result = sortEtfs(ETFS, "return1y", "desc");
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].return1y).toBeGreaterThanOrEqual(result[i].return1y);
    }
  });

  it.fails("sorts by aum descending — largest fund first", () => {
    const result = sortEtfs(ETFS, "aum", "desc");
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].aum).toBeGreaterThanOrEqual(result[i].aum);
    }
  });

  it.fails("stable ordering — equal values preserve relative input order", () => {
    const tieEtfs: Etf[] = [
      { ...BASE_ETF, ticker: "AAA", name: "Alpha Fund", ter: 0.1 },
      { ...BASE_ETF, ticker: "BBB", name: "Beta Fund", ter: 0.1 },
      { ...BASE_ETF, ticker: "CCC", name: "Gamma Fund", ter: 0.1 },
    ];
    const result = sortEtfs(tieEtfs, "ter", "asc");
    expect(result.map((e) => e.ticker)).toEqual(["AAA", "BBB", "CCC"]);
  });

  it.fails("does not mutate the original array", () => {
    const original = [...ETFS];
    sortEtfs(ETFS, "ter", "asc");
    expect(ETFS.map((e) => e.ticker)).toEqual(original.map((e) => e.ticker));
  });
});
