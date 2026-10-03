/**
 * Generation service with an injected completion client.
 * These tests delete LLM_API_KEY without reading it, and they must not call
 * api.openai.com.
 */
import http from "node:http";
import https from "node:https";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GENERATION_DEADLINE_MS, generateRequirements } from "./generate";

const RAW_REQUEST = "Need a weekly sales report for the regional team";

const fixturePayload = {
  userStory:
    "As a regional manager, I want a weekly sales report, so that I can review team performance.",
  acceptanceCriteria: [
    "The report lists sales by region.",
    "The report covers the previous week.",
  ],
  clarifyingQuestions: [
    "Which regions are included?",
    "Who receives the report?",
    "What counts as a sale?",
  ],
};

const SECRET_FIELDS = new Set(["LLM_API_KEY", "apiKey"]);
const KEY_LIKE_VALUE = /sk-[A-Za-z0-9]/;

function assertResultHasNoApiKey(value: unknown) {
  const walk = (node: unknown): void => {
    if (typeof node === "string") {
      expect(node).not.toMatch(KEY_LIKE_VALUE);
      return;
    }
    if (!node || typeof node !== "object") {
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item);
      }
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      expect(SECRET_FIELDS.has(key)).toBe(false);
      walk(child);
    }
  };
  walk(value);
}

beforeEach(() => {
  delete process.env.LLM_API_KEY;
  vi.spyOn(globalThis, "fetch").mockImplementation((input: RequestInfo | URL) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (url.includes("api.openai.com")) {
      return Promise.reject(new Error("unit test must not call api.openai.com"));
    }
    return Promise.reject(new Error("unit test must not call fetch"));
  });
  vi.spyOn(http, "request");
  vi.spyOn(https, "request");
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("generateRequirements", () => {
  it("calls an injected fake client once and returns the three parsed shapes", async () => {
    const client = vi.fn(async (_rawRequest: string, signal: AbortSignal) => {
      expect(signal).toBeInstanceOf(AbortSignal);
      return fixturePayload;
    });

    const result = await generateRequirements(RAW_REQUEST, client);

    expect(client).toHaveBeenCalledTimes(1);
    expect(client.mock.calls[0]?.[0]).toBe(RAW_REQUEST);
    expect(client.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal);
    expect(result).toEqual({
      ok: true,
      userStory: fixturePayload.userStory,
      acceptanceCriteria: fixturePayload.acceptanceCriteria,
      clarifyingQuestions: fixturePayload.clarifyingQuestions,
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(http.request).not.toHaveBeenCalled();
    expect(https.request).not.toHaveBeenCalled();
    assertResultHasNoApiKey(result);
  });

  it("returns missing-key when no client is passed and LLM_API_KEY is unset", async () => {
    delete process.env.LLM_API_KEY;

    const result = await generateRequirements(RAW_REQUEST);

    expect(result).toEqual({ ok: false, reason: "missing-key" });
    expect(result).not.toHaveProperty("userStory");
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(http.request).not.toHaveBeenCalled();
    expect(https.request).not.toHaveBeenCalled();
    assertResultHasNoApiKey(result);
  });

  it("bounds generation at 30 seconds", () => {
    expect(GENERATION_DEADLINE_MS).toBe(30_000);
  });

  it(
    "returns timeout when the client never settles",
    async () => {
      vi.useFakeTimers();
      const client = vi.fn(
        (_rawRequest: string, _signal: AbortSignal) =>
          new Promise<unknown>(() => {}),
      );

      const pending = generateRequirements(RAW_REQUEST, client);
      await vi.advanceTimersByTimeAsync(GENERATION_DEADLINE_MS);
      const result = await pending;

      expect(client).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ ok: false, reason: "timeout" });
      expect(result).not.toHaveProperty("userStory");
      expect(globalThis.fetch).not.toHaveBeenCalled();
      assertResultHasNoApiKey(result);
    },
    5_000,
  );
});
