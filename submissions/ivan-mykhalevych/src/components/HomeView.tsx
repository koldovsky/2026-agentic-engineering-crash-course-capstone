"use client";

import Link from "next/link";
import BestScore from "@/components/BestScore";
import { getQuestions } from "@/lib/questions";
import type { MessageKey } from "@/lib/translate";
import { LEVELS } from "@/lib/types";
import type { Level } from "@/lib/types";
import { useT } from "@/lib/useLanguage";

const LEVEL_GLYPH: Record<Level, string> = { junior: "{ }", middle: "</>", senior: "λ" };
const LEVEL_BLURB: Record<Level, MessageKey> = {
  junior: "home.junior",
  middle: "home.middle",
  senior: "home.senior",
};

export default function HomeView() {
  const { t, tn } = useT();
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-6 sm:py-8">
      <p className="font-mono text-sm tracking-widest text-accent uppercase">{t("home.eyebrow")}</p>
      <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
        {t("home.titleStart")} <span className="text-accent">{t("home.titleAccent")}</span>
      </h1>
      <p className="mt-3 max-w-2xl text-base text-muted sm:text-lg">{t("home.intro")}</p>

      <ul className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-3">
        {LEVELS.map((level) => (
          <li key={level}>
            <Link
              href={`/quiz/${level}`}
              className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-4 backdrop-blur transition-colors hover:border-accent"
            >
              <span className="flex items-baseline gap-3">
                <span className="font-mono text-2xl text-accent">{LEVEL_GLYPH[level]}</span>
                <span className="font-mono text-xl font-semibold capitalize">{level}</span>
              </span>
              <span className="mt-2 flex-1 text-sm text-muted">{t(LEVEL_BLURB[level])}</span>
              <BestScore level={level} />
              <span className="mt-3 text-sm text-muted">
                {tn("home.pool", getQuestions(level).length)} ·{" "}
                <span className="text-accent group-hover:underline">{t("home.start")}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
