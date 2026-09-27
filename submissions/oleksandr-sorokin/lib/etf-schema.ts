// Type stubs — full Zod schema implemented in task 1.2 (openspec/changes/01-etf-data/)
export type AssetClass =
  | "equity"
  | "bond"
  | "commodity"
  | "real-estate"
  | "multi-asset";

export type Region =
  | "europe"
  | "north-america"
  | "global"
  | "asia-pacific"
  | "emerging-markets";

export type Distribution = "accumulating" | "distributing";

export type Replication = "physical" | "synthetic" | "sampling";

export type DailyPrice = { date: string; price: number };
export type Holding = { name: string; weight: number };
export type Weight = { label: string; weight: number };

export type Etf = {
  ticker: string;
  name: string;
  issuer: string;
  assetClass: AssetClass;
  region: Region;
  currency: string;
  ter: number;
  aum: number;
  inceptionDate: string;
  distribution: Distribution;
  replication: Replication;
  return1y: number;
  return3y: number;
  return5y: number;
  volatility1y: number;
  prices: DailyPrice[];
  holdings: Holding[];
  sectorWeights: Weight[];
  countryWeights: Weight[];
};

const _notImplemented = (): never => {
  throw new Error(
    "lib/etf-schema.ts is not implemented — see openspec/changes/01-etf-data/ task 1.2",
  );
};

export const EtfSchema = {
  parse: (_data: unknown): Etf => _notImplemented(),
};
