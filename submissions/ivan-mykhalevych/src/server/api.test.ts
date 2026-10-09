import { beforeEach, describe, expect, it } from "vitest";
import { handleApi } from "./api";
import type { ApiResponse } from "./api";
import { openDatabase } from "./db";
import type { Db } from "./db";
import { createUser } from "./users";

const NOW = 1_000_000;
const PASSWORD = "correct horse battery";

let db: Db;

interface Options {
  cookie?: string | null;
  origin?: string | null;
  host?: string | null;
  contentType?: string | null;
  raw?: string;
  secure?: boolean;
}

function call(method: string, path: string, body?: unknown, options: Options = {}): ApiResponse {
  const raw = options.raw ?? (body === undefined ? "" : JSON.stringify(body));
  return handleApi(
    db,
    {
      method,
      path,
      origin: options.origin === undefined ? "http://localhost:3000" : options.origin,
      host: options.host === undefined ? "localhost:3000" : options.host,
      contentType: options.contentType === undefined ? "application/json" : options.contentType,
      cookie: options.cookie ?? null,
      body: raw,
    },
    NOW,
    options.secure ?? false,
  );
}

function cookieOf(response: ApiResponse): string {
  return (response.setCookie ?? "").split(";")[0];
}

function signUp(email = "ann@example.com", displayName = "Ann"): string {
  const response = call("POST", "/api/auth/register", { email, password: PASSWORD, displayName });
  expect(response.status).toBe(201);
  return cookieOf(response);
}

const attempt = (at: number, percent = 50) => ({
  at,
  level: "junior",
  total: 10,
  correct: percent / 10,
  percent,
  results: Array.from({ length: 10 }, (_, i) => ({ id: `q${i}`, topic: "Basics", correct: i < percent / 10 })),
});

beforeEach(() => {
  db = openDatabase(":memory:");
});

describe("register and login (spec R26)", () => {
  it("registers, returns the public user and sets a hardened session cookie", () => {
    const response = call("POST", "/api/auth/register", { email: "Ann@Example.com", password: PASSWORD, displayName: "Ann" });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ user: { id: expect.any(Number), email: "ann@example.com", displayName: "Ann" } });
    expect(response.setCookie).toMatch(/^session=[A-Za-z0-9_-]{20,};/);
    expect(response.setCookie).toContain("HttpOnly");
    expect(response.setCookie).toContain("SameSite=Lax");
    expect(response.setCookie).toContain("Path=/");
    expect(response.setCookie).toContain("Max-Age=2592000");
    expect(response.setCookie).not.toContain("Secure");
    expect(JSON.stringify(response.body)).not.toMatch(/token|hash|scrypt/i);
  });

  it("adds Secure to the cookie in production", () => {
    const response = call("POST", "/api/auth/register", { email: "a@b.co", password: PASSWORD, displayName: "A" }, { secure: true });
    expect(response.setCookie).toContain("Secure");
  });

  it("answers validation errors with 400 and a code", () => {
    const bad = (body: unknown) => call("POST", "/api/auth/register", body);
    expect(bad({ email: "no-at", password: PASSWORD, displayName: "A" })).toMatchObject({ status: 400, body: { error: "email-invalid" } });
    expect(bad({ email: "a@b.co", password: "short", displayName: "A" })).toMatchObject({ status: 400, body: { error: "password-short" } });
    expect(bad({ email: "a@b.co", password: PASSWORD, displayName: " " })).toMatchObject({ status: 400, body: { error: "name-empty" } });
    expect(bad({ email: 5, password: null, displayName: {} })).toMatchObject({ status: 400 });
    expect(bad({})).toMatchObject({ status: 400 });
  });

  it("answers 409 for a taken email", () => {
    signUp();
    const again = call("POST", "/api/auth/register", { email: "ann@example.com", password: PASSWORD, displayName: "X" });
    expect(again).toMatchObject({ status: 409, body: { error: "email-taken" } });
    expect(again.setCookie).toBeUndefined();
  });

  it("logs in with the right password and gives the same 401 for wrong password and unknown email", () => {
    signUp();
    const ok = call("POST", "/api/auth/login", { email: "ann@example.com", password: PASSWORD });
    expect(ok.status).toBe(200);
    expect(ok.setCookie).toContain("session=");
    const wrong = call("POST", "/api/auth/login", { email: "ann@example.com", password: "wrong password!" });
    const unknown = call("POST", "/api/auth/login", { email: "nobody@example.com", password: "wrong password!" });
    expect(wrong).toEqual({ status: 401, body: { error: "invalid-credentials" } });
    expect(unknown).toEqual(wrong);
  });

  it("answers 429 after five failed logins", () => {
    signUp();
    for (let i = 0; i < 5; i++) call("POST", "/api/auth/login", { email: "ann@example.com", password: "wrong password!" });
    expect(call("POST", "/api/auth/login", { email: "ann@example.com", password: PASSWORD })).toMatchObject({
      status: 429,
      body: { error: "too-many-attempts" },
    });
  });
});

