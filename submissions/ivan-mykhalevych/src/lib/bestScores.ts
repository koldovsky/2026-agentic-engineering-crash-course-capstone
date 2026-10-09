import { LEVELS } from "./types";
import type { Level } from "./types";

export type BestScores = Partial<Record<Level, number>>;

export const LEGACY_BEST_SCORES_KEY = "java-trainer-best-scores";

function isPercent(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100;
}

export function parseBestScores(raw: string | null): BestScores {
  if (raw === null) return {};
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) return {};
  const record = data as Record<string, unknown>;
  const scores: BestScores = {};
  for (const level of LEVELS) {
    const value = record[level];
    if (isPercent(value)) scores[level] = value;
  }
  return scores;
}

export function withBestScore(scores: BestScores, level: Level, percent: number): BestScores {
  return { ...scores, [level]: Math.max(scores[level] ?? 0, percent) };
}

export const BEST_KEY_BASE = "java-trainer-best";

export function mergeBestScores(a: BestScores, b: BestScores): BestScores {
  const merged: BestScores = {};
  for (const level of LEVELS) {
    const scores = [a[level], b[level]].filter((score): score is number => score !== undefined);
    if (scores.length > 0) merged[level] = Math.max(...scores);
  }
  return merged;
}

export function mergeStoredBestScores(profileText: string | null, legacyText: string | null): string {
  return JSON.stringify(mergeBestScores(parseBestScores(profileText), parseBestScores(legacyText)));
}
