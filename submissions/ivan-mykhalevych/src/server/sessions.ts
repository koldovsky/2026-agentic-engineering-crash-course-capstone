import { createHash, randomBytes } from "node:crypto";
import type { Db } from "./db";
import type { User } from "./users";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const TOKEN_BYTES = 32;
export const MAX_SESSIONS_PER_USER = 10;

interface SessionRow {
  expires_at: number;
  id: number;
  email: string;
  display_name: string;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSession(db: Db, userId: number, now: number): string {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(
    hashToken(token),
    userId,
    now + SESSION_TTL_MS,
  );
  db.prepare(
    `DELETE FROM sessions WHERE user_id = ? AND token_hash NOT IN (
       SELECT token_hash FROM sessions WHERE user_id = ? ORDER BY expires_at DESC, rowid DESC LIMIT ?
     )`,
  ).run(userId, userId, MAX_SESSIONS_PER_USER);
  return token;
}

export function getSessionUser(db: Db, token: string, now: number): User | null {
  if (token === "") return null;
  const tokenHash = hashToken(token);
  const row = db
    .prepare(
      `SELECT s.expires_at AS expires_at, u.id AS id, u.email AS email, u.display_name AS display_name
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`,
    )
    .get(tokenHash) as unknown as SessionRow | undefined;
  if (!row) return null;
  if (row.expires_at <= now) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
    return null;
  }
  return { id: row.id, email: row.email, displayName: row.display_name };
}

export function deleteSession(db: Db, token: string): void {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}

export function deleteUserSessions(db: Db, userId: number, exceptToken?: string): void {
  if (exceptToken === undefined) {
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
    return;
  }
  db.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?").run(userId, hashToken(exceptToken));
}
