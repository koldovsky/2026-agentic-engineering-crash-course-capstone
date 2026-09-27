import type { Holding } from "@/lib/etf-schema";

type Props = { holdings: Holding[] };

export default function HoldingsTable({ holdings }: Props) {
  const maxWeight = Math.max(...holdings.map((h) => h.weight));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
            <th scope="col" className="text-left py-2 px-1 text-xs font-semibold uppercase tracking-wider w-6" style={{ color: 'var(--muted)' }}>#</th>
            <th scope="col" className="text-left py-2 px-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Name</th>
            <th scope="col" className="text-right py-2 px-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Weight</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h, i) => (
            <tr
              key={h.name}
              style={{ borderBottom: '1px solid var(--card-border)' }}
            >
              <td className="py-2 px-1 tabular-nums text-xs" style={{ color: 'var(--muted)' }}>{i + 1}</td>
              <td className="py-2 px-2">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-sm leading-tight">{h.name}</span>
                  <div
                    className="h-1 rounded-full"
                    style={{
                      width: `${(h.weight / maxWeight) * 100}%`,
                      background: 'var(--accent)',
                      opacity: 0.4,
                    }}
                    aria-hidden="true"
                  />
                </div>
              </td>
              <td className="py-2 px-1 text-right tabular-nums font-medium">{h.weight.toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
