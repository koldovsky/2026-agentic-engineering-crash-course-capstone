import { beforeEach, describe, expect, it } from "vitest";
import {
  LOCK_WINDOW_MS,
  MAX_REGISTRATIONS_PER_HOUR,
  MAX_FAILED_LOGINS,
  changeDisplayName,
  changePassword,
  deleteAccount,
  login,
  logout,
  register,
} from "./auth";
import { openDatabase } from "./db";
import type { Db } from "./db";
import { getSessionUser } from "./sessions";
import { createUser, findUserByEmail, findUserById } from "./users";

let db: Db;
const NOW = 1_700_000_000_000;
const PASSWORD = "correct horse battery";
const OTHER_PASSWORD = "tr0ub4dor&3-staple";

const signUp = (email = "ann@example.com", now = NOW) =>
  register(db, { email, password: PASSWORD, displayName: "Ann" }, now);

function mustRegister(email = "ann@example.com") {
  const result = signUp(email);
  if (!result.ok) throw new Error(`registration failed: ${result.error}`);
  return result;
}

const wrongLogin = (now: number, email = "ann@example.com") => login(db, { email, password: "wrong password!!" }, now);

beforeEach(() => {
  db = openDatabase(":memory:");
});

describe("register (spec R24)", () => {
  it("creates the account, normalizes the email and starts a session", () => {
    const result = register(db, { email: "  Ann@Example.COM ", password: PASSWORD, displayName: " Ann " }, NOW);
    expect(result).toMatchObject({ ok: true, user: { email: "ann@example.com", displayName: "Ann" } });
    if (!result.ok) return;
    expect(getSessionUser(db, result.token, NOW)).toEqual(result.user);
  });

  it("stores only a scrypt hash, never the password", () => {
    mustRegister();
    const stored = findUserByEmail(db, "ann@example.com")!.passwordHash;
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(stored).not.toContain(PASSWORD);
  });

  it("returns validation codes and creates nothing", () => {
    expect(register(db, { email: "nope", password: PASSWORD, displayName: "Ann" }, NOW)).toEqual({ ok: false, error: "email-invalid" });
    expect(register(db, { email: "a@b.co", password: "short", displayName: "Ann" }, NOW)).toEqual({ ok: false, error: "password-short" });
    expect(register(db, { email: "a@b.co", password: "Password123", displayName: "Ann" }, NOW)).toEqual({ ok: false, error: "password-common" });
    expect(register(db, { email: "a@b.co", password: PASSWORD, displayName: "  " }, NOW)).toEqual({ ok: false, error: "name-empty" });
    expect(db.prepare("SELECT COUNT(*) AS n FROM users").get()).toEqual({ n: 0 });
  });

  it("refuses a duplicate email regardless of case", () => {
    mustRegister("ann@example.com");
    expect(signUp("ANN@Example.com")).toEqual({ ok: false, error: "email-taken" });
  });

  it("never puts the password hash or the password into the result", () => {
    const text = JSON.stringify(mustRegister());
    expect(text).not.toContain("scrypt$");
    expect(text).not.toContain(PASSWORD);
  });
});

