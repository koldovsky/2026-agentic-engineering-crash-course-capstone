/**
 * Pure parser for one generated requirement payload.
 * @trace FR-3
 * @trace FR-4
 * @trace FR-5
 * @trace FR-9
 * @trace FR-10
 * @trace FR-11
 *
 * The parser accepts one User Story, 1 to 8 acceptance criteria, and 3 to 5
 * clarifying questions, or a structured invalid-payload failure. It is
 * synchronous and must not call the network, read the environment, or invent
 * a User Story.
 */
import http from "node:http";
import https from "node:https";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseGenerationPayload } from "./parse-generation";

const VALID_STORY =
  "As a regional manager, I want a weekly sales report, so that I can review team performance.";

const validPayload = {
  userStory: VALID_STORY,
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

afterEach(() => {
  vi.restoreAllMocks();
});

function readPayload(payload: unknown) {
  const result = parseGenerationPayload(payload);
  expect(result).not.toBeInstanceOf(Promise);
  return result;
}

function expectInvalid(payload: unknown) {
  const result = readPayload(payload);
  expect(result).toEqual({ ok: false, reason: "invalid-payload" });
  expect(result).not.toHaveProperty("userStory");
  return result;
}

describe("parseGenerationPayload", () => {
  it("accepts one As a / I want / so that story and returns that story", () => {
    const result = readPayload(validPayload);
    expect(result).toEqual({
      ok: true,
      userStory: VALID_STORY,
      acceptanceCriteria: validPayload.acceptanceCriteria,
      clarifyingQuestions: validPayload.clarifyingQuestions,
    });
    if (result.ok) {
      expect(result.userStory.indexOf("As a")).toBeGreaterThanOrEqual(0);
      expect(result.userStory.indexOf("As a")).toBeLessThan(
        result.userStory.indexOf("I want"),
      );
      expect(result.userStory.indexOf("I want")).toBeLessThan(
        result.userStory.indexOf("so that"),
      );
    }
  });

  it("accepts a different story that still has the three clauses in order", () => {
    const userStory =
      "As a finance partner, I want a downloadable summary, so that I can compare regions.";
    const result = readPayload({ ...validPayload, userStory });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userStory).toBe(userStory);
    }
  });

  it.each([
    [
      "As a",
      "A regional manager, I want a weekly sales report, so that I can review team performance.",
    ],
    [
      "I want",
      "As a regional manager, a weekly sales report, so that I can review team performance.",
    ],
    [
      "so that",
      "As a regional manager, I want a weekly sales report.",
    ],
  ])("rejects a story missing %s", (_clause, userStory) => {
    expectInvalid({ ...validPayload, userStory });
  });

  it("rejects a story whose clauses are out of order", () => {
    expectInvalid({
      ...validPayload,
      userStory:
        "I want a weekly sales report, As a regional manager, so that I can review team performance.",
    });
    expectInvalid({
      ...validPayload,
      userStory:
        "As a regional manager, so that I can review team performance, I want a weekly sales report.",
    });
  });

  it("rejects a missing story", () => {
    const { userStory: _userStory, ...withoutStory } = validPayload;
    expectInvalid(withoutStory);
    expectInvalid({ ...validPayload, userStory: "" });
    expectInvalid({ ...validPayload, userStory: "   " });
  });

  it("rejects a second story", () => {
    expectInvalid({
      ...validPayload,
      userStory:
        "As a regional manager, I want a weekly sales report, so that I can review team performance. As a finance partner, I want a monthly rollup, so that I can audit the numbers.",
    });
  });

  it("accepts a bullet list of 1 to 8 single-line criteria without Given/When/Then", () => {
    const one = readPayload({
      ...validPayload,
      acceptanceCriteria: ["The report lists sales by region."],
    });
    expect(one.ok).toBe(true);
    if (one.ok) {
      expect(one.acceptanceCriteria).toHaveLength(1);
      expect(one.acceptanceCriteria.join("\n")).not.toMatch(/Given|When|Then/);
    }

    const eight = Array.from(
      { length: 8 },
      (_item, index) => `The report includes check ${index + 1}.`,
    );
    const full = readPayload({ ...validPayload, acceptanceCriteria: eight });
    expect(full.ok).toBe(true);
    if (full.ok) {
      expect(full.acceptanceCriteria).toEqual(eight);
      expect(full.acceptanceCriteria.join("\n")).not.toMatch(/Given|When|Then/);
    }
  });

  it("accepts a bullet that uses Given/When/Then", () => {
    const acceptanceCriteria = [
      "Given a closed week, When the manager opens the report, Then sales by region are listed.",
    ];
    const result = readPayload({ ...validPayload, acceptanceCriteria });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.acceptanceCriteria).toEqual(acceptanceCriteria);
    }
  });

  it("rejects an empty bullet list", () => {
    expectInvalid({ ...validPayload, acceptanceCriteria: [] });
  });

  it("rejects a list longer than 8", () => {
    const acceptanceCriteria = Array.from(
      { length: 9 },
      (_item, index) => `The report includes check ${index + 1}.`,
    );
    expectInvalid({ ...validPayload, acceptanceCriteria });
  });

  it("rejects an empty or multi-line criterion", () => {
    expectInvalid({
      ...validPayload,
      acceptanceCriteria: ["The report lists sales by region.", ""],
    });
    expectInvalid({
      ...validPayload,
      acceptanceCriteria: ["The report lists sales by region.", "   "],
    });
    expectInvalid({
      ...validPayload,
      acceptanceCriteria: ["The report lists sales by region.\nThe report covers the previous week."],
    });
  });

  it("accepts 3, 4, or 5 questions without requiring one exact sentence", () => {
    const alternateThree = [
      "Is the cutoff Friday?",
      "Should archived accounts be included?",
      "Which currency should the totals use?",
    ];
    const four = [
      "Which regions are included?",
      "Who receives the report?",
      "What counts as a sale?",
      "When does the week close?",
    ];
    const five = [...four, "Which products are in scope?"];

    for (const clarifyingQuestions of [
      validPayload.clarifyingQuestions,
      alternateThree,
      four,
      five,
    ]) {
      const result = readPayload({ ...validPayload, clarifyingQuestions });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.clarifyingQuestions).toHaveLength(clarifyingQuestions.length);
        expect(result.clarifyingQuestions.length).toBeGreaterThanOrEqual(3);
        expect(result.clarifyingQuestions.length).toBeLessThanOrEqual(5);
        for (const question of result.clarifyingQuestions) {
          expect(question.trim().length).toBeGreaterThan(0);
          expect(question).toContain("?");
        }
      }
    }
  });

  it("rejects 2 questions", () => {
    expectInvalid({
      ...validPayload,
      clarifyingQuestions: [
        "Which regions are included?",
        "Who receives the report?",
      ],
    });
  });

  it("rejects 6 questions", () => {
    expectInvalid({
      ...validPayload,
      clarifyingQuestions: [
        "Which regions are included?",
        "Who receives the report?",
        "What counts as a sale?",
        "When does the week close?",
        "Which products are in scope?",
        "How often can the report be rerun?",
      ],
    });
  });

  it("rejects a question that is empty or has no question mark", () => {
    expectInvalid({
      ...validPayload,
      clarifyingQuestions: [
        "Which regions are included?",
        "",
        "What counts as a sale?",
      ],
    });
    expectInvalid({
      ...validPayload,
      clarifyingQuestions: [
        "Which regions are included?",
        "Who receives the report",
        "What counts as a sale?",
      ],
    });
  });

  it("returns invalid-payload for a malformed payload and does not invent a User Story", () => {
    expectInvalid(null);
    expectInvalid(undefined);
    expectInvalid("As a manager, I want a report, so that I can decide.");
    expectInvalid([]);
    expectInvalid({
      acceptanceCriteria: validPayload.acceptanceCriteria,
      clarifyingQuestions: validPayload.clarifyingQuestions,
    });
    expectInvalid({ ...validPayload, userStory: 42 });
    expectInvalid({
      ...validPayload,
      acceptanceCriteria: "The report lists sales by region.",
    });
    expectInvalid({ ...validPayload, clarifyingQuestions: "Which regions?" });
    expectInvalid({
      ...validPayload,
      acceptanceCriteria: [12],
    });
  });

  it("does not call the network or read process.env", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const httpSpy = vi.spyOn(http, "request");
    const httpsSpy = vi.spyOn(https, "request");
    const previousEnv = process.env;
    const reads: string[] = [];
    const parsed: ReturnType<typeof parseGenerationPayload>[] = [];
    process.env = new Proxy(previousEnv, {
      get(target, prop, receiver) {
        if (typeof prop === "string") {
          reads.push(prop);
        }
        return Reflect.get(target, prop, receiver);
      },
    });

    try {
      parsed.push(parseGenerationPayload(validPayload));
      parsed.push(
        parseGenerationPayload({ ...validPayload, acceptanceCriteria: [] }),
      );
      parsed.push(parseGenerationPayload({ userStory: "" }));
    } finally {
      process.env = previousEnv;
    }

    expect(reads).toEqual([]);
    expect(parsed[0]).not.toBeInstanceOf(Promise);
    expect(parsed[0]?.ok).toBe(true);
    expectInvalid({ ...validPayload, acceptanceCriteria: [] });
    expectInvalid({ userStory: "" });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(httpSpy).not.toHaveBeenCalled();
    expect(httpsSpy).not.toHaveBeenCalled();
  });
});
