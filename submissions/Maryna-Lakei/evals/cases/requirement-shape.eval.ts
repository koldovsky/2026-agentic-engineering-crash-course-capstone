/**
 * Grades the fake-model User Story and Acceptance Criteria shape.
 * produce() does not call OpenAI or read a key.
 * @trace FR-3
 * @trace FR-4
 * @trace FR-9
 * @trace FR-10
 */
import { generateFromFakeModel } from "./clarifying-questions.eval";

const userStoryCase = {
  id: "eval-user-story-shape",
  trace: ["FR-3", "FR-9"],
  dimension: "story-shape",
  capability: "requirement-generation",
  scenario:
    'A business analyst submits "Need a weekly sales report for the regional team". Grade the single User Story that comes back.',
  produce: async () => {
    const result = await generateFromFakeModel(
      "Need a weekly sales report for the regional team",
    );
    if (!result.ok) {
      throw new Error(`fake generation failed: ${result.reason}`);
    }
    return result.userStory;
  },
  rubric: [
    "CRITICAL: the output is one User Story, not a list of stories",
    "CRITICAL: the story contains the phrases As a, I want, and so that, in that order",
    "the story is readable English about the requested report",
  ],
};

const acceptanceCriteriaCase = {
  id: "eval-acceptance-criteria-bullets",
  trace: ["FR-4", "FR-10"],
  dimension: "acceptance-criteria",
  capability: "requirement-generation",
  scenario:
    'A business analyst submits "Need a weekly sales report for the regional team". Grade the Acceptance Criteria that come back.',
  produce: async () => {
    const result = await generateFromFakeModel(
      "Need a weekly sales report for the regional team",
    );
    if (!result.ok) {
      throw new Error(`fake generation failed: ${result.reason}`);
    }
    return result.acceptanceCriteria;
  },
  rubric: [
    "CRITICAL: the output is a short list of acceptance criteria, not a single paragraph",
    "CRITICAL: Given/When/Then format is not required, and its absence is not a defect",
    "each item is a concrete check a reader could use",
  ],
};

export const cases = [userStoryCase, acceptanceCriteriaCase];
