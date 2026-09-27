import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EtfSchema } from "./etf-schema";
import { BASE_ETF, makePrices } from "./test-fixtures";

describe("EtfSchema", () => {
  // Scenario: Valid record shape — it.fails() because stub always throws
  it.fails("accepts a fully valid ETF object without error", () => {
    expect(() => EtfSchema.parse(BASE_ETF)).not.toThrow();
    const parsed = EtfSchema.parse(BASE_ETF);
    expect(parsed.ticker).toBe("IWDA");
  });

  // SC-2: validate every generated record against the schema (red until schema + seed are implemented)
  it.fails("every record in data/etfs.json passes the schema", () => {
    const raw = readFileSync(join(import.meta.dirname, "..", "data", "etfs.json"), "utf-8");
    const records = JSON.parse(raw) as unknown[];
    records.forEach((r) => expect(() => EtfSchema.parse(r)).not.toThrow());
  });

  // Scenario: Prices cover ~1 trading year
  // CR-3: all rejection tests use it.fails() + not.toThrow() so they are genuinely red
  // (the stub throws on every call — wrapping with not.toThrow() makes the assertion fail
  //  as expected; in the green step remove it.fails() and flip to toThrow())
  it.fails("requires exactly 252 price entries", () => {
    const short = makePrices(100);
    expect(() => EtfSchema.parse({ ...BASE_ETF, prices: short })).not.toThrow();
  });

  it.fails("requires exactly 252 price entries — not 253", () => {
    const long = makePrices(253);
    expect(() => EtfSchema.parse({ ...BASE_ETF, prices: long })).not.toThrow();
  });

  it.fails("requires each price entry to have a valid ISO date", () => {
    const badPrices = makePrices(252).map((p) => ({ ...p, date: "not-a-date" }));
    expect(() => EtfSchema.parse({ ...BASE_ETF, prices: badPrices })).not.toThrow();
  });

  it.fails("requires each price entry to have a positive price", () => {
    const badPrices = makePrices(252).map((p, i) =>
      i === 5 ? { ...p, price: 0 } : p,
    );
    expect(() => EtfSchema.parse({ ...BASE_ETF, prices: badPrices })).not.toThrow();
  });

  it.fails("rejects a record with a missing required field (ter)", () => {
    const withoutTer = Object.fromEntries(
      Object.entries(BASE_ETF).filter(([k]) => k !== "ter"),
    );
    expect(() => EtfSchema.parse(withoutTer)).not.toThrow();
  });

  it.fails("rejects an invalid assetClass enum value", () => {
    expect(() => EtfSchema.parse({ ...BASE_ETF, assetClass: "crypto" })).not.toThrow();
  });

  it.fails("rejects an invalid region enum value", () => {
    expect(() => EtfSchema.parse({ ...BASE_ETF, region: "antarctica" })).not.toThrow();
  });

  it.fails("rejects a currency that is not exactly 3 characters", () => {
    expect(() => EtfSchema.parse({ ...BASE_ETF, currency: "US" })).not.toThrow();
    expect(() => EtfSchema.parse({ ...BASE_ETF, currency: "USDA" })).not.toThrow();
  });

  it.fails("rejects a ter value outside 0–5", () => {
    expect(() => EtfSchema.parse({ ...BASE_ETF, ter: -0.01 })).not.toThrow();
    expect(() => EtfSchema.parse({ ...BASE_ETF, ter: 5.01 })).not.toThrow();
  });

  it.fails("rejects a negative aum value", () => {
    expect(() => EtfSchema.parse({ ...BASE_ETF, aum: -1 })).not.toThrow();
  });

  // SC-4: aum: 0 boundary — spec says "positive number", so zero is invalid
  it.fails("rejects aum of exactly 0 (must be strictly positive)", () => {
    expect(() => EtfSchema.parse({ ...BASE_ETF, aum: 0 })).not.toThrow();
  });

  it.fails("rejects a negative volatility1y value", () => {
    expect(() => EtfSchema.parse({ ...BASE_ETF, volatility1y: -0.01 })).not.toThrow();
  });

  it.fails("rejects holdings with more than 10 entries", () => {
    const overHoldings = Array.from({ length: 11 }, (_, i) => ({
      name: `Stock ${i}`,
      weight: 1.0,
    }));
    expect(() => EtfSchema.parse({ ...BASE_ETF, holdings: overHoldings })).not.toThrow();
  });

  it.fails("rejects an invalid distribution enum value", () => {
    expect(() => EtfSchema.parse({ ...BASE_ETF, distribution: "reinvesting" })).not.toThrow();
  });

  it.fails("rejects an invalid replication enum value", () => {
    expect(() => EtfSchema.parse({ ...BASE_ETF, replication: "direct" })).not.toThrow();
  });
});
