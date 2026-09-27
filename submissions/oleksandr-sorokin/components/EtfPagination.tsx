'use client';

import { useRouter, useSearchParams } from 'next/navigation';

type Props = {
  page: number;
  total: number;
  pageSize: number;
};

export default function EtfPagination({ page, total, pageSize }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const totalPages = Math.ceil(total / pageSize);

  function goTo(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`/etfs?${params}`);
  }

  const btnBase = "inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-colors border";

  return (
    <div className="flex items-center justify-between py-3 px-1">
      <p className="text-xs" style={{ color: 'var(--muted)' }}>
        {`Showing ${start}–${end} of ${total}`}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => goTo(page - 1)}
          className={btnBase}
          style={{
            background: page <= 1 ? 'transparent' : 'var(--card)',
            borderColor: 'var(--card-border)',
            color: page <= 1 ? 'var(--muted)' : 'var(--foreground)',
            cursor: page <= 1 ? 'not-allowed' : 'pointer',
            opacity: page <= 1 ? 0.4 : 1,
          }}
          aria-label="Previous page"
        >
          ‹
        </button>
        <span className="text-xs px-2" style={{ color: 'var(--muted)' }}>
          {`Page ${page} of ${totalPages}`}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => goTo(page + 1)}
          className={btnBase}
          style={{
            background: page >= totalPages ? 'transparent' : 'var(--card)',
            borderColor: 'var(--card-border)',
            color: page >= totalPages ? 'var(--muted)' : 'var(--foreground)',
            cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            opacity: page >= totalPages ? 0.4 : 1,
          }}
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
}