describe("login (spec R24)", () => {
  it("logs in with the right password and starts a fresh session each time", () => {
    const registered = mustRegister();
    const first = login(db, { email: " ANN@example.com", password: PASSWORD }, NOW);
    const second = login(db, { email: "ann@example.com", password: PASSWORD }, NOW);
    expect(first).toMatchObject({ ok: true, user: { email: "ann@example.com" } });
    if (!first.ok || !second.ok) throw new Error("login failed");
    expect(new Set([registered.token, first.token, second.token]).size).toBe(3);
    expect(getSessionUser(db, first.token, NOW)).not.toBeNull();
  });

  it("gives the same error for a wrong password, an unknown email and a malformed email", () => {
    mustRegister();
    const expected = { ok: false, error: "invalid-credentials" };
    expect(wrongLogin(NOW)).toEqual(expected);
    expect(wrongLogin(NOW, "nobody@example.com")).toEqual(expected);
    expect(wrongLogin(NOW, "not an email")).toEqual(expected);
  });

  it("locks the account after five failures, even for the right password", () => {
    mustRegister();
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) {
      expect(wrongLogin(NOW + i * 1000)).toEqual({ ok: false, error: "invalid-credentials" });
    }
    expect(login(db, { email: "ann@example.com", password: PASSWORD }, NOW + 6000)).toEqual({ ok: false, error: "too-many-attempts" });
    expect(login(db, { email: "ann@example.com", password: PASSWORD }, NOW + LOCK_WINDOW_MS - 1000)).toEqual({
      ok: false,
      error: "too-many-attempts",
    });
  });

  it("allows the right password again after the lock window", () => {
    mustRegister();
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) wrongLogin(NOW);
    expect(login(db, { email: "ann@example.com", password: PASSWORD }, NOW + LOCK_WINDOW_MS + 1000)).toMatchObject({ ok: true });
  });

  it("resets the counter after a successful login", () => {
    mustRegister();
    for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++) wrongLogin(NOW);
    expect(login(db, { email: "ann@example.com", password: PASSWORD }, NOW + 1000)).toMatchObject({ ok: true });
    for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++) wrongLogin(NOW + 2000);
    expect(login(db, { email: "ann@example.com", password: PASSWORD }, NOW + 3000)).toMatchObject({ ok: true });
  });

  it("throttles per email and treats unknown emails the same way", () => {
    mustRegister("ann@example.com");
    mustRegister("bob@example.com");
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) wrongLogin(NOW, "ann@example.com");
    expect(login(db, { email: "bob@example.com", password: PASSWORD }, NOW + 1000)).toMatchObject({ ok: true });
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) wrongLogin(NOW, "ghost@example.com");
    expect(wrongLogin(NOW + 1000, "ghost@example.com")).toEqual({ ok: false, error: "too-many-attempts" });
  });
});

describe("logout (spec R24)", () => {
  it("ends only that session", () => {
    const first = mustRegister();
    const second = login(db, { email: "ann@example.com", password: PASSWORD }, NOW);
    if (!second.ok) throw new Error("login failed");
    logout(db, first.token);
    expect(getSessionUser(db, first.token, NOW)).toBeNull();
    expect(getSessionUser(db, second.token, NOW)).not.toBeNull();
  });
});

describe("changePassword (spec R24)", () => {
  it("needs the current password and counts wrong tries toward the lock", () => {
    const { user, token } = mustRegister();
    expect(changePassword(db, user.id, "wrong password!!", OTHER_PASSWORD, token, NOW)).toEqual({ ok: false, error: "invalid-credentials" });
    for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++) changePassword(db, user.id, "wrong password!!", OTHER_PASSWORD, token, NOW);
    expect(changePassword(db, user.id, PASSWORD, OTHER_PASSWORD, token, NOW)).toEqual({ ok: false, error: "too-many-attempts" });
  });

  it("validates the new password", () => {
    const { user, token } = mustRegister();
    expect(changePassword(db, user.id, PASSWORD, "short", token, NOW)).toEqual({ ok: false, error: "password-short" });
    expect(login(db, { email: "ann@example.com", password: PASSWORD }, NOW)).toMatchObject({ ok: true });
  });

  it("switches the password and ends every other session but keeps the current one", () => {
    const { user, token } = mustRegister();
    const other = login(db, { email: "ann@example.com", password: PASSWORD }, NOW);
    if (!other.ok) throw new Error("login failed");
    expect(changePassword(db, user.id, PASSWORD, OTHER_PASSWORD, token, NOW)).toEqual({ ok: true });
    expect(getSessionUser(db, token, NOW)).not.toBeNull();
    expect(getSessionUser(db, other.token, NOW)).toBeNull();
    expect(login(db, { email: "ann@example.com", password: PASSWORD }, NOW + 1000)).toEqual({ ok: false, error: "invalid-credentials" });
    expect(login(db, { email: "ann@example.com", password: OTHER_PASSWORD }, NOW + 2000)).toMatchObject({ ok: true });
  });
});