describe("me, logout, password, delete (spec R26)", () => {
  it("returns the signed-in user and 401 otherwise", () => {
    const cookie = signUp();
    expect(call("GET", "/api/auth/me", undefined, { cookie })).toMatchObject({ status: 200, body: { user: { email: "ann@example.com", displayName: "Ann" } } });
    expect(call("GET", "/api/auth/me")).toEqual({ status: 200, body: { user: null } });
    expect(call("GET", "/api/auth/me", undefined, { cookie: "session=bogus" })).toEqual({ status: 200, body: { user: null } });
    expect(call("PATCH", "/api/auth/me", { displayName: "x" }).status).toBe(401);
    expect(call("DELETE", "/api/auth/me", { password: "x" }).status).toBe(401);
  });

  it("finds the session cookie among other cookies", () => {
    const cookie = signUp();
    expect(call("GET", "/api/auth/me", undefined, { cookie: `theme=dark; ${cookie}; a=b` }).status).toBe(200);
  });

  it("changes the display name", () => {
    const cookie = signUp();
    expect(call("PATCH", "/api/auth/me", { displayName: "Annie" }, { cookie })).toMatchObject({ status: 200, body: { user: { displayName: "Annie" } } });
    expect(call("PATCH", "/api/auth/me", { displayName: "" }, { cookie })).toMatchObject({ status: 400, body: { error: "name-empty" } });
    expect(call("PATCH", "/api/auth/me", { displayName: "x" })).toMatchObject({ status: 401 });
  });

  it("logs out: the cookie is cleared and the session stops working", () => {
    const cookie = signUp();
    const response = call("POST", "/api/auth/logout", undefined, { cookie });
    expect(response).toMatchObject({ status: 200, body: { ok: true } });
    expect(response.setCookie).toContain("Max-Age=0");
    expect(call("GET", "/api/auth/me", undefined, { cookie })).toEqual({ status: 200, body: { user: null } });
    expect(call("POST", "/api/auth/logout")).toMatchObject({ status: 200 });
  });

  it("changes the password and revokes the other sessions", () => {
    const first = signUp();
    const second = cookieOf(call("POST", "/api/auth/login", { email: "ann@example.com", password: PASSWORD }));
    const newPassword = "another long passphrase";
    expect(call("POST", "/api/auth/password", { current: "wrong password!", next: newPassword }, { cookie: first })).toMatchObject({ status: 401, body: { error: "invalid-credentials" } });
    expect(call("POST", "/api/auth/password", { current: PASSWORD, next: "short" }, { cookie: first })).toMatchObject({ status: 400, body: { error: "password-short" } });
    expect(call("POST", "/api/auth/password", { current: PASSWORD, next: newPassword }, { cookie: first })).toMatchObject({ status: 200, body: { ok: true } });
    expect(call("GET", "/api/auth/me", undefined, { cookie: first }).status).toBe(200);
    expect(call("GET", "/api/auth/me", undefined, { cookie: second }).body).toEqual({ user: null });
    expect(call("POST", "/api/auth/login", { email: "ann@example.com", password: newPassword }).status).toBe(200);
    expect(call("POST", "/api/auth/password", { current: PASSWORD, next: newPassword })).toMatchObject({ status: 401, body: { error: "not-signed-in" } });
  });

  it("deletes the account only with the right password", () => {
    const cookie = signUp();
    expect(call("DELETE", "/api/auth/me", { password: "wrong password!" }, { cookie })).toMatchObject({ status: 401, body: { error: "invalid-credentials" } });
    const response = call("DELETE", "/api/auth/me", { password: PASSWORD }, { cookie });
    expect(response).toMatchObject({ status: 200, body: { ok: true } });
    expect(response.setCookie).toContain("Max-Age=0");
    expect(call("POST", "/api/auth/login", { email: "ann@example.com", password: PASSWORD }).status).toBe(401);
  });
});

describe("account data (spec R26)", () => {
  it("requires a session", () => {
    expect(call("GET", "/api/data").status).toBe(401);
    expect(call("POST", "/api/data/attempts", attempt(1)).status).toBe(401);
    expect(call("POST", "/api/data/import", { best: {}, attempts: [] }).status).toBe(401);
  });

  it("records attempts and returns best scores and attempts", () => {
    const cookie = signUp();
    expect(call("POST", "/api/data/attempts", attempt(1, 80), { cookie })).toMatchObject({ status: 200, body: { ok: true } });
    expect(call("POST", "/api/data/attempts", { nonsense: true }, { cookie })).toMatchObject({ status: 400, body: { error: "attempt-invalid" } });
    const data = call("GET", "/api/data", undefined, { cookie });
    expect(data.status).toBe(200);
    expect(data.body).toMatchObject({ best: { junior: 80 }, attempts: [{ at: 1 }] });
  });

  it("imports and merges", () => {
    const cookie = signUp();
    call("POST", "/api/data/attempts", attempt(1, 40), { cookie });
    const response = call("POST", "/api/data/import", { best: { middle: 30 }, attempts: [attempt(2, 70)] }, { cookie });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ best: { junior: 40, middle: 30 }, attempts: [{ at: 1 }, { at: 2 }] });
  });

  it("scopes data by the session, never by the request body", () => {
    const ann = signUp("ann@example.com", "Ann");
    const bob = signUp("bob@example.com", "Bob");
    call("POST", "/api/data/attempts", { ...attempt(1, 90), userId: 1, user_id: 1 }, { cookie: ann });
    call("POST", "/api/data/import", { userId: 1, best: { senior: 10 }, attempts: [] }, { cookie: bob });
    expect(call("GET", "/api/data", undefined, { cookie: ann }).body).toMatchObject({ best: { junior: 90 } });
    const bobData = call("GET", "/api/data", undefined, { cookie: bob }).body as { best: object; attempts: unknown[] };
    expect(bobData.best).toEqual({ senior: 10 });
    expect(bobData.attempts).toEqual([]);
  });
});

