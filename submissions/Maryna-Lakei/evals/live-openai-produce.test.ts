/**
 * One-off supplemental producer. Calls the live model from .env.local.
 * Does not print the API key and does not write it to the result file.
 * Not part of the default unit suite.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generationFailureMessage } from "../lib/requirements/generation-failure";
import { generateRequirements } from "../lib/requirements/generate";

const QUESTIONS_REQUEST = "Need a weekly sales report.";
const SHAPE_REQUEST = "Need a weekly sales report for the regional team";

function applyEnvLocal(): { model: string } {
  const text = readFileSync(".env.local", "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq < 1) {
      continue;
    }
    const name = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (name !== "LLM_API_KEY" && name !== "LLM_MODEL") {
      continue;
    }
    if (value.trim() === "") {
      continue;
    }
    const current = process.env[name];
    if (typeof current === "string" && current.trim() !== "") {
      continue;
    }
    process.env[name] = value;
  }

  delete process.env.REQUIREMENTS_MODEL_MODE;
  delete process.env.REQUIREMENTS_FAKE_DEADLINE_MS;

  const key = process.env.LLM_API_KEY;
  if (typeof key !== "string" || key.trim() === "") {
    throw new Error("LLM_API_KEY is empty after reading .env.local");
  }

  const configured = process.env.LLM_MODEL?.trim() ?? "";
  const model =
    /^[A-Za-z0-9._:-]+$/.test(configured) && !configured.startsWith("sk-")
      ? configured
      : "gpt-4.1-mini";
  return { model };
}

describe("live openai supplemental produce", () => {
  it("writes live outputs for the model-shaped eval cases", async () => {
    const { model } = applyEnvLocal();
    const started = new Date().toISOString();

    const questionsStarted = Date.now();
    const questions = await generateRequirements(QUESTIONS_REQUEST);
    const questionsMs = Date.now() - questionsStarted;

    const shapeStarted = Date.now();
    const shape = await generateRequirements(SHAPE_REQUEST);
    const shapeMs = Date.now() - shapeStarted;

    const failureMessage = generationFailureMessage("provider-error");

    const payload = {
      kind: "supplemental-live-openai",
      gradedBar: "unchanged fake-model evals/results/latest.json",
      generatedAt: started,
      model,
      keyRecorded: false,
      calls: [
        {
          rawRequest: QUESTIONS_REQUEST,
          elapsedMs: questionsMs,
          result: questions,
        },
        {
          rawRequest: SHAPE_REQUEST,
          elapsedMs: shapeMs,
          result: shape,
        },
      ],
      cases: [
        {
          id: "eval-clarifying-questions-unstated-gaps",
          source: "live-openai",
          rawRequest: QUESTIONS_REQUEST,
          elapsedMs: questionsMs,
          output: questions.ok ? questions.clarifyingQuestions : questions,
        },
        {
          id: "eval-user-story-shape",
          source: "live-openai",
          rawRequest: SHAPE_REQUEST,
          elapsedMs: shapeMs,
          output: shape.ok ? shape.userStory : shape,
        },
        {
          id: "eval-acceptance-criteria-bullets",
          source: "live-openai",
          rawRequest: SHAPE_REQUEST,
          elapsedMs: shapeMs,
          output: shape.ok ? shape.acceptanceCriteria : shape,
        },
      ],
      notSentToOpenAi: {
        id: "eval-generation-failure-message",
        reason:
          "The visible failure sentence is local. The [[provider-error]] marker is ignored unless REQUIREMENTS_MODEL_MODE=fake, so it was not sent to OpenAI. The graded fake-model case stays the bar.",
        message: failureMessage,
      },
    };

    writeFileSync(
      "evals/results/live-openai-produced.json",
      `${JSON.stringify(payload, null, 2)}\n`,
    );

    expect(questions.ok, "questions call").toBe(true);
    expect(shape.ok, "shape call").toBe(true);
    expect(questionsMs).toBeLessThan(30_000);
    expect(shapeMs).toBeLessThan(30_000);
  });
});
