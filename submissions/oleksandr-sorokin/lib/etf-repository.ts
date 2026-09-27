import type { Etf } from "./etf-schema";
import { filterEtfs } from "./filter";

export const DEFAULT_PAGE_SIZE = 20;

export type ListQuery = {
  search?: string;
  assetClass?: string[];
  region?: string[];
  issuer?: string[];
  distribution?: string[];
  maxTer?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type ListResult = {
  items: Etf[];
  total: number;
  page: number;
  pages: number;
};

// Seed data — 25 real-world UCITS ETFs. Prices/holdings are minimal stubs; full data
// lives in data/etfs.json once openspec/changes/01-etf-data/ is implemented.
const SEED: Etf[] = [
  { ticker: "AGGH", name: "iShares Core Global Aggregate Bond UCITS ETF", issuer: "iShares", assetClass: "bond", region: "global", currency: "EUR", ter: 0.1, aum: 6200, inceptionDate: "2015-11-25", distribution: "distributing", replication: "physical", return1y: 0.032, return3y: -0.021, return5y: 0.012, volatility1y: 0.06, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "AGVE", name: "Amundi MSCI Europe UCITS ETF", issuer: "Amundi", assetClass: "equity", region: "europe", currency: "EUR", ter: 0.15, aum: 3100, inceptionDate: "2010-06-17", distribution: "accumulating", replication: "physical", return1y: 0.14, return3y: 0.07, return5y: 0.09, volatility1y: 0.14, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "AMAZ", name: "Amundi MSCI Asia Pacific UCITS ETF", issuer: "Amundi", assetClass: "equity", region: "asia-pacific", currency: "EUR", ter: 0.2, aum: 1800, inceptionDate: "2011-09-15", distribution: "accumulating", replication: "physical", return1y: 0.08, return3y: 0.04, return5y: 0.07, volatility1y: 0.16, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "AMWE", name: "Amundi MSCI World UCITS ETF", issuer: "Amundi", assetClass: "equity", region: "global", currency: "EUR", ter: 0.18, aum: 4500, inceptionDate: "2009-03-10", distribution: "accumulating", replication: "physical", return1y: 0.21, return3y: 0.11, return5y: 0.12, volatility1y: 0.13, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "CSPX", name: "iShares Core S&P 500 UCITS ETF", issuer: "iShares", assetClass: "equity", region: "north-america", currency: "USD", ter: 0.07, aum: 52000, inceptionDate: "2010-05-19", distribution: "accumulating", replication: "physical", return1y: 0.26, return3y: 0.12, return5y: 0.14, volatility1y: 0.14, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "EEMV", name: "iShares MSCI EM Min Vol UCITS ETF", issuer: "iShares", assetClass: "equity", region: "emerging-markets", currency: "USD", ter: 0.4, aum: 1200, inceptionDate: "2012-06-01", distribution: "accumulating", replication: "physical", return1y: 0.04, return3y: 0.01, return5y: 0.04, volatility1y: 0.12, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "EUNH", name: "iShares Core Euro Government Bond UCITS ETF", issuer: "iShares", assetClass: "bond", region: "europe", currency: "EUR", ter: 0.09, aum: 8900, inceptionDate: "2009-02-25", distribution: "distributing", replication: "physical", return1y: 0.025, return3y: -0.045, return5y: 0.005, volatility1y: 0.055, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "IAPD", name: "iShares Asia Pacific Dividend UCITS ETF", issuer: "iShares", assetClass: "equity", region: "asia-pacific", currency: "USD", ter: 0.59, aum: 820, inceptionDate: "2005-11-02", distribution: "distributing", replication: "physical", return1y: 0.09, return3y: 0.03, return5y: 0.05, volatility1y: 0.18, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "IBGX", name: "iShares Global Government Bond UCITS ETF", issuer: "iShares", assetClass: "bond", region: "global", currency: "EUR", ter: 0.12, aum: 2100, inceptionDate: "2014-01-08", distribution: "accumulating", replication: "sampling", return1y: 0.02, return3y: -0.03, return5y: 0.008, volatility1y: 0.065, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "IEEM", name: "iShares MSCI Emerging Markets UCITS ETF", issuer: "iShares", assetClass: "equity", region: "emerging-markets", currency: "USD", ter: 0.18, aum: 7200, inceptionDate: "2005-11-02", distribution: "accumulating", replication: "physical", return1y: 0.06, return3y: 0.01, return5y: 0.05, volatility1y: 0.18, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "IGLN", name: "iShares Physical Gold ETC", issuer: "iShares", assetClass: "commodity", region: "global", currency: "USD", ter: 0.12, aum: 14000, inceptionDate: "2011-11-08", distribution: "accumulating", replication: "physical", return1y: 0.13, return3y: 0.08, return5y: 0.11, volatility1y: 0.13, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "IWDA", name: "iShares Core MSCI World UCITS ETF", issuer: "iShares", assetClass: "equity", region: "global", currency: "USD", ter: 0.2, aum: 68000, inceptionDate: "2009-09-25", distribution: "accumulating", replication: "physical", return1y: 0.23, return3y: 0.12, return5y: 0.13, volatility1y: 0.13, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "SPYW", name: "SPDR S&P World UCITS ETF", issuer: "SPDR", assetClass: "equity", region: "global", currency: "EUR", ter: 0.3, aum: 2400, inceptionDate: "2012-04-05", distribution: "distributing", replication: "physical", return1y: 0.22, return3y: 0.11, return5y: 0.12, volatility1y: 0.13, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "SPRE", name: "SPDR MSCI Europe UCITS ETF", issuer: "SPDR", assetClass: "equity", region: "europe", currency: "EUR", ter: 0.12, aum: 1100, inceptionDate: "2014-03-20", distribution: "accumulating", replication: "physical", return1y: 0.13, return3y: 0.06, return5y: 0.08, volatility1y: 0.14, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "SRSA", name: "SPDR Bloomberg Short-Term Bond UCITS ETF", issuer: "SPDR", assetClass: "bond", region: "north-america", currency: "USD", ter: 0.1, aum: 900, inceptionDate: "2016-07-14", distribution: "accumulating", replication: "physical", return1y: 0.05, return3y: 0.02, return5y: 0.018, volatility1y: 0.01, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "VCIT", name: "Vanguard EUR Corporate Bond UCITS ETF", issuer: "Vanguard", assetClass: "bond", region: "europe", currency: "EUR", ter: 0.12, aum: 1800, inceptionDate: "2013-11-11", distribution: "distributing", replication: "physical", return1y: 0.04, return3y: -0.02, return5y: 0.015, volatility1y: 0.06, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "VEUR", name: "Vanguard FTSE Developed Europe UCITS ETF", issuer: "Vanguard", assetClass: "equity", region: "europe", currency: "EUR", ter: 0.1, aum: 4200, inceptionDate: "2010-06-24", distribution: "distributing", replication: "physical", return1y: 0.14, return3y: 0.07, return5y: 0.09, volatility1y: 0.14, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "VFEM", name: "Vanguard FTSE Emerging Markets UCITS ETF", issuer: "Vanguard", assetClass: "equity", region: "emerging-markets", currency: "USD", ter: 0.22, aum: 2800, inceptionDate: "2012-07-19", distribution: "accumulating", replication: "physical", return1y: 0.06, return3y: 0.02, return5y: 0.06, volatility1y: 0.18, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "VNGA", name: "Vanguard LifeStrategy 80 Equity UCITS ETF", issuer: "Vanguard", assetClass: "multi-asset", region: "global", currency: "EUR", ter: 0.25, aum: 3600, inceptionDate: "2020-01-22", distribution: "accumulating", replication: "physical", return1y: 0.18, return3y: 0.09, return5y: 0.1, volatility1y: 0.11, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "VNRT", name: "Vanguard FTSE North America UCITS ETF", issuer: "Vanguard", assetClass: "equity", region: "north-america", currency: "USD", ter: 0.1, aum: 5100, inceptionDate: "2013-10-10", distribution: "distributing", replication: "physical", return1y: 0.25, return3y: 0.12, return5y: 0.14, volatility1y: 0.14, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "VWCE", name: "Vanguard FTSE All-World UCITS ETF", issuer: "Vanguard", assetClass: "equity", region: "global", currency: "USD", ter: 0.22, aum: 18000, inceptionDate: "2019-07-23", distribution: "accumulating", replication: "physical", return1y: 0.22, return3y: 0.11, return5y: 0.12, volatility1y: 0.13, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "XEUR", name: "Xtrackers Euro Stoxx 50 UCITS ETF", issuer: "Xtrackers", assetClass: "equity", region: "europe", currency: "EUR", ter: 0.09, aum: 3900, inceptionDate: "2007-07-03", distribution: "distributing", replication: "synthetic", return1y: 0.17, return3y: 0.09, return5y: 0.1, volatility1y: 0.16, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "XMAF", name: "Xtrackers MSCI World Multi-Factor UCITS ETF", issuer: "Xtrackers", assetClass: "equity", region: "global", currency: "EUR", ter: 0.25, aum: 1400, inceptionDate: "2016-02-17", distribution: "accumulating", replication: "physical", return1y: 0.19, return3y: 0.1, return5y: 0.11, volatility1y: 0.14, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "XMWO", name: "Xtrackers MSCI World Swap UCITS ETF", issuer: "Xtrackers", assetClass: "equity", region: "global", currency: "EUR", ter: 0.15, aum: 6800, inceptionDate: "2007-01-22", distribution: "accumulating", replication: "synthetic", return1y: 0.23, return3y: 0.12, return5y: 0.13, volatility1y: 0.13, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
  { ticker: "XREA", name: "Xtrackers FTSE All-World Swap UCITS ETF", issuer: "Xtrackers", assetClass: "equity", region: "global", currency: "EUR", ter: 0.25, aum: 2200, inceptionDate: "2014-09-01", distribution: "accumulating", replication: "synthetic", return1y: 0.22, return3y: 0.11, return5y: 0.12, volatility1y: 0.13, prices: [], holdings: [], sectorWeights: [], countryWeights: [] },
] as const as unknown as Etf[];

function sortInline(etfs: Etf[], sortBy: string, sortDir: "asc" | "desc"): Etf[] {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...etfs].sort((a, b) => {
    const aVal = (a as Record<string, unknown>)[sortBy];
    const bVal = (b as Record<string, unknown>)[sortBy];
    if (typeof aVal === "string" && typeof bVal === "string") {
      return dir * aVal.localeCompare(bVal, undefined, { sensitivity: "base" });
    }
    if (typeof aVal === "number" && typeof bVal === "number") {
      return dir * (aVal - bVal);
    }
    return 0;
  });
}

export function list(query: ListQuery): ListResult {
  const {
    sortBy = "name",
    sortDir = "asc",
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    ...filterQuery
  } = query;

  const filtered = filterEtfs(SEED, filterQuery);
  const sorted = sortInline(filtered, sortBy, sortDir);
  const total = sorted.length;
  const pages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const safePage = Math.min(Math.max(1, page), Math.max(1, pages));
  const start = (safePage - 1) * pageSize;
  const items = sorted.slice(start, start + pageSize);

  return { items, total, page: safePage, pages };
}

export function getByTicker(ticker: string): Etf | null {
  const upper = ticker.toUpperCase();
  return SEED.find((e) => e.ticker.toUpperCase() === upper) ?? null;
}
