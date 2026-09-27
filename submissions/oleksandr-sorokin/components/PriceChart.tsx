"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DailyPrice } from "@/lib/etf-schema";

type Range = "1M" | "6M" | "1Y";
type Props = { prices: DailyPrice[]; ticker: string };

const RANGES: { label: Range; points: number }[] = [
  { label: "1M", points: 21 },
  { label: "6M", points: 126 },
  { label: "1Y", points: 252 },
];
const VALID_RANGES = RANGES.map((r) => r.label);

export default function PriceChart({ prices, ticker }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fromUrl = searchParams.get("range");
  const [range, setRange] = useState<Range>(
    VALID_RANGES.includes(fromUrl as Range) ? (fromUrl as Range) : "1Y",
  );

  function handleRange(r: Range) {
    setRange(r);
    const next = new URLSearchParams(searchParams.toString());
    next.set("range", r);
    router.replace(`?${next}`, { scroll: false } as Parameters<typeof router.replace>[1]);
  }

  const points = RANGES.find((r) => r.label === range)!.points;
  const data = prices.slice(-points);

  return (
    <div>
      <div role="tablist">
        {RANGES.map((r) => (
          <button
            key={r.label}
            type="button"
            role="tab"
            aria-selected={range === r.label}
            onClick={() => handleRange(r.label)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div role="img" aria-label={`Price chart for ${ticker}`}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="price" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
