/**
 * Grades whether Clarifying Questions ask about gaps in the raw request.
 * produce() calls the fake model. It does not call OpenAI or read a key.
 */
const clarifyingQuestionsCase = {
  id: "eval-clarifying-questions-unstated-gaps",
  trace: ["FR-5", "FR-11"],
  dimension: "gap-questions",
  capability: "requirement-generation",
  scenario:
    'A business analyst submits the raw request "Need a weekly sales report." Grade the clarifying questions produced for that request.',
  produce: async () => {
    const result = await generateFromFakeModel("Need a weekly sales report.");
    if (!result.ok) {
      throw new Error(`fake generation failed: ${result.reason}`);
    }
    return result.clarifyingQuestions;
  },
  rubric: [
    "CRITICAL: the output is 3 to 5 clarifying questions",
    "CRITICAL: each question addresses a gap the raw request does not already state",
    "CRITICAL: no question merely restates information the request already states, and no question introduces an unrelated topic",
    "A missing question about regions, the recipient, or what counts as a sale is not a defect when the questions that are present address other unstated gaps",
  ],
};

async function generateFromFakeModel(rawRequest: string) {
  process.env.REQUIREMENTS_MODEL_MODE = "fake";
  delete process.env.LLM_API_KEY;
  const { generateRequirements } = await import("../../lib/requirements/generate");
  return generateRequirements(rawRequest);
}

export { clarifyingQuestionsCase, generateFromFakeModel };
export const cases = [clarifyingQuestionsCase];

// @trace FR-5
// @trace FR-11
