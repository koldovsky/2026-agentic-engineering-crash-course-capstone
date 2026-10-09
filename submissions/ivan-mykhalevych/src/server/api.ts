import { changeDisplayName, changePassword, deleteAccount, login, logout, register } from "./auth";
import type { AuthError } from "./auth";
import { getData, importData, recordAttempt } from "./data";
import type { Db } from "./db";
import { getSessionUser, SESSION_TTL_MS } from "./sessions";
import type { User } from "./users";

export interface ApiRequest {
  method: string;
  path: string;
  origin: string | null;
  host: string | null;
  contentType: string | null;
  cookie: string | null;
  body: string;
}

export interface ApiResponse {
  status: number;
  body: unknown;
  setCookie?: string;
}

type Body = Record<string, unknown>;

interface Context {
  db: Db;
  now: number;
  secure: boolean;
  body: Body;
  token: string;
  user: User | null;
}

type Handler = (context: Context) => ApiResponse;

const SESSION_COOKIE = "session";
export const MAX_BODY_BYTES = 100_000;
const COOKIE_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;

const ERROR_STATUS: Partial<Record<AuthError, number>> = {
  "invalid-credentials": 401,
  "email-taken": 409,
  "too-many-attempts": 429,
  "too-many-registrations": 429,
};

const fail = (status: number, error: string): ApiResponse => ({ status, body: { error } });
const failAuth = (error: AuthError): ApiResponse => fail(ERROR_STATUS[error] ?? 400, error);
const text = (value: unknown): string => (typeof value === "string" ? value : "");

function sessionCookie(token: string, maxAge: number, secure: boolean): string {
  const parts = [`${SESSION_COOKIE}=${token}`, "HttpOnly", "SameSite=Lax", "Path=/", `Max-Age=${maxAge}`];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

const startSession = (token: string, secure: boolean) => sessionCookie(token, COOKIE_MAX_AGE_SECONDS, secure);
const endSession = (secure: boolean) => sessionCookie("", 0, secure);

function readToken(cookieHeader: string | null): string {
  for (const part of (cookieHeader ?? "").split(";")) {
    const pair = part.trim();
    if (pair.startsWith(`${SESSION_COOKIE}=`)) return pair.slice(SESSION_COOKIE.length + 1);
  }
  return "";
}

function sameOrigin(origin: string | null, host: string | null): boolean {
  if (origin === null || host === null) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

type ParsedBody = { body: Body } | { rejected: ApiResponse };

function parseBody(raw: string, contentType: string | null): ParsedBody {
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return { rejected: fail(413, "body-too-large") };
  if (raw === "") return { body: {} };
  if (!(contentType ?? "").toLowerCase().startsWith("application/json")) return { rejected: fail(415, "json-required") };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { rejected: fail(400, "body-invalid") };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return { rejected: fail(400, "body-invalid") };
  return { body: parsed as Body };
}

function signedIn(handler: (context: Context & { user: User }) => ApiResponse): Handler {
  return (context) => (context.user === null ? fail(401, "not-signed-in") : handler({ ...context, user: context.user }));
}

const handlers: Record<string, Record<string, Handler>> = {
  "/api/auth/register": {
    POST: ({ db, now, secure, body }) => {
      const result = register(db, { email: text(body.email), password: text(body.password), displayName: text(body.displayName) }, now);
      if (!result.ok) return failAuth(result.error);
      return { status: 201, body: { user: result.user }, setCookie: startSession(result.token, secure) };
    },
  },
  "/api/auth/login": {
    POST: ({ db, now, secure, body }) => {
      const result = login(db, { email: text(body.email), password: text(body.password) }, now);
      if (!result.ok) return failAuth(result.error);
      return { status: 200, body: { user: result.user }, setCookie: startSession(result.token, secure) };
    },
  },
  "/api/auth/logout": {
    POST: ({ db, secure, token }) => {
      logout(db, token);
      return { status: 200, body: { ok: true }, setCookie: endSession(secure) };
    },
  },
  "/api/auth/password": {
    POST: signedIn(({ db, now, body, token, user }) => {
      const result = changePassword(db, user.id, text(body.current), text(body.next), token, now);
      return result.ok ? { status: 200, body: { ok: true } } : failAuth(result.error);
    }),
  },
  "/api/auth/me": {
    GET: ({ user }) => ({ status: 200, body: { user } }),
    PATCH: signedIn(({ db, body, user }) => {
      const result = changeDisplayName(db, user.id, text(body.displayName));
      return result.ok ? { status: 200, body: { user: result.user } } : failAuth(result.error);
    }),
    DELETE: signedIn(({ db, now, secure, body, user }) => {
      const result = deleteAccount(db, user.id, text(body.password), now);
      if (!result.ok) return failAuth(result.error);
      return { status: 200, body: { ok: true }, setCookie: endSession(secure) };
    }),
  },
  "/api/data": {
    GET: signedIn(({ db, user }) => ({ status: 200, body: getData(db, user.id) })),
  },
  "/api/data/attempts": {
    POST: signedIn(({ db, body, user }) => {
      const result = recordAttempt(db, user.id, body);
      return result.ok ? { status: 200, body: { ok: true } } : fail(400, result.error);
    }),
  },
  "/api/data/import": {
    POST: signedIn(({ db, body, user }) => ({ status: 200, body: importData(db, user.id, body) })),
  },
};

type RouteInfo = Pick<ApiRequest, "method" | "path" | "origin" | "host">;

export function routeError(request: RouteInfo): ApiResponse | null {
  if (!Object.hasOwn(handlers, request.path)) return fail(404, "not-found");
  const routes = handlers[request.path];
  if (!Object.hasOwn(routes, request.method)) return fail(405, "method-not-allowed");
  if (request.method !== "GET" && !sameOrigin(request.origin, request.host)) return fail(403, "forbidden-origin");
  return null;
}

function dispatch(db: Db, request: ApiRequest, now: number, secure: boolean): ApiResponse {
  const routed = routeError(request);
  if (routed !== null) return routed;
  const handler = handlers[request.path][request.method];

  const changesState = request.method !== "GET";
  const parsed = changesState ? parseBody(request.body, request.contentType) : { body: {} };
  if ("rejected" in parsed) return parsed.rejected;

  const token = readToken(request.cookie);
  return handler({ db, now, secure, body: parsed.body, token, user: getSessionUser(db, token, now) });
}

export function handleApi(db: Db, request: ApiRequest, now: number, secure = false): ApiResponse {
  try {
    return dispatch(db, request, now, secure);
  } catch {
    return fail(500, "internal");
  }
}
