'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Etf } from '@/lib/etf-schema';
import { formatPercent } from '@/lib/format-percent';
import { formatAum } from '@/lib/format-aum';

type SortDir = 'asc' | 'desc';

type Column = {
  header: string;
  key: string;
  align?: 'left' | 'right';
  render: (etf: Etf) => React.ReactNode;
};

const COLUMNS: Column[] = [
  { header: 'Ticker',      key: 'ticker',      align: 'left',  render: (e) => (
    <span className="font-mono font-semibold text-xs tracking-wide px-1.5 py-0.5 rounded" style={{ background: 'var(--background)', color: 'var(--accent)' }}>
      {e.ticker}
    </span>
  )},
  { header: 'Name',        key: 'name',        align: 'left',  render: (e) => e.name },
  { header: 'Issuer',      key: 'issuer',      align: 'left',  render: (e) => (
    <span className="text-xs px-1.5 py-0.5 rounded-full border font-medium" style={{ color: 'var(--muted)', borderColor: 'var(--card-border)' }}>
      {e.issuer}
    </span>
  )},
  { header: 'Asset Class', key: 'assetClass',  align: 'left',  render: (e) => (
    <span className="capitalize text-xs">{e.assetClass}</span>
  )},
  { header: 'Region',      key: 'region',      align: 'left',  render: (e) => (
    <span className="capitalize text-xs">{e.region.replace(/-/g, '‑')}</span>
  )},
  { header: 'TER %',       key: 'ter',         align: 'right', render: (e) => formatPercent(e.ter) },
  { header: 'AUM',         key: 'aum',         align: 'right', render: (e) => formatAum(e.aum) },
  { header: '1Y Return',   key: 'return1y',    align: 'right', render: (e) => (
    <ReturnBadge value={e.return1y} />
  )},
];

function ReturnBadge({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 font-medium tabular-nums"
      style={{ color: positive ? 'var(--positive)' : 'var(--negative)' }}
    >
      {positive ? '▲' : '▼'} {formatPercent(Math.abs(value))}
    </span>
  );
}

const FILTER_PARAM_KEYS = ['search', 'assetClass', 'region', 'issuer', 'distribution', 'maxTer'];

type Props = {
  items: Etf[];
  sortBy: string;
  sortDir: SortDir;
  currentUrl?: string;
};

export default function EtfTable({ items, sortBy, sortDir, currentUrl }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasFilters = FILTER_PARAM_KEYS.some((k) => searchParams.has(k));

  function handleSort(key: string) {
    const newDir: SortDir =
      key === sortBy && sortDir === 'asc' ? 'desc' : 'asc';
    const params = new URLSearchParams(searchParams.toString());
    params.set('sortBy', key);
    params.set('sortDir', newDir);
    params.delete('page');
    router.push(`/etfs?${params}`);
  }

  function handleClearFilters() {
    router.replace('/etfs');
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mb-3 opacity-30" aria-hidden="true">
          <circle cx="18" cy="18" r="12" stroke="currentColor" strokeWidth="2"/>
          <path d="M27 27l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <p className="font-medium mb-1">{hasFilters ? 'No ETFs match your filters.' : 'No ETF data available.'}</p>
        {hasFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="mt-2 text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: 'var(--accent)' }}
          >
            Clear filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
              {COLUMNS.map((col) => {
                const isActive = col.key === sortBy;
                const ariaSort = isActive
                  ? sortDir === 'asc' ? 'ascending' : 'descending'
                  : undefined;
                return (
                  <th
                    key={col.key}
                    aria-sort={ariaSort}
                    className={`px-3 py-2.5 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                    style={{ background: 'var(--background)' }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider hover:opacity-70 transition-opacity whitespace-nowrap"
                      style={{ color: isActive ? 'var(--accent)' : 'var(--muted)' }}
                    >
                      {col.header}
                      {isActive ? (
                        <span aria-hidden="true">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      ) : (
                        <span aria-hidden="true" className="opacity-30">↕</span>
                      )}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {items.map((etf, idx) => (
              <tr
                key={etf.ticker}
                className="transition-colors"
                style={{
                  background: idx % 2 === 1 ? 'var(--background)' : 'var(--card)',
                  borderBottom: '1px solid var(--card-border)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--accent) 5%, var(--card))'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 1 ? 'var(--background)' : 'var(--card)'; }}
              >
                {COLUMNS.map((col) => {
                  const href = currentUrl
                    ? `/etfs/${etf.ticker}?ref=${encodeURIComponent(currentUrl)}`
                    : `/etfs/${etf.ticker}`;
                  return (
                    <td
                      key={col.key}
                      className={`px-3 py-2.5 whitespace-nowrap ${col.align === 'right' ? 'text-right tabular-nums' : ''}`}
                    >
                      {col.key === 'name' ? (
                        <Link
                          href={href}
                          className="font-medium hover:underline"
                          style={{ color: 'var(--foreground)' }}
                        >
                          {col.render(etf)}
                        </Link>
                      ) : (
                        col.render(etf)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
