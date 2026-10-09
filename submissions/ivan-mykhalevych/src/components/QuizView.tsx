"use client";

import Link from "next/link";
import QuizRunner from "@/components/QuizRunner";
import type { Level, Question } from "@/lib/types";
import { useT } from "@/lib/useLanguage";

export default function QuizView({ level, questions }: { level: Level; questions: Question[] }) {
  const { t } = useT();
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10 sm:py-16">
      <Link href="/" className="text-sm text-muted hover:text-accent">
        {t("quiz.back")}
      </Link>
      <h1 className="mt-3 mb-6 text-3xl font-bold">
        <span className="text-accent">{t("quiz.title", { level: level.charAt(0).toUpperCase() + level.slice(1) })}</span>
      </h1>
      <QuizRunner level={level} questions={questions} />
    </main>
  );
}