describe("request checks (spec R26)", () => {
  it("rejects state changes without a matching Origin", () => {
    const body = { email: "a@b.co", password: PASSWORD, displayName: "A" };
    expect(call("POST", "/api/auth/register", body, { origin: null })).toEqual({ status: 403, body: { error: "forbidden-origin" } });
    expect(call("POST", "/api/auth/register", body, { origin: "http://evil.example" }).status).toBe(403);
    expect(call("POST", "/api/auth/register", body, { host: null }).status).toBe(403);
    expect(call("POST", "/api/auth/register", body, { origin: "not a url" }).status).toBe(403);
    expect(call("DELETE", "/api/auth/me", { password: PASSWORD }, { origin: "http://evil.example" }).status).toBe(403);
    expect(call("POST", "/api/auth/register", body, { origin: "https://localhost:3000" }).status).toBe(201);
  });

  it("allows GET without an Origin", () => {
    expect(call("GET", "/api/auth/me", undefined, { origin: null }).status).toBe(200);
  });

  it("requires JSON bodies of at most 100 kB", () => {
    expect(call("POST", "/api/auth/login", undefined, { raw: "email=a", contentType: "text/plain" })).toEqual({ status: 415, body: { error: "json-required" } });
    expect(call("POST", "/api/auth/login", undefined, { raw: "{}", contentType: null }).status).toBe(415);
    expect(call("POST", "/api/auth/login", undefined, { raw: "{}", contentType: "application/json; charset=utf-8" }).status).toBe(401);
    expect(call("POST", "/api/auth/login", undefined, { raw: " ".repeat(100_001) })).toEqual({ status: 413, body: { error: "body-too-large" } });
  });

  it("answers 400 body-invalid for bodies that are not JSON objects", () => {
    for (const raw of ["{broken", "[1,2]", "null", "42", '"text"']) {
      expect(call("POST", "/api/auth/login", undefined, { raw })).toEqual({ status: 400, body: { error: "body-invalid" } });
    }
  });

  it("does not mistake a body shaped like a response for one", () => {
    expect(call("POST", "/api/auth/login", { status: 200, body: { ok: true } })).toMatchObject({ status: 401, body: { error: "invalid-credentials" } });
  });

  it("treats an empty body as an empty object without a content type", () => {
    expect(call("POST", "/api/auth/login", undefined, { contentType: null })).toMatchObject({ status: 401 });
  });

  it("answers 404 and 405", () => {
    expect(call("GET", "/api/nothing")).toEqual({ status: 404, body: { error: "not-found" } });
    expect(call("GET", "/api/auth/login")).toEqual({ status: 405, body: { error: "method-not-allowed" } });
    expect(call("PUT", "/api/auth/me", {})).toMatchObject({ status: 405 });
    expect(call("POST", "/api/data", {})).toMatchObject({ status: 405 });
  });

  it("never leaks internals in any body", () => {
    const cookie = signUp();
    const bodies = [
      call("GET", "/api/auth/me", undefined, { cookie }),
      call("GET", "/api/data", undefined, { cookie }),
      call("POST", "/api/auth/login", { email: "ann@example.com", password: PASSWORD }),
    ].map((response) => JSON.stringify(response.body));
    for (const text of bodies) expect(text).not.toMatch(/scrypt|token|password_hash|passwordHash|stack/i);
  });
});

describe("robustness (spec R26)", () => {
  it("answers 500 with a code when the database fails", () => {
    db.close();
    expect(call("GET", "/api/auth/me", undefined, { cookie: "session=x" })).toEqual({ status: 500, body: { error: "internal" } });
  });

  it("does not resolve inherited property names as methods", () => {
    expect(call("constructor", "/api/auth/me").status).toBe(405);
    expect(call("GET", "/api/constructor").status).toBe(404);
  });
});

describe("registration limit (spec R24, R26)", () => {
  it("answers 429 too-many-registrations when 30 accounts were created in the last hour", () => {
    for (let i = 0; i < 30; i++) createUser(db, { email: `u${i}@example.com`, displayName: "U", passwordHash: "h" }, NOW);
    const response = call("POST", "/api/auth/register", { email: "late@example.com", password: PASSWORD, displayName: "L" });
    expect(response).toEqual({ status: 429, body: { error: "too-many-registrations" } });
  });
});
