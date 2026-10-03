/**
 * Labels and whether a stored generation result is replaced (FR-6, FR-12).
 * @trace FR-6
 * @trace FR-12
 *
 * `RESULT_SECTION_LABELS` is the only source of the three English headings.
 * `applyGenerationOutcome` returns the new result on success and the stored
 * result on a structured failure, including when nothing was stored. The
 * helper does not call the network. These tests do not call OpenAI.
 */
import { describe, expect, it } from "vitest";
import {
  RESULT_SECTION_LABELS,
  applyGenerationOutcome,
} from "./result-review";

const WEEKLY = {
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

const MONTHLY = {
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

const FAILURE_REASONS = [
  "empty-input",
  "missing-key",
  "provider-error",
  "timeout",
  "invalid-payload",
] as const;

describe("RESULT_SECTION_LABELS", () => {
  it("exports the three English section labels exactly", () => {
    expect(RESULT_SECTION_LABELS).toEqual({
      userStory: "User Story",
      acceptanceCriteria: "Acceptance Criteria",
      clarifyingQuestions: "Clarifying Questions",
    });
  });
});

describe("applyGenerationOutcome", () => {
  it("replaces a stored result with only the new success", () => {
    expect(
      applyGenerationOutcome(WEEKLY, { ok: true, ...MONTHLY }),
    ).toEqual(MONTHLY);
  });

  it("returns the new success when nothing was stored", () => {
    expect(applyGenerationOutcome(null, { ok: true, ...WEEKLY })).toEqual(
      WEEKLY,
    );
  });

  it.each(FAILURE_REASONS)(
    "keeps the stored result on %s",
    (reason) => {
      expect(applyGenerationOutcome(WEEKLY, { ok: false, reason })).toEqual(
        WEEKLY,
      );
    },
  );

  it.each(FAILURE_REASONS)(
    "stays empty on %s when nothing was stored",
    (reason) => {
      expect(applyGenerationOutcome(null, { ok: false, reason })).toBeNull();
    },
  );
});
