import type { Attempt } from "./attempts";

export interface TopicMastery {
  topic: string;
  correct: number;
  total: number;
  percent: number;
}

const DEFAULT_WEAKEST_COUNT = 3;
const DEFAULT_MIN_ANSWERED = 3;

export function masteryByTopic(attempts: Attempt[]): TopicMastery[] {
  const totals = new Map<string, { correct: number; total: number }>();
  for (const attempt of attempts) {
    for (const result of attempt.results) {
      const entry = totals.get(result.topic) ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (result.correct) entry.correct += 1;
      totals.set(result.topic, entry);
    }
  }
  return [...totals.entries()]
    .map(([topic, { correct, total }]) => ({
      topic,
      correct,
      total,
      percent: Math.round((correct / total) * 100),
    }))
    .sort((a, b) => a.topic.localeCompare(b.topic));
}

export function weakestTopics(
  mastery: TopicMastery[],
  count: number = DEFAULT_WEAKEST_COUNT,
  minAnswered: number = DEFAULT_MIN_ANSWERED,
): TopicMastery[] {
  return mastery
    .filter((entry) => entry.total >= minAnswered)
    .sort((a, b) => a.percent - b.percent || a.topic.localeCompare(b.topic))
    .slice(0, count);
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function daysBefore(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - days);
}

export function currentStreak(attempts: Attempt[], now: number): number {
  const activeDays = new Set(attempts.map((attempt) => dayKey(new Date(attempt.at))));
  const today = new Date(now);
  const start = activeDays.has(dayKey(today)) ? 0 : 1;
  let streak = 0;
  while (activeDays.has(dayKey(daysBefore(today, start + streak)))) streak += 1;
  return streak;
}

export interface ProgressSummary {
  attemptCount: number;
  streak: number;
  mastery: TopicMastery[];
  weakest: TopicMastery[];
}

export function summarizeProgress(attempts: Attempt[], now: number): ProgressSummary {
  const mastery = masteryByTopic(attempts);
  return {
    attemptCount: attempts.length,
    streak: currentStreak(attempts, now),
    mastery,
    weakest: weakestTopics(mastery),
  };
}
