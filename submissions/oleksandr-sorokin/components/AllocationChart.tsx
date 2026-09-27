"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Weight } from "@/lib/etf-schema";

type Props = { data: Weight[]; title: string };

const BLUE_SHADES = [
  '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe',
];

export default function AllocationChart({ data, title }: Props) {
  return (
    <div>
      {title && <h3 className="text-sm font-semibold mb-3">{title}</h3>}
      <ResponsiveContainer width="100%" height={data.length * 36 + 40}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
          <XAxis
            type="number"
            unit="%"
            tick={{ fontSize: 11, fill: 'var(--muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={110}
            tick={{ fontSize: 11, fill: 'var(--foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v) => [`${typeof v === "number" ? v.toFixed(2) : v}%`, 'Weight']}
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--foreground)',
            }}
            cursor={{ fill: 'var(--card-border)', opacity: 0.4 }}
          />
          <Bar dataKey="weight" radius={[0, 3, 3, 0]}>
            {data.map((_, idx) => (
              <Cell key={idx} fill={BLUE_SHADES[idx % BLUE_SHADES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div data-testid="allocation-labels" className="sr-only">
        {data.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </div>
  );
}
