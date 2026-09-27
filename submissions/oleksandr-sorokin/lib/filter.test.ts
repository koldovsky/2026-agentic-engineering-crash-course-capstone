import { describe, expect, it } from "vitest";
import { filterEtfs } from "./filter";
import type { Etf } from "./etf-schema";
import { BASE_ETF } from "./test-fixtures";

const ETFS: Etf[] = [
  { ...BASE_ETF, ticker: "IWDA", name: "iShares Core MSCI World UCITS ETF", assetClass: "equity", region: "global", issuer: "iShares", distribution: "accumulating", ter: 0.2 },
  { ...BASE_ETF, ticker: "CSPX", name: "iShares Core S&P 500 UCITS ETF", assetClass: "equity", region: "north-america", issuer: "iShares", distribution: "accumulating", ter: 0.07 },
  { ...BASE_ETF, ticker: "VWCE", name: "Vanguard FTSE All-World UCITS ETF", assetClass: "equity", region: "global", issuer: "Vanguard", distribution: "accumulating", ter: 0.22 },
  { ...BASE_ETF, ticker: "AGGH", name: "iShares Core Global Aggregate Bond UCITS ETF", assetClass: "bond", region: "global", issuer: "iShares", distribution: "distributing", ter: 0.1 },
  { ...BASE_ETF, ticker: "XMWO", name: "Xtrackers MSCI World Swap UCITS ETF", assetClass: "equity", region: "global", issuer: "Xtrackers", distribution: "accumulating", ter: 0.15, replication: "synthetic" },
];

describe("filterEtfs()", () => {
  it("no-op query returns all ETFs unchanged", () => {
    const result = filterEtfs(ETFS, {});
    expect(result).toHaveLength(ETFS.length);
  });

  it("search by ticker prefix returns matching ETFs", () => {
    const result = filterEtfs(ETFS, { search: "IW" });
    expect(result.map((e) => e.ticker)).toContain("IWDA");
    // CR-7: both sides normalised to uppercase for consistent case-insensitive comparison
    result.forEach((e) => {
      expect(e.ticker.toUpperCase().startsWith("IW") || e.name.toUpperCase().includes("IW")).toBe(true);
    });
  });

  it("search by name substring returns matching ETFs", () => {
    const result = filterEtfs(ETFS, { search: "vanguard" });
    expect(result.map((e) => e.ticker)).toContain("VWCE");
    result.forEach((e) => {
      expect(e.ticker.toUpperCase().startsWith("VANGUARD") || e.name.toUpperCase().includes("VANGUARD")).toBe(true);
    });
  });

  it("assetClass filter keeps only matching ETFs", () => {
    const result = filterEtfs(ETFS, { assetClass: ["bond"] });
    expect(result.map((e) => e.ticker)).toContain("AGGH");
    result.forEach((e) => expect(e.assetClass).toBe("bond"));
  });

  it("region filter keeps only matching ETFs", () => {
    const result = filterEtfs(ETFS, { region: ["north-america"] });
    result.forEach((e) => expect(e.region).toBe("north-america"));
  });

  it("issuer filter keeps only matching ETFs", () => {
    const result = filterEtfs(ETFS, { issuer: ["Vanguard"] });
    expect(result).toHaveLength(1);
    expect(result[0].ticker).toBe("VWCE");
  });

  it("distribution filter keeps only accumulating ETFs", () => {
    const result = filterEtfs(ETFS, { distribution: ["accumulating"] });
    result.forEach((e) => expect(e.distribution).toBe("accumulating"));
  });

  it("maxTer boundary excludes ETFs above the threshold", () => {
    const result = filterEtfs(ETFS, { maxTer: 0.2 });
    result.forEach((e) => expect(e.ter).toBeLessThanOrEqual(0.2));
  });

  it("maxTer boundary includes ETFs exactly at the threshold", () => {
    const result = filterEtfs(ETFS, { maxTer: 0.2 });
    const tickers = result.map((e) => e.ticker);
    expect(tickers).toContain("IWDA"); // ter === 0.2 must be included
    expect(tickers).not.toContain("VWCE"); // ter === 0.22 must be excluded
  });

  it("multiple filters are combined (AND logic)", () => {
    const result = filterEtfs(ETFS, {
      assetClass: ["equity"],
      issuer: ["iShares"],
    });
    result.forEach((e) => {
      expect(e.assetClass).toBe("equity");
      expect(e.issuer).toBe("iShares");
    });
  });

  it("returns empty array when no ETFs match", () => {
    const result = filterEtfs(ETFS, { search: "ZZZNOMATCH99" });
    expect(result).toHaveLength(0);
  });
});
