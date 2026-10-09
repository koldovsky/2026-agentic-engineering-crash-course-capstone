import { MAX_ATTEMPTS, parseAttempts } from "../lib/attempts";
import type { Attempt } from "../lib/attempts";
import { mergeBestScores, parseBestScores } from "../lib/bestScores";
import type { BestScores } from "../lib/bestScores";
import { transaction } from "./db";
import type { Db } from "./db";

export interface AccountData {
  best: BestScores;
  attempts: Attempt[];
}

export type RecordResult = { ok: true } | { ok: false; error: "attempt-invalid" };
export type ImportInput = { best?: unknown; attempts?: unknown };

export const MAX_STORED_ATTEMPTS = MAX_ATTEMPTS;

function insertAttempt(db: Db, userId: number, attempt: Attempt): void {
  db.prepare("INSERT INTO attempts (user_id, at, data) VALUES (?, ?, ?)").run(
    userId,
    attempt.at,
    JSON.stringify(attempt),
  );
}

function raiseBest(db: Db, userId: number, level: string, percent: number): void {
  db.prepare(
    `INSERT INTO best_scores (user_id, level, percent) VALUES (?, ?, ?)
     ON CONFLICT(user_id, level) DO UPDATE SET percent = MAX(percent, excluded.percent)`,
  ).run(userId, level, percent);
}

function trimAttempts(db: Db, userId: number): void {
  db.prepare(
    `DELETE FROM attempts WHERE user_id = ? AND id NOT IN (
       SELECT id FROM attempts WHERE user_id = ? ORDER BY at DESC, id DESC LIMIT ?
     )`,
  ).run(userId, userId, MAX_STORED_ATTEMPTS);
}

export function getData(db: Db, userId: number): AccountData {
  const bestRows = db
    .prepare("SELECT level, percent FROM best_scores WHERE user_id = ?")
    .all(userId) as unknown as { level: string; percent: number }[];
  const best = parseBestScores(JSON.stringify(Object.fromEntries(bestRows.map((row) => [row.level, row.percent]))));

  const attemptRows = db
    .prepare("SELECT data FROM attempts WHERE user_id = ? ORDER BY at ASC, id ASC")
    .all(userId) as unknown as { data: string }[];
  const attempts = parseAttempts(`[${attemptRows.map((row) => row.data).join(",")}]`);

  return { best, attempts };
}

export function recordAttempt(db: Db, userId: number, attempt: unknown): RecordResult {
  const [valid] = parseAttempts(JSON.stringify([attempt ?? null]));
  if (valid === undefined) return { ok: false, error: "attempt-invalid" };
  transaction(db, () => {
    insertAttempt(db, userId, valid);
    raiseBest(db, userId, valid.level, valid.percent);
    trimAttempts(db, userId);
  });
  return { ok: true };
}

export function importData(db: Db, userId: number, input: ImportInput): AccountData {
  const incomingBest = parseBestScores(JSON.stringify(input.best ?? null));
  const incomingAttempts = parseAttempts(
    JSON.stringify(Array.isArray(input.attempts) ? input.attempts.slice(0, MAX_STORED_ATTEMPTS) : []),
  );

  return transaction(db, () => {
    const existing = getData(db, userId);
    const byTime = new Map<number, Attempt>();
    for (const attempt of [...existing.attempts, ...incomingAttempts]) {
      if (!byTime.has(attempt.at)) byTime.set(attempt.at, attempt);
    }
    const merged = [...byTime.values()].sort((a, b) => a.at - b.at).slice(-MAX_STORED_ATTEMPTS);

    db.prepare("DELETE FROM attempts WHERE user_id = ?").run(userId);
    for (const attempt of merged) insertAttempt(db, userId, attempt);

    const best = mergeBestScores(existing.best, incomingBest);
    for (const [level, percent] of Object.entries(best)) raiseBest(db, userId, level, percent);

    return getData(db, userId);
  });
}