describe("changeDisplayName (spec R24)", () => {
  it("updates a valid name and rejects invalid ones", () => {
    const { user } = mustRegister();
    expect(changeDisplayName(db, user.id, " Annie ")).toEqual({ ok: true, user: { id: user.id, email: "ann@example.com", displayName: "Annie" } });
    expect(changeDisplayName(db, user.id, "")).toEqual({ ok: false, error: "name-empty" });
    expect(changeDisplayName(db, user.id, "x".repeat(25))).toEqual({ ok: false, error: "name-too-long" });
    expect(findUserById(db, user.id)?.displayName).toBe("Annie");
  });
});

describe("deleteAccount (spec R24)", () => {
  it("needs the password", () => {
    const { user, token } = mustRegister();
    expect(deleteAccount(db, user.id, "wrong password!!", NOW)).toEqual({ ok: false, error: "invalid-credentials" });
    expect(findUserById(db, user.id)).not.toBeNull();
    expect(getSessionUser(db, token, NOW)).not.toBeNull();
  });

  it("removes the user, the sessions and all data", () => {
    const { user, token } = mustRegister();
    db.prepare("INSERT INTO best_scores (user_id, level, percent) VALUES (?, ?, ?)").run(user.id, "junior", 50);
    db.prepare("INSERT INTO attempts (user_id, at, data) VALUES (?, ?, ?)").run(user.id, NOW, "{}");
    expect(deleteAccount(db, user.id, PASSWORD, NOW)).toEqual({ ok: true });
    expect(findUserById(db, user.id)).toBeNull();
    expect(getSessionUser(db, token, NOW)).toBeNull();
    for (const table of ["best_scores", "attempts"]) {
      expect(db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()).toEqual({ n: 0 });
    }
    expect(login(db, { email: "ann@example.com", password: PASSWORD }, NOW)).toEqual({ ok: false, error: "invalid-credentials" });
  });
});

describe("housekeeping (spec R24)", () => {
  it("removes expired failure rows when a new failure is recorded", () => {
    wrongLogin(NOW, "old@example.com");
    wrongLogin(NOW + LOCK_WINDOW_MS + 1, "new@example.com");
    const rows = db.prepare("SELECT email FROM login_failures").all() as { email: string }[];
    expect(rows.map((row) => row.email)).toEqual(["new@example.com"]);
  });
});

describe("registration limit (spec R24)", () => {
  const HOUR = 60 * 60 * 1000;
  const fill = (count: number) => {
    for (let i = 0; i < count; i++) createUser(db, { email: `u${i}@example.com`, displayName: "U", passwordHash: "h" }, NOW);
  };

  it("refuses a new account when the limit was reached within the last hour", () => {
    expect(MAX_REGISTRATIONS_PER_HOUR).toBe(30);
    fill(MAX_REGISTRATIONS_PER_HOUR);
    expect(register(db, { email: "late@example.com", password: PASSWORD, displayName: "L" }, NOW + 1000)).toEqual({
      ok: false,
      error: "too-many-registrations",
    });
    expect(findUserByEmail(db, "late@example.com")).toBeNull();
  });

  it("allows registration again once the accounts are older than an hour", () => {
    fill(MAX_REGISTRATIONS_PER_HOUR);
    expect(register(db, { email: "late@example.com", password: PASSWORD, displayName: "L" }, NOW + HOUR + 1).ok).toBe(true);
  });

  it("allows registration just below the limit and does not affect login", () => {
    mustRegister();
    fill(MAX_REGISTRATIONS_PER_HOUR - 2);
    expect(register(db, { email: "last@example.com", password: PASSWORD, displayName: "L" }, NOW).ok).toBe(true);
    expect(login(db, { email: "ann@example.com", password: PASSWORD }, NOW + 1).ok).toBe(true);
  });
});
