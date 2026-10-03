import { parseGenerationPayload } from "./parse-generation";

export const GENERATION_DEADLINE_MS = 30_000;

const FIXTURE_DELAY_MS = 1_000;

export type CompletionClient = (
  rawRequest: string,
  signal: AbortSignal,
) => Promise<unknown>;

export type GenerationFailureReason =
  | "empty-input"
  | "missing-key"
  | "provider-error"
  | "timeout"
  | "invalid-payload";

export type GenerationResult =
  | {
      ok: true;
      userStory: string;
      acceptanceCriteria: string[];
      clarifyingQuestions: string[];
    }
  | {
      ok: false;
      reason: GenerationFailureReason;
    };

const FIXTURE_PAYLOAD = {
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

const MONTHLY_BUDGET_FIXTURE_PAYLOAD = {
  userStory:
    "As a finance lead, I want a monthly budget summary, so that I can compare planned and actual spend.",
  acceptanceCriteria: [
    "The summary lists planned spend by category.",
    "The summary lists actual spend for the month.",
  ],
  clarifyingQuestions: [
    "Which month does the budget cover?",
    "Which categories are in scope?",
    "Who approves a variance?",
  ],
};

function fixtureForRequest(rawRequest: string): typeof FIXTURE_PAYLOAD {
  if (rawRequest.includes("monthly budget")) {
    return MONTHLY_BUDGET_FIXTURE_PAYLOAD;
  }
  return FIXTURE_PAYLOAD;
}

function failure(reason: GenerationFailureReason): GenerationResult {
  return { ok: false, reason };
}

function positiveBase10Integer(value: string | undefined): number | null {
  if (value === undefined || !/^[1-9][0-9]*$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function raceDeadlineMs(): number {
  if (process.env.REQUIREMENTS_MODEL_MODE !== "fake") {
    return GENERATION_DEADLINE_MS;
  }

  return (
    positiveBase10Integer(process.env.REQUIREMENTS_FAKE_DEADLINE_MS) ??
    GENERATION_DEADLINE_MS
  );
}

function fakeFixtureClient(
  rawRequest: string,
  signal: AbortSignal,
): Promise<unknown> {
  if (rawRequest.includes("[[timeout]]")) {
    return new Promise(() => {});
  }

  if (rawRequest.includes("[[provider-error]]")) {
    return new Promise((_resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("provider-error"));
      }, FIXTURE_DELAY_MS);

      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new Error("aborted"));
        },
        { once: true },
      );
    });
  }

  const payload = fixtureForRequest(rawRequest);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve(payload);
    }, FIXTURE_DELAY_MS);

    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new Error("aborted"));
      },
      { once: true },
    );
  });
}

async function completeWithOpenAi(
  rawRequest: string,
  signal: AbortSignal,
  apiKey: string,
): Promise<unknown> {
  const { requestOpenAiCompletion } = await import("./openai-client");
  return requestOpenAiCompletion(rawRequest, signal, apiKey);
}

function resolveDefaultClient(): CompletionClient | "missing-key" {
  if (process.env.REQUIREMENTS_MODEL_MODE === "fake") {
    return fakeFixtureClient;
  }

  const apiKey = process.env.LLM_API_KEY;
  if (typeof apiKey !== "string" || apiKey.trim() === "") {
    return "missing-key";
  }

  const key = apiKey.trim();
  return (rawRequest, signal) => completeWithOpenAi(rawRequest, signal, key);
}

function settleClientPayload(payload: unknown): GenerationResult {
  const parsed = parseGenerationPayload(payload);
  if (!parsed.ok) {
    return failure("invalid-payload");
  }

  return {
    ok: true,
    userStory: parsed.userStory,
    acceptanceCriteria: parsed.acceptanceCriteria,
    clarifyingQuestions: parsed.clarifyingQuestions,
  };
}

function failureFromClient(signal: AbortSignal): GenerationResult {
  if (signal.aborted) {
    return failure("timeout");
  }
  return failure("provider-error");
}

export async function generateRequirements(
  rawRequest: string,
  client?: CompletionClient,
): Promise<GenerationResult> {
  if (rawRequest.trim() === "") {
    return failure("empty-input");
  }

  const selected = client ?? resolveDefaultClient();
  if (selected === "missing-key") {
    return failure("missing-key");
  }

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutResult = new Promise<GenerationResult>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(failure("timeout"));
    }, raceDeadlineMs());
  });

  const clientResult = new Promise<unknown>((resolve, reject) => {
    try {
      resolve(selected(rawRequest, controller.signal));
    } catch (error) {
      reject(error);
    }
  }).then(
    (payload) => settleClientPayload(payload),
    () => failureFromClient(controller.signal),
  );

  try {
    return await Promise.race([clientResult, timeoutResult]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}
