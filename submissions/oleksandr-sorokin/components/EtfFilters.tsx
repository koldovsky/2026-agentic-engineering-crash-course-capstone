'use client';

import { useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const ASSET_CLASSES = ['equity', 'bond', 'commodity', 'real-estate', 'multi-asset'];
const REGIONS = ['europe', 'north-america', 'global', 'asia-pacific', 'emerging-markets'];
const ISSUERS = ['Amundi', 'iShares', 'SPDR', 'Vanguard', 'Xtrackers'];
const DISTRIBUTIONS = ['accumulating', 'distributing'];

const FILTER_PARAMS = ['search', 'assetClass', 'region', 'issuer', 'distribution', 'maxTer'];

const labelStyle = "block text-xs font-semibold uppercase tracking-wider mb-2" as const;
const sectionStyle = "mb-5" as const;

export default function EtfFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const maxTerRef = useRef<HTMLInputElement>(null);

  function pushParams(updates: Record<string, string | string[] | null>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        params.delete(key);
      } else if (Array.isArray(value)) {
        params.delete(key);
        for (const v of value) params.append(key, v);
      } else {
        params.set(key, value);
      }
    }
    router.push(`/etfs?${params}`);
  }

  function handleSearchCommit() {
    const term = searchRef.current?.value.trim() ?? '';
    pushParams({ search: term || null });
  }

  function handleMulti(param: string, value: string, checked: boolean) {
    const current = searchParams.getAll(param);
    const next = checked ? [...current, value] : current.filter((v) => v !== value);
    pushParams({ [param]: next.length > 0 ? next : null });
  }

  function handleMaxTerCommit() {
    const value = maxTerRef.current?.value.trim() ?? '';
    pushParams({ maxTer: value || null });
  }

  function handleReset() {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of FILTER_PARAMS) params.delete(key);
    router.push(`/etfs?${params}`);
  }

  function isSelected(param: string, value: string) {
    return searchParams.getAll(param).includes(value);
  }

  const hasActiveFilters = FILTER_PARAMS.some((k) => searchParams.has(k));

  return (
    <aside
      className="w-56 shrink-0 rounded-xl border p-4"
      style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          Filters
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-medium hover:opacity-70 transition-opacity"
            style={{ color: 'var(--accent)' }}
          >
            Reset
          </button>
        )}
      </div>

      <div className={sectionStyle}>
        <label htmlFor="etf-search" className={labelStyle} style={{ color: 'var(--muted)' }}>
          Search
        </label>
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--muted)' }} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="4.5"/>
            <path d="M10.5 10.5l3 3"/>
          </svg>
          <input
            id="etf-search"
            type="text"
            ref={searchRef}
            defaultValue={searchParams.get('search') ?? ''}
            onBlur={handleSearchCommit}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearchCommit(); }}
            placeholder="Ticker or name…"
            className="w-full pl-7 pr-2 py-1.5 text-sm rounded-lg border outline-none transition-colors"
            style={{
              background: 'var(--background)',
              borderColor: 'var(--card-border)',
              color: 'var(--foreground)',
            }}
          />
        </div>
      </div>

      <FilterGroup
        legend="Asset Class"
        options={ASSET_CLASSES}
        param="assetClass"
        isSelected={isSelected}
        onToggle={handleMulti}
      />
      <FilterGroup
        legend="Region"
        options={REGIONS}
        param="region"
        isSelected={isSelected}
        onToggle={handleMulti}
      />
      <FilterGroup
        legend="Issuer"
        options={ISSUERS}
        param="issuer"
        isSelected={isSelected}
        onToggle={handleMulti}
      />
      <FilterGroup
        legend="Distribution"
        options={DISTRIBUTIONS}
        param="distribution"
        isSelected={isSelected}
        onToggle={handleMulti}
      />

      <div>
        <label htmlFor="etf-max-ter" className={labelStyle} style={{ color: 'var(--muted)' }}>
          Max TER (%)
        </label>
        <input
          id="etf-max-ter"
          type="number"
          min="0"
          max="5"
          step="0.01"
          ref={maxTerRef}
          defaultValue={searchParams.get('maxTer') ?? ''}
          onBlur={handleMaxTerCommit}
          placeholder="e.g. 0.50"
          className="w-full px-2 py-1.5 text-sm rounded-lg border outline-none transition-colors"
          style={{
            background: 'var(--background)',
            borderColor: 'var(--card-border)',
            color: 'var(--foreground)',
          }}
        />
      </div>
    </aside>
  );
}

type FilterGroupProps = {
  legend: string;
  options: string[];
  param: string;
  isSelected: (param: string, value: string) => boolean;
  onToggle: (param: string, value: string, checked: boolean) => void;
};

function FilterGroup({ legend, options, param, isSelected, onToggle }: FilterGroupProps) {
  return (
    <fieldset className={sectionStyle}>
      <legend className={labelStyle} style={{ color: 'var(--muted)' }}>
        {legend}
      </legend>
      <div className="flex flex-col gap-1">
        {options.map((v) => {
          const checked = isSelected(param, v);
          return (
            <label
              key={v}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <span
                className="w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors"
                style={{
                  background: checked ? 'var(--accent)' : 'var(--background)',
                  borderColor: checked ? 'var(--accent)' : 'var(--card-border)',
                }}
              >
                {checked && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={(e) => onToggle(param, v, e.target.checked)}
              />
              <span
                className="text-sm capitalize leading-none"
                style={{ color: checked ? 'var(--foreground)' : 'var(--muted)' }}
              >
                {v.replace(/-/g, '‑')}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
