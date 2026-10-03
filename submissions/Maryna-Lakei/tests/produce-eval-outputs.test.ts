/**
 * Runs every eval produce() under the fake model and writes the outputs
 * for the eval judge. Does not call OpenAI or read an API key.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";

type EvalCase = {
  id: string;
  trace: string[];
  dimension: string;
  capability: string;
  scenario: string;
  produce: () => Promise<unknown>;
  rubric: string[];
};

describe("eval produce", () => {
  it("writes fake-model outputs without calling the network", async () => {
    process.env.REQUIREMENTS_MODEL_MODE = "fake";
    delete process.env.LLM_API_KEY;
    const modules = await Promise.all([
      import("../evals/cases/clarifying-questions.eval"),
      import("../evals/cases/requirement-shape.eval"),
      import("../evals/cases/generation-failure-message.eval"),
    ]);
    const cases = modules.flatMap(
      (mod) => mod.cases as unknown as readonly EvalCase[],
    );
    const produced = [];
    for (const evalCase of cases) {
      const output = await evalCase.produce();
      produced.push({
        id: evalCase.id,
        trace: evalCase.trace,
        dimension: evalCase.dimension,
        capability: evalCase.capability,
        scenario: evalCase.scenario,
        output,
        rubric: evalCase.rubric,
      });
    }
    const destination = "evals/results/produced.json";
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, `${JSON.stringify(produced, null, 2)}\n`);
    expect(produced.length).toBe(4);
  });
});
