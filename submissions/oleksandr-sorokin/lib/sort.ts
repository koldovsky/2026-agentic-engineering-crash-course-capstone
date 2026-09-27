// Stub — implementation in task 4.4 (openspec/changes/01-etf-data/)
import type { Etf } from "./etf-schema";

export type SortField =
  | "ticker"
  | "name"
  | "ter"
  | "aum"
  | "return1y"
  | "return3y"
  | "return5y"
  | "volatility1y";

export function sortEtfs(
  _etfs: Etf[],
  _sortBy: SortField,
  _sortDir: "asc" | "desc",
): Etf[] {
  throw new Error(
    "lib/sort.ts is not implemented — see openspec/changes/01-etf-data/ task 4.4",
  );
}
