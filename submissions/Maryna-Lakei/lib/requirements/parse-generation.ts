export type ParsedGeneration =
  | {
      ok: true;
      userStory: string;
      acceptanceCriteria: string[];
      clarifyingQuestions: string[];
    }
  | {
      ok: false;
      reason: "invalid-payload";
    };

const STORY_LEAD = "As a";
const STORY_NEED = "I want";
const STORY_REASON = "so that";

function invalidPayload(): ParsedGeneration {
  return { ok: false, reason: "invalid-payload" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseUserStory(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const lead = value.indexOf(STORY_LEAD);
  const need = value.indexOf(STORY_NEED);
  const reason = value.indexOf(STORY_REASON);
  if (lead < 0 || need < 0 || reason < 0) {
    return null;
  }
  if (!(lead < need && need < reason)) {
    return null;
  }

  const storyCount = value.split(STORY_LEAD).length - 1;
  if (storyCount !== 1) {
    return null;
  }

  return value;
}

function isNonEmptySingleLine(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim() !== "" &&
    !value.includes("\n") &&
    !value.includes("\r")
  );
}

function parseCriteria(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) {
    return null;
  }

  const criteria: string[] = [];
  for (const item of value) {
    if (!isNonEmptySingleLine(item)) {
      return null;
    }
    criteria.push(item);
  }
  return criteria;
}

function isQuestion(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "" && value.includes("?");
}

function parseQuestions(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < 3 || value.length > 5) {
    return null;
  }

  const questions: string[] = [];
  for (const item of value) {
    if (!isQuestion(item)) {
      return null;
    }
    questions.push(item);
  }
  return questions;
}

/**
 * Synchronous check of one model payload. Returns the three shapes or
 * invalid-payload. Does not call the network, read the environment, or
 * invent a User Story.
 */
export function parseGenerationPayload(payload: unknown): ParsedGeneration {
  if (!isRecord(payload)) {
    return invalidPayload();
  }

  const userStory = parseUserStory(payload.userStory);
  if (userStory === null) {
    return invalidPayload();
  }

  const acceptanceCriteria = parseCriteria(payload.acceptanceCriteria);
  if (acceptanceCriteria === null) {
    return invalidPayload();
  }

  const clarifyingQuestions = parseQuestions(payload.clarifyingQuestions);
  if (clarifyingQuestions === null) {
    return invalidPayload();
  }

  return {
    ok: true,
    userStory,
    acceptanceCriteria,
    clarifyingQuestions,
  };
}
