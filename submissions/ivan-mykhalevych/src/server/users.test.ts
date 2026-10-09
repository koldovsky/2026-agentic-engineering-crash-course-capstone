import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "./db";
import type { Db } from "./db";
import { createUser, deleteUser, findUserByEmail, findUserById, updateDisplayName, updatePasswordHash } from "./users";
import type { User } from "./users";

let db: Db;
const NOW = 1_700_000_000_000;
const newUser = (email: string) => ({ email, displayName: "Ann", passwordHash: "hash-" + email });

function created(email: string): User {
  const result = createUser(db, newUser(email), NOW);
  if (result === "email-taken") throw new Error("unexpected");
  return result;
}

beforeEach(() => {
  db = openDatabase(":memory:");
});

describe("users (spec R20)", () => {
  it("creates a user and finds it by email and by id", () => {
    const user = created("ann@example.com");
    expect(user).toEqual({ id: expect.any(Number), email: "ann@example.com", displayName: "Ann" });
    expect(findUserByEmail(db, "ann@example.com")).toMatchObject({ ...user, passwordHash: "hash-ann@example.com", createdAt: NOW });
    expect(findUserById(db, user.id)).toMatchObject({ email: "ann@example.com" });
  });

  it("returns null for an unknown email or id", () => {
    expect(findUserByEmail(db, "nobody@example.com")).toBeNull();
    expect(findUserById(db, 999)).toBeNull();
  });

  it("refuses a second account with the same email", () => {
    created("ann@example.com");
    expect(createUser(db, newUser("ann@example.com"), NOW)).toBe("email-taken");
  });

  it("gives different users different ids", () => {
    expect(created("a@example.com").id).not.toBe(created("b@example.com").id);
  });

  it("updates the display name and the password hash", () => {
    const user = created("ann@example.com");
    updateDisplayName(db, user.id, "Annie");
    updatePasswordHash(db, user.id, "new-hash");
    expect(findUserById(db, user.id)).toMatchObject({ displayName: "Annie", passwordHash: "new-hash" });
  });

  it("deletes the user together with sessions, best scores and attempts", () => {
    const user = created("ann@example.com");
    db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run("h", user.id, NOW + 1);
    db.prepare("INSERT INTO best_scores (user_id, level, percent) VALUES (?, ?, ?)").run(user.id, "junior", 50);
    db.prepare("INSERT INTO attempts (user_id, at, data) VALUES (?, ?, ?)").run(user.id, NOW, "{}");
    deleteUser(db, user.id);
    expect(findUserById(db, user.id)).toBeNull();
    for (const table of ["sessions", "best_scores", "attempts"]) {
      expect(db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()).toEqual({ n: 0 });
    }
  });

  it("does not interpret SQL in an email", () => {
    const hostile = "x'); DROP TABLE users; --@example.com";
    expect(createUser(db, newUser(hostile), NOW)).toMatchObject({ email: hostile });
    expect(findUserByEmail(db, hostile)).not.toBeNull();
    expect(db.prepare("SELECT COUNT(*) AS n FROM users").get()).toEqual({ n: 1 });
  });
});
