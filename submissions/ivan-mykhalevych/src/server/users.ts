import type { Db } from "./db";

export interface User {
  id: number;
  email: string;
  displayName: string;
}

export interface UserRecord extends User {
  passwordHash: string;
  createdAt: number;
}

export interface NewUser {
  email: string;
  displayName: string;
  passwordHash: string;
}

interface UserRow {
  id: number;
  email: string;
  display_name: string;
  password_hash: string;
  created_at: number;
}

const SELECT_USER = "SELECT id, email, display_name, password_hash, created_at FROM users";

function toRecord(row: UserRow | undefined): UserRecord | null {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && error.message.includes("UNIQUE constraint failed");
}

export function createUser(db: Db, user: NewUser, now: number): User | "email-taken" {
  try {
    const result = db
      .prepare("INSERT INTO users (email, display_name, password_hash, created_at) VALUES (?, ?, ?, ?)")
      .run(user.email, user.displayName, user.passwordHash, now);
    return { id: Number(result.lastInsertRowid), email: user.email, displayName: user.displayName };
  } catch (error) {
    if (isUniqueViolation(error)) return "email-taken";
    throw error;
  }
}

export function findUserByEmail(db: Db, email: string): UserRecord | null {
  return toRecord(db.prepare(`${SELECT_USER} WHERE email = ?`).get(email) as unknown as UserRow | undefined);
}

export function findUserById(db: Db, id: number): UserRecord | null {
  return toRecord(db.prepare(`${SELECT_USER} WHERE id = ?`).get(id) as unknown as UserRow | undefined);
}

export function updateDisplayName(db: Db, id: number, displayName: string): void {
  db.prepare("UPDATE users SET display_name = ? WHERE id = ?").run(displayName, id);
}

export function updatePasswordHash(db: Db, id: number, passwordHash: string): void {
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, id);
}

export function deleteUser(db: Db, id: number): void {
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
}
