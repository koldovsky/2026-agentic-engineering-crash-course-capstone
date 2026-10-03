/**
 * Grades the on-page generation-failure sentence.
 * produce() does not call OpenAI or read a key.
 * @trace FR-8
 * @trace NFR-3
 */
import { generationFailureMessage } from "../../lib/requirements/generation-failure";
import { generateFromFakeModel } from "./clarifying-questions.eval";

const failureMessageCase = {
  id: "eval-generation-failure-message",
  trace: ["FR-8", "NFR-3"],
  dimension: "error-clarity",
  capability: "generation-failure",
  scenario:
    "The model call fails. Grade the message the Business Analyst sees, together with whether the failure is a reason code rather than a generic server error.",
  produce: async () => {
    const outcome = await generateFromFakeModel(
      "Need a weekly sales report [[provider-error]]",
    );
    return {
      outcome,
      message: generationFailureMessage(
        outcome.ok ? null : outcome.reason,
      ),
    };
  },
  rubric: [
    "CRITICAL: the visible message is specific and tells the Business Analyst they can try Generate again",
    "CRITICAL: the message is not a generic HTTP 500 and does not say Internal Server Error",
    "CRITICAL: the failure is reported as a clear reason, not an empty success",
  ],
};

export const cases = [failureMessageCase];
