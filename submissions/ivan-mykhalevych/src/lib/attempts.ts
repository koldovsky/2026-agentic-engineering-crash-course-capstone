import { scoreQuiz } from "./scoring";
import { LEVELS } from "./types";
import type { Level, Question } from "./types";

export interface AttemptResult {
  id: string;
  topic: string;
  correct: boolean;
}

export interface Attempt {
  at: number;
  level: Level;
  total: number;
  correct: number;
  percent: number;
  results: AttemptResult[];
}

export const MAX_ATTEMPTS = 200;
export const MAX_RESULTS = 100;
export const ATTEMPTS_KEY_BASE = "java-trainer-attempts";

function isLevel(value: unknown): value is Level {
  return typeof value === "string" && (LEVELS as readonly string[]).includes(value);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isResult(value: unknown): value is AttemptResult {
  if (typeof value !== "object" || value === null) return false;
  const { id, topic, correct } = value as Record<string, unknown>;
  return typeof id === "string" && typeof topic === "string" && typeof correct === "boolean";
}

function isConsistent(total: number, correct: number, percent: number, results: AttemptResult[]): boolean {
  const expectedPercent = total === 0 ? 0 : Math.round((correct / total) * 100);
  return (
    total === results.length &&
    correct === results.filter((result) => result.correct).length &&
    percent === expectedPercent
  );
}

function toAttempt(item: unknown): Attempt | null {
  if (typeof item !== "object" || item === null) return null;
  const { at, level, total, correct, percent, results } = item as Record<string, unknown>;
  if (typeof at !== "number" || !Number.isFinite(at)) return null;
  if (!isLevel(level) || !isCount(total) || !isCount(correct) || correct > total) return null;
  if (!isCount(percent) || percent > 100) return null;
  if (!Array.isArray(results) || results.length > MAX_RESULTS || !results.every(isResult)) return null;
  if (!isConsistent(total, correct, percent, results)) return null;
  return { at, level, total, correct, percent, results };
}

export function buildAttempt(
  level: Level,
  questions: Question[],
  answers: (number | null)[],
  now: number,
): Attempt {
  const { correct, total, percent } = scoreQuiz(questions, answers);
  const results = questions.map((question, i) => ({
    id: question.id,
    topic: question.topic,
    correct: answers[i] === question.correctIndex,
  }));
  return { at: now, level, total, correct, percent, results };
}

export function parseAttempts(raw: string | null): Attempt[] {
  if (raw === null) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const attempts = data.map(toAttempt).filter((attempt): attempt is Attempt => attempt !== null);
  return attempts.slice(-MAX_ATTEMPTS);
}

export function appendAttempt(log: Attempt[], attempt: Attempt, cap: number = MAX_ATTEMPTS): Attempt[] {
  return [...log, attempt].slice(-cap);
}
