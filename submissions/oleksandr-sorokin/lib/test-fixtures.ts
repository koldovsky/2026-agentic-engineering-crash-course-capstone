import type { Etf } from "./etf-schema";

export function makePrices(count = 252) {
  const start = new Date("2023-01-03");
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return { date: d.toISOString().slice(0, 10), price: 100 + i * 0.1 };
  });
}

export const BASE_ETF: Etf = {
  ticker: "IWDA",
  name: "iShares Core MSCI World UCITS ETF",
  issuer: "iShares",
  assetClass: "equity",
  region: "global",
  currency: "USD",
  ter: 0.2,
  aum: 50000,
  inceptionDate: "2009-09-25",
  distribution: "accumulating",
  replication: "physical",
  return1y: 0.12,
  return3y: 0.08,
  return5y: 0.1,
  volatility1y: 0.15,
  prices: makePrices(),
  holdings: [{ name: "Apple Inc", weight: 5.0 }],
  sectorWeights: [{ label: "Technology", weight: 20.0 }],
  countryWeights: [{ label: "United States", weight: 70.0 }],
};
