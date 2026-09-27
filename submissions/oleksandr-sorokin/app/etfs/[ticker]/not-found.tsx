import Link from "next/link";

export default function EtfNotFound() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="text-center max-w-sm">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
          style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true" style={{ color: 'var(--muted)' }}>
            <circle cx="14" cy="14" r="9" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M21 21l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M11 11l6 6M17 11l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 className="text-lg font-bold mb-1">ETF not found</h1>
        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
          The ETF you are looking for does not exist.
        </p>
        <Link
          href="/etfs"
          className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Back to list
        </Link>
      </div>
    </main>
  );
}
