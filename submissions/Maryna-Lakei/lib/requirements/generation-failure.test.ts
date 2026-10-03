/**
 * Generation failure sentence and fake-mode failure markers.
 * These tests delete LLM_API_KEY without reading it. They must not call
 * fetch or OpenAI.
 * @trace FR-8
 * @trace NFR-3
 * @trace NFR-4
 */
import http from "node:http";
import https from "node:https";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GENERATION_DEADLINE_MS, generateRequirements } from "./generate";

const FAILURE_SENTENCE = "Generation failed. You can try Generate again.";
const PROVIDER_ERROR_REQUEST = "Need a weekly sales report [[provider-error]]";
const TIMEOUT_REQUEST = "Need a weekly sales report [[timeout]]";

const ENV_MODE = "REQUIREMENTS_MODEL_MODE";
const ENV_DEADLINE = "REQUIREMENTS_FAKE_DEADLINE_MS";

type GenerationFailureReason =
  | "empty-input"
  | "missing-key"
  | "provider-error"
  | "timeout"
  | "invalid-payload"
  | null;

type GenerationFailureModule = {
  GENERATION_FAILURE_MESSAGE: string;
  generationFailureMessage: (reason: GenerationFailureReason) => string | null;
};

type Watched<T> = {
  settled: boolean;
  value?: T;
};

function watch<T>(promise: Promise<T>): { state: Watched<T>; tracked: Promise<T> } {
  const state: Watched<T> = { settled: false };
  const tracked = promise.then((value) => {
    state.settled = true;
    state.value = value;
    return value;
  });
  return { state, tracked };
}

async function loadGenerationFailure(): Promise<GenerationFailureModule> {
  const href = new URL("./generation-failure.ts", import.meta.url).href;
  return import(href);
}

let savedMode: string | undefined;
let savedDeadline: string | undefined;

beforeEach(() => {
  savedMode = process.env[ENV_MODE];
  savedDeadline = process.env[ENV_DEADLINE];
  delete process.env.LLM_API_KEY;
  vi.spyOn(globalThis, "fetch").mockImplementation(() => {
    return Promise.reject(new Error("unit test must not call fetch"));
  });
  vi.spyOn(http, "request");
  vi.spyOn(https, "request");
});

afterEach(() => {
  if (savedMode === undefined) {
    delete process.env[ENV_MODE];
  } else {
    process.env[ENV_MODE] = savedMode;
  }
  if (savedDeadline === undefined) {
    delete process.env[ENV_DEADLINE];
  } else {
    process.env[ENV_DEADLINE] = savedDeadline;
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("generationFailureMessage", () => {
  it("returns the failure sentence for provider-error, timeout, invalid-payload, and missing-key", async () => {
    const { GENERATION_FAILURE_MESSAGE, generationFailureMessage } =
      await loadGenerationFailure();

    expect(GENERATION_FAILURE_MESSAGE).toBe(FAILURE_SENTENCE);

    for (const reason of [
      "provider-error",
      "timeout",
      "invalid-payload",
      "missing-key",
    ] as const) {
      expect(generationFailureMessage(reason)).toBe(FAILURE_SENTENCE);
      expect(generationFailureMessage(reason)).toBe(GENERATION_FAILURE_MESSAGE);
    }
  });

  it("returns no generation-failure sentence for empty-input and no reason", async () => {
    const { generationFailureMessage } = await loadGenerationFailure();

    expect(generationFailureMessage("empty-input")).toBeNull();
    expect(generationFailureMessage(null)).toBeNull();
  });
});

describe("generateRequirements failure markers", () => {
  it("returns provider-error for [[provider-error]] after about one second without fetch", async () => {
    delete process.env.LLM_API_KEY;
    process.env[ENV_MODE] = "fake";
    delete process.env[ENV_DEADLINE];
    vi.useFakeTimers();

    const watched = watch(generateRequirements(PROVIDER_ERROR_REQUEST));

    await vi.advanceTimersByTimeAsync(999);
    expect(watched.state.settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(watched.tracked).resolves.toEqual({
      ok: false,
      reason: "provider-error",
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(http.request).not.toHaveBeenCalled();
    expect(https.request).not.toHaveBeenCalled();
  });

  it(
    "returns timeout at 30000 for [[timeout]] when fake mode has no deadline override",
    async () => {
      delete process.env.LLM_API_KEY;
      process.env[ENV_MODE] = "fake";
      delete process.env[ENV_DEADLINE];
      vi.useFakeTimers();

      expect(GENERATION_DEADLINE_MS).toBe(30_000);

      const watched = watch(generateRequirements(TIMEOUT_REQUEST));

      await vi.advanceTimersByTimeAsync(1_500);
      expect(watched.state).toEqual({ settled: false });

      await vi.advanceTimersByTimeAsync(30_000 - 1_500);
      await expect(watched.tracked).resolves.toEqual({
        ok: false,
        reason: "timeout",
      });
      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(http.request).not.toHaveBeenCalled();
      expect(https.request).not.toHaveBeenCalled();
    },
    5_000,
  );

  it("returns timeout at 1500 when fake mode sets REQUIREMENTS_FAKE_DEADLINE_MS", async () => {
    delete process.env.LLM_API_KEY;
    process.env[ENV_MODE] = "fake";
    process.env[ENV_DEADLINE] = "1500";
    vi.useFakeTimers();

    const pending = generateRequirements(TIMEOUT_REQUEST);
    await vi.advanceTimersByTimeAsync(1_500);
    await expect(pending).resolves.toEqual({ ok: false, reason: "timeout" });
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(http.request).not.toHaveBeenCalled();
    expect(https.request).not.toHaveBeenCalled();
  });

  it(
    "ignores the fake deadline when mode is unset and times out an unsettled client at 30000",
    async () => {
      delete process.env.LLM_API_KEY;
      delete process.env[ENV_MODE];
      process.env[ENV_DEADLINE] = "1500";
      vi.useFakeTimers();

      const client = vi.fn(
        (_rawRequest: string, _signal: AbortSignal) => new Promise<unknown>(() => {}),
      );
      const watched = watch(generateRequirements(TIMEOUT_REQUEST, client));

      await vi.advanceTimersByTimeAsync(1_500);
      expect(watched.state).toEqual({ settled: false });

      await vi.advanceTimersByTimeAsync(30_000 - 1_500);
      await expect(watched.tracked).resolves.toEqual({
        ok: false,
        reason: "timeout",
      });
      expect(client).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(http.request).not.toHaveBeenCalled();
      expect(https.request).not.toHaveBeenCalled();
    },
    5_000,
  );

  it("returns missing-key for [[provider-error]] when mode is unset and no client is passed", async () => {
    delete process.env.LLM_API_KEY;
    delete process.env[ENV_MODE];
    process.env[ENV_DEADLINE] = "1500";
    vi.useFakeTimers();

    const result = await generateRequirements(PROVIDER_ERROR_REQUEST);

    expect(result).toEqual({ ok: false, reason: "missing-key" });
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(http.request).not.toHaveBeenCalled();
    expect(https.request).not.toHaveBeenCalled();
  });
});
