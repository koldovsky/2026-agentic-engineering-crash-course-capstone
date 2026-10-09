import { notFound } from "next/navigation";
import QuizView from "@/components/QuizView";
import { getQuestions } from "@/lib/questions";
import { LEVELS } from "@/lib/types";
import type { Level } from "@/lib/types";

export function generateStaticParams() {
  return LEVELS.map((level) => ({ level }));
}

export default async function QuizPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!(LEVELS as readonly string[]).includes(level)) notFound();

  return <QuizView level={level as Level} questions={getQuestions(level as Level)} />;
}
