import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getByTicker } from "@/lib/etf-repository";
import { formatPercent } from "@/lib/format-percent";
import { formatAum } from "@/lib/format-aum";
import { formatDate } from "@/lib/format-date";
import { formatReturn } from "@/lib/format-return";
import PriceChart from "@/components/PriceChart";
import HoldingsTable from "@/components/HoldingsTable";
import AllocationChart from "@/components/AllocationChart";

type Props = {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<Record<string, string>>;
};

type MetricEntry = {
  label: string;
  value: string;
  className?: string;
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
    >
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: 'var(--card-border)', background: 'var(--background)' }}
      >
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default async function EtfDetailsPage({ params, searchParams }: Props) {
  const { ticker } = await params;
  const { ref } = await searchParams;

  const etf = getByTicker(ticker);
  if (!etf) return notFound();

  const decoded = ref ? decodeURIComponent(ref) : "/etfs";
  const backHref = decoded.startsWith("/") ? decoded : "/etfs";

  function returnVariant(v: number): 'positive' | 'negative' | 'neutral' {
    return v > 0 ? 'positive' : v < 0 ? 'negative' : 'neutral';
  }

  const assetClassColors: Record<string, string> = {
    equity: '#dbeafe',
    bond: '#dcfce7',
    commodity: '#fef9c3',
    'real-estate': '#fce7f3',
    'multi-asset': '#ede9fe',
  };

  const tagBg = assetClassColors[etf.assetClass] ?? '#f1f5f9';

  return (
    <main className="flex-1 px-6 py-5 max-w-screen-xl mx-auto w-full">
      {/* Back + breadcrumb */}
      <nav className="mb-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-70 transition-opacity"
          style={{ color: 'var(--accent)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to list
        </Link>
      </nav>

      {/* Header */}
      <div
        className="rounded-xl border p-5 mb-5 flex flex-wrap items-start justify-between gap-4"
        style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-mono font-bold text-lg px-2 py-0.5 rounded"
              style={{ background: 'var(--background)', color: 'var(--accent)' }}
            >
              {etf.ticker}
            </span>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full border"
              style={{ color: 'var(--muted)', borderColor: 'var(--card-border)' }}
            >
              {etf.issuer}
            </span>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
              style={{ background: tagBg, color: '#374151' }}
            >
              {etf.assetClass}
            </span>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
              style={{ background: 'var(--background)', color: 'var(--muted)', border: '1px solid var(--card-border)' }}
            >
              {etf.region.replace(/-/g, '‑')}
            </span>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
              style={{ background: 'var(--background)', color: 'var(--muted)', border: '1px solid var(--card-border)' }}
            >
              {etf.distribution}
            </span>
          </div>
          <h1 className="text-xl font-bold leading-tight">{etf.name}</h1>
        </div>
      </div>

      {/* Key metrics grid — dl/dt/dd for spec compliance, styled as cards */}
      <section aria-label="Key metrics" className="mb-5">
        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {([
            { label: 'TER', value: formatPercent(etf.ter) },
            { label: 'AUM', value: formatAum(etf.aum) },
            { label: '1Y Return', value: formatReturn(etf.return1y), className: etf.return1y >= 0 ? 'positive' : 'negative' },
            { label: '3Y Return', value: formatReturn(etf.return3y), className: etf.return3y >= 0 ? 'positive' : 'negative' },
            { label: '5Y Return', value: formatReturn(etf.return5y), className: etf.return5y >= 0 ? 'positive' : 'negative' },
            { label: '1Y Volatility', value: formatPercent(etf.volatility1y) },
            { label: 'Inception Date', value: formatDate(etf.inceptionDate) },
          ] as MetricEntry[]).map(({ label, value, className }) => (
            <div
              key={label}
              className="rounded-xl border p-4 flex flex-col gap-1"
              style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
            >
              <dt className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                {label}
              </dt>
              <dd
                className={`text-xl font-bold tabular-nums${className ? ` ${className}` : ''}`}
                style={{
                  color: className === 'positive' ? 'var(--positive)' :
                         className === 'negative' ? 'var(--negative)' :
                         'var(--foreground)',
                }}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Charts + tables */}
      <div className="flex flex-col gap-5">
        {etf.prices.length > 0 && (
          <SectionCard title="Price History">
            <Suspense>
              <PriceChart prices={etf.prices} ticker={etf.ticker} />
            </Suspense>
          </SectionCard>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {etf.holdings.length > 0 && (
            <SectionCard title="Top Holdings">
              <HoldingsTable holdings={etf.holdings} />
            </SectionCard>
          )}

          {etf.sectorWeights.length > 0 && (
            <SectionCard title="Sector Allocation">
              <AllocationChart data={etf.sectorWeights} title="" />
            </SectionCard>
          )}
        </div>

        {etf.countryWeights.length > 0 && (
          <SectionCard title="Country Allocation">
            <AllocationChart data={etf.countryWeights} title="" />
          </SectionCard>
        )}
      </div>
    </main>
  );
}
