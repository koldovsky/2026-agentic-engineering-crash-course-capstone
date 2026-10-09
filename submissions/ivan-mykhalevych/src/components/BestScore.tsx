"use client";

import type { Level } from "@/lib/types";
import { useT } from "@/lib/useLanguage";
import { useProgress } from "@/lib/useProgress";

export default function BestScore({ level }: { level: Level }) {
  const best = useProgress()?.best[level];
  const { t } = useT();
  if (best === undefined) return null;
  return <span className="mt-2 font-mono text-sm text-good">{t("best.label", { percent: best })}</span>;
}
