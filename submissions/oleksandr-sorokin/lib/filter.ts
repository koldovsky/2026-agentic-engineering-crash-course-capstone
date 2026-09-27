import type { Etf } from "./etf-schema";
import type { ListQuery } from "./etf-repository";

export function filterEtfs(etfs: Etf[], query: ListQuery): Etf[] {
  const { search, assetClass, region, issuer, distribution, maxTer } = query;

  return etfs.filter((etf) => {
    if (search) {
      const term = search.toUpperCase();
      const tickerMatch = etf.ticker.toUpperCase().startsWith(term);
      const nameMatch = etf.name.toUpperCase().includes(term);
      if (!tickerMatch && !nameMatch) return false;
    }

    if (assetClass && assetClass.length > 0) {
      if (!assetClass.includes(etf.assetClass)) return false;
    }

    if (region && region.length > 0) {
      if (!region.includes(etf.region)) return false;
    }

    if (issuer && issuer.length > 0) {
      if (!issuer.includes(etf.issuer)) return false;
    }

    if (distribution && distribution.length > 0) {
      if (!distribution.includes(etf.distribution)) return false;
    }

    if (maxTer !== undefined && Number.isFinite(maxTer)) {
      if (etf.ter > maxTer) return false;
    }

    return true;
  });
}
