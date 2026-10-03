/**
 * Labels and whether a stored generation result is replaced.
 * Pure: no network, no environment, no API key.
 */

export const RESULT_SECTION_LABELS = {
  userStory: "User Story",
  acceptanceCriteria: "Acceptance Criteria",
  clarifyingQuestions: "Clarifying Questions",
} as const;

export type ReviewedResult = {
  userStory: string;
  acceptanceCriteria: string[];
  clarifyingQuestions: string[];
};

export type ResultReviewFailureReason =
  | "empty-input"
  | "missing-key"
  | "provider-error"
  | "timeout"
  | "invalid-payload";

export type GenerationOutcome =
  | ({ ok: true } & ReviewedResult)
  | { ok: false; reason: ResultReviewFailureReason };

/**
 * Success replaces the stored result with only the new story, criteria, and
 * questions. A structured failure returns the stored result unchanged,
 * including when nothing was stored. There is no history list.
 */
export function applyGenerationOutcome(
  stored: ReviewedResult | null,
  outcome: GenerationOutcome,
): ReviewedResult | null {
  if (outcome.ok) {
    return {
      userStory: outcome.userStory,
      acceptanceCriteria: outcome.acceptanceCriteria,
      clarifyingQuestions: outcome.clarifyingQuestions,
    };
  }

  return stored;
}
