/**
 * Cross-slice business flow with no database.
 * Intake validation, fake-model generation, labeled replacement, and
 * generation failure run as one sequence. This test does not call OpenAI
 * and does not read an API key.
 * @trace FR-7
 * @trace FR-8
 * @trace FR-12
 * @trace NFR-3
 * @trace NFR-4
 */
import http from "node:http";
import https from "node:https";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generationFailureMessage } from "@/lib/requirements/generation-failure";
import {
  GENERATION_DEADLINE_MS,
  generateRequirements,
  type GenerationResult,
} from "@/lib/requirements/generate";
import {
  applyGenerationOutcome,
  RESULT_SECTION_LABELS,
  type ReviewedResult,
} from "@/lib/requirements/result-review";
import { validateRawBusinessRequest } from "@/lib/requirements/validation";

const WEEKLY_REQUEST = "Need a weekly sales report for the regional team";
const WEEKLY_STORY =
  "As a regional manager, I want a weekly sales report, so that I can review team performance.";
const MONTHLY_REQUEST = "Need a monthly budget for the finance team";
const MONTHLY_STORY =
  "As a finance lead, I want a monthly budget summary, so that I can compare planned and actual spend.";
const PROVIDER_REQUEST = "Need a weekly sales report [[provider-error]]";
const TIMEOUT_REQUEST = "Need a weekly sales report [[timeout]]";
const FAILURE_SENTENCE = "Generation failed. You can try Generate again.";

let savedMode: string | undefined;
let savedDeadline: string | undefined;

beforeEach(() => {
  savedMode = process.env.REQUIREMENTS_MODEL_MODE;
  savedDeadline = process.env.REQUIREMENTS_FAKE_DEADLINE_MS;
  delete process.env.LLM_API_KEY;
  process.env.REQUIREMENTS_MODEL_MODE = "fake";
  delete process.env.REQUIREMENTS_FAKE_DEADLINE_MS;
  vi.spyOn(globalThis, "fetch").mockImplementation(() => {
    return Promise.reject(new Error("integration test must not call fetch"));
  });
  vi.spyOn(http, "request");
  vi.spyOn(https, "request");
  vi.useFakeTimers();
});

afterEach(() => {
  if (savedMode === undefined) {
    delete process.env.REQUIREMENTS_MODEL_MODE;
  } else {
    process.env.REQUIREMENTS_MODEL_MODE = savedMode;
  }
  if (savedDeadline === undefined) {
    delete process.env.REQUIREMENTS_FAKE_DEADLINE_MS;
  } else {
    process.env.REQUIREMENTS_FAKE_DEADLINE_MS = savedDeadline;
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function settle(pending: Promise<GenerationResult>, ms: number) {
  await vi.advanceTimersByTimeAsync(ms);
  return pending;
}

describe("cross-slice generation flow", () => {
  it("keeps a successful result through failure, then replaces it on the next success", async () => {
    const empty = validateRawBusinessRequest("   ");
    expect(empty).toEqual({ ok: false, message: "Enter a business request." });

    const emptyOutcome = await generateRequirements("   ");
    expect(emptyOutcome).toEqual({ ok: false, reason: "empty-input" });
    expect(generationFailureMessage("empty-input")).toBeNull();
    expect(applyGenerationOutcome(null, emptyOutcome)).toBeNull();

    expect(GENERATION_DEADLINE_MS).toBe(30_000);
    expect(RESULT_SECTION_LABELS).toEqual({
      userStory: "User Story",
      acceptanceCriteria: "Acceptance Criteria",
      clarifyingQuestions: "Clarifying Questions",
    });

    const weekly = await settle(generateRequirements(WEEKLY_REQUEST), 1_000);
    expect(weekly.ok).toBe(true);
    if (!weekly.ok) {
      throw new Error("expected a successful weekly result");
    }
    expect(weekly.userStory).toBe(WEEKLY_STORY);
    expect(weekly.acceptanceCriteria.length).toBeGreaterThan(0);
    expect(weekly.clarifyingQuestions.length).toBeGreaterThanOrEqual(3);
    expect(weekly.clarifyingQuestions.length).toBeLessThanOrEqual(5);

    let stored: ReviewedResult | null = applyGenerationOutcome(null, weekly);
    expect(stored?.userStory).toBe(WEEKLY_STORY);

    const providerError = await settle(generateRequirements(PROVIDER_REQUEST), 1_000);
    expect(providerError).toEqual({ ok: false, reason: "provider-error" });
    expect(generationFailureMessage("provider-error")).toBe(FAILURE_SENTENCE);
    stored = applyGenerationOutcome(stored, providerError);
    expect(stored?.userStory).toBe(WEEKLY_STORY);

    const timeout = await settle(generateRequirements(TIMEOUT_REQUEST), 30_000);
    expect(timeout).toEqual({ ok: false, reason: "timeout" });
    expect(generationFailureMessage("timeout")).toBe(FAILURE_SENTENCE);
    stored = applyGenerationOutcome(stored, timeout);
    expect(stored?.userStory).toBe(WEEKLY_STORY);

    const monthly = await settle(generateRequirements(MONTHLY_REQUEST), 1_000);
    expect(monthly.ok).toBe(true);
    if (!monthly.ok) {
      throw new Error("expected a successful monthly result");
    }
    stored = applyGenerationOutcome(stored, monthly);
    expect(stored?.userStory).toBe(MONTHLY_STORY);
    expect(stored?.userStory).not.toBe(WEEKLY_STORY);

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(http.request).not.toHaveBeenCalled();
    expect(https.request).not.toHaveBeenCalled();
  });
});
