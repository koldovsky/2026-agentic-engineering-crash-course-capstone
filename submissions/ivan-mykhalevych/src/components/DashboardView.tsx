"use client";

import Link from "next/link";
import NoProfileNotice from "./NoProfileNotice";
import { useState } from "react";
import { topicLabel } from "@/lib/localize";
import { summarizeProgress } from "@/lib/progress";
import { LEVELS } from "@/lib/types";
import { useT } from "@/lib/useLanguage";
import { useProgress } from "@/lib/useProgress";

const card = "rounded-2xl border border-line bg-surface p-6 backdrop-blur";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${card} min-w-0`}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-mono text-3xl font-bold text-accent [overflow-wrap:anywhere]">{value}</p>
    </div>
  );
}

export default function DashboardView() {
  const progress = useProgress();
  const { language, t, tn } = useT();
  const [now] = useState(() => Date.now());

  if (progress === null) return <NoProfileNotice />;
  const { name, attempts, best: bestScores } = progress;

  const summary = summarizeProgress(attempts, now);

  if (summary.attemptCount === 0) {
    return (
      <section className={`${card} space-y-4`}>
        <h2 className="text-xl font-semibold">{t("empty.title")}</h2>
        <p className="text-muted break-words">{t("dashboard.emptyText", { name })}</p>
        <Link
          href="/"
          className="inline-block rounded-xl bg-gradient-to-r from-accent to-accent-2 px-5 py-2.5 font-semibold text-on-accent"
        >
          {t("empty.start")}
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={t("dashboard.profile")} value={name} />
        <Stat label={t("dashboard.attempts")} value={String(summary.attemptCount)} />
        <Stat label={t("dashboard.streak")} value={tn("dashboard.days", summary.streak)} />
      </div>

      <section className={`${card} space-y-3`}>
        <h2 className="text-xl font-semibold">{t("dashboard.best")}</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {LEVELS.map((level) => (
            <li key={level} className="rounded-xl border border-line p-3">
              <span className="block text-sm text-muted capitalize">{level}</span>
              <span className="font-mono text-xl">
                {bestScores[level] === undefined ? "-" : `${bestScores[level]}%`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${card} space-y-4`}>
        <h2 className="text-xl font-semibold">{t("dashboard.mastery")}</h2>
        <ul className="space-y-3">
          {summary.mastery.map(({ topic, correct, total, percent }) => (
            <li key={topic}>
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{topicLabel(language, topic)}</span>
                <span className="text-muted">{t("dashboard.masteryRow", { correct, total, percent })}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${card} space-y-3`}>
        <h2 className="text-xl font-semibold">{t("dashboard.weakest")}</h2>
        {summary.weakest.length === 0 ? (
          <p className="text-muted">{t("dashboard.notEnough")}</p>
        ) : (
          <ol className="list-decimal space-y-1 pl-5">
            {summary.weakest.map(({ topic, percent }) => (
              <li key={topic}>
                {topicLabel(language, topic)} <span className="text-muted">({percent}%)</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
