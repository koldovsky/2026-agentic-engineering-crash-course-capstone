import { describe, expect, it } from "vitest";
import { callApi } from "./api";
import type { Fetcher } from "./api";

function reply(status: number, body: unknown): Fetcher {
  return async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("callApi (spec R27)", () => {
  it("returns the parsed body on success", async () => {
    expect(await callApi(reply(200, { user: { id: 1 } }), "GET", "/api/auth/me")).toEqual({ ok: true, data: { user: { id: 1 } } });
  });

  it("returns the error code of a failed response", async () => {
    expect(await callApi(reply(409, { error: "email-taken" }), "POST", "/api/auth/register", {})).toEqual({ ok: false, error: "email-taken" });
  });

  it("maps a response without an error code, broken JSON and network failures to network-error", async () => {
    expect(await callApi(reply(500, { oops: true }), "GET", "/x")).toEqual({ ok: false, error: "network-error" });
    expect(await callApi(async () => new Response("<html>", { status: 200 }), "GET", "/x")).toEqual({ ok: false, error: "network-error" });
    const broken: Fetcher = async () => {
      throw new TypeError("offline");
    };
    expect(await callApi(broken, "GET", "/x")).toEqual({ ok: false, error: "network-error" });
  });

  it("sends JSON with the method, cookies for the same origin and no body for GET", async () => {
    const seen: { url: string; init: RequestInit }[] = [];
    const spy: Fetcher = async (url, init) => {
      seen.push({ url, init });
      return new Response("{}", { status: 200 });
    };
    await callApi(spy, "POST", "/api/auth/login", { email: "a@b.co" });
    await callApi(spy, "GET", "/api/data");
    expect(seen[0].url).toBe("/api/auth/login");
    expect(seen[0].init).toMatchObject({ method: "POST", body: '{"email":"a@b.co"}', credentials: "same-origin" });
    expect(new Headers(seen[0].init.headers).get("content-type")).toBe("application/json");
    expect(seen[1].init.body).toBeUndefined();
  });
});
