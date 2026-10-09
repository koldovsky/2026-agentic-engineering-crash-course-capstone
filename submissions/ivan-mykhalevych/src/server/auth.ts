import { validateDisplayName, validateEmail, validatePassword } from "../lib/auth/validation";
import type { DisplayNameError, PasswordError } from "../lib/auth/validation";
import { transaction } from "./db";
import type { Db } from "./db";
import { hashPassword, verifyPassword } from "./password";
import { createSession, deleteSession, deleteUserSessions } from "./sessions";
import {
  createUser,
  deleteUser,
  findUserByEmail,
  findUserById,
  updateDisplayName,
  updatePasswordHash,
} from "./users";
import type { User, UserRecord } from "./users";

export type AuthError =
  | "email-invalid"
  | PasswordError
  | DisplayNameError
  | "email-taken"
  | "invalid-credentials"
  | "too-many-attempts"
  | "too-many-registrations";

export type AuthResult = { ok: true; user: User; token: string } | { ok: false; error: AuthError };
export type ActionResult = { ok: true } | { ok: false; error: AuthError };
export type UserResult = { ok: true; user: User } | { ok: false; error: AuthError };

export const MAX_FAILED_LOGINS = 5;
export const LOCK_WINDOW_MS = 15 * 60 * 1000;
export const MAX_REGISTRATIONS_PER_HOUR = 30;
const HOUR_MS = 60 * 60 * 1000;

export interface Credentials {
  email: string;
  password: string;
}

export interface Registration extends Credentials {
  displayName: string;
}

interface FailureRow {
  count: number;
  window_start: number;
}

let dummyHash: string | null = null;

function timingDummyHash(): string {
  dummyHash ??= hashPassword("dummy password used only to equalize timing");
  return dummyHash;
}

function registrationsLastHour(db: Db, now: number): number {
  const row = db.prepare("SELECT COUNT(*) AS count FROM users WHERE created_at > ?").get(now - HOUR_MS) as unknown as {
    count: number;
  };
  return row.count;
}

function toPublicUser(record: UserRecord): User {
  return { id: record.id, email: record.email, displayName: record.displayName };
}

function readFailures(db: Db, email: string, now: number): FailureRow | null {
  const row = db
    .prepare("SELECT count, window_start FROM login_failures WHERE email = ?")
    .get(email) as unknown as FailureRow | undefined;
  if (!row) return null;
  if (now - row.window_start >= LOCK_WINDOW_MS) {
    db.prepare("DELETE FROM login_failures WHERE email = ?").run(email);
    return null;
  }
  return row;
}

function recordFailure(db: Db, email: string, now: number): void {
  db.prepare("DELETE FROM login_failures WHERE window_start <= ?").run(now - LOCK_WINDOW_MS);
  const current = readFailures(db, email, now);
  if (current === null) {
    db.prepare("INSERT INTO login_failures (email, count, window_start) VALUES (?, 1, ?)").run(email, now);
    return;
  }
  db.prepare("UPDATE login_failures SET count = count + 1 WHERE email = ?").run(email);
}

function clearFailures(db: Db, email: string): void {
  db.prepare("DELETE FROM login_failures WHERE email = ?").run(email);
}

function checkPassword(
  db: Db,
  email: string,
  record: UserRecord | null,
  password: string,
  now: number,
): "ok" | "invalid-credentials" | "too-many-attempts" {
  const failures = readFailures(db, email, now);
  if (failures !== null && failures.count >= MAX_FAILED_LOGINS) return "too-many-attempts";
  const valid = verifyPassword(password, record ? record.passwordHash : timingDummyHash());
  if (record && valid) {
    clearFailures(db, email);
    return "ok";
  }
  recordFailure(db, email, now);
  return "invalid-credentials";
}

export function register(db: Db, input: Registration, now: number): AuthResult {
  const email = validateEmail(input.email);
  if (!email.ok) return email;
  const password = validatePassword(input.password);
  if (!password.ok) return password;
  const name = validateDisplayName(input.displayName);
  if (!name.ok) return name;

  if (registrationsLastHour(db, now) >= MAX_REGISTRATIONS_PER_HOUR) return { ok: false, error: "too-many-registrations" };
  const passwordHash = hashPassword(input.password);
  return transaction(db, (): AuthResult => {
    const created = createUser(db, { email: email.email, displayName: name.name, passwordHash }, now);
    if (created === "email-taken") return { ok: false, error: "email-taken" };
    return { ok: true, user: created, token: createSession(db, created.id, now) };
  });
}

export function login(db: Db, input: Credentials, now: number): AuthResult {
  const email = validateEmail(input.email);
  if (!email.ok) {
    verifyPassword(input.password, timingDummyHash());
    return { ok: false, error: "invalid-credentials" };
  }
  const record = findUserByEmail(db, email.email);
  const status = checkPassword(db, email.email, record, input.password, now);
  if (status !== "ok" || record === null) {
    return { ok: false, error: status === "ok" ? "invalid-credentials" : status };
  }
  return { ok: true, user: toPublicUser(record), token: createSession(db, record.id, now) };
}

export function logout(db: Db, token: string): void {
  deleteSession(db, token);
}

export function changePassword(
  db: Db,
  userId: number,
  current: string,
  next: string,
  currentToken: string,
  now: number,
): ActionResult {
  const record = findUserById(db, userId);
  if (record === null) return { ok: false, error: "invalid-credentials" };
  const status = checkPassword(db, record.email, record, current, now);
  if (status !== "ok") return { ok: false, error: status };
  const password = validatePassword(next);
  if (!password.ok) return password;

  const newHash = hashPassword(next);
  transaction(db, () => {
    updatePasswordHash(db, userId, newHash);
    deleteUserSessions(db, userId, currentToken);
  });
  return { ok: true };
}

export function changeDisplayName(db: Db, userId: number, displayName: string): UserResult {
  const name = validateDisplayName(displayName);
  if (!name.ok) return name;
  updateDisplayName(db, userId, name.name);
  const record = findUserById(db, userId);
  if (record === null) return { ok: false, error: "invalid-credentials" };
  return { ok: true, user: toPublicUser(record) };
}

export function deleteAccount(db: Db, userId: number, password: string, now: number): ActionResult {
  const record = findUserById(db, userId);
  if (record === null) return { ok: false, error: "invalid-credentials" };
  const status = checkPassword(db, record.email, record, password, now);
  if (status !== "ok") return { ok: false, error: status };
  deleteUser(db, userId);
  clearFailures(db, record.email);
  return { ok: true };
}
