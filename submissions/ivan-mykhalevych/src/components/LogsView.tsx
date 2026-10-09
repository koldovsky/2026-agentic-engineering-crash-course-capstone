"use client";

import Link from "next/link";
import NoProfileNotice from "./NoProfileNotice";
import { LANGUAGE_LOCALES } from "@/lib/language";
import { exportAttemptsJson, exportFileName, newestFirst } from "@/lib/logExport";
import { useT } from "@/lib/useLanguage";
import { useProgress } from "@/lib/useProgress";

const card = "rounded-2xl border border-line bg-surface p-6 backdrop-blur";

export default function LogsView() {
  const progress = useProgress();
  const { language, t, tn } = useT();

  if (progress === null) return <NoProfileNotice />;
  const { name, attempts } = progress;

  if (attempts.length === 0) {
    return (
      <section className={`${card} space-y-4`}>
        <h2 className="text-xl font-semibold">{t("empty.title")}</h2>
        <p className="text-muted break-words">{t("logs.emptyText", { name })}</p>
        <Link
          href="/"
          className="inline-block rounded-xl bg-gradient-to-r from-accent to-accent-2 px-5 py-2.5 font-semibold text-on-accent"
        >
          {t("empty.start")}
        </Link>
      </section>
    );
  }

  const exportJson = () => {
    const exportedAt = Date.now();
    const file = new Blob([exportAttemptsJson(name, attempts, exportedAt)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = exportFileName(name, exportedAt);
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <section className={`${card} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="min-w-0 text-xl font-semibold break-words">{tn("logs.attempts", attempts.length, { name })}</h2>
        <button
          onClick={exportJson}
          className="rounded-xl bg-gradient-to-r from-accent to-accent-2 px-5 py-2.5 font-semibold text-on-accent transition-opacity hover:opacity-90"
        >
          {t("logs.export")}
        </button>
      </div>
      <ul className="divide-y divide-line">
        {newestFirst(attempts).map((attempt, index) => (
          <li key={`${attempt.at}-${index}`} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
            <span className="text-muted">{new Date(attempt.at).toLocaleString(LANGUAGE_LOCALES[language])}</span>
            <span className="font-mono capitalize">{attempt.level}</span>
            <span>
              {t("logs.row", { correct: attempt.correct, total: attempt.total, percent: attempt.percent })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
