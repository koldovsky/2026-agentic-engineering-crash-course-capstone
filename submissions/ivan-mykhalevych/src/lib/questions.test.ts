import { describe, expect, it } from "vitest";
import { QUESTION_BANK, getQuestions } from "./questions";
import { LEVELS } from "./types";
import type { Question } from "./types";

describe("question bank rules (spec R2)", () => {
  it.each(LEVELS)("has at least 40 questions for %s", (level) => {
    expect(QUESTION_BANK.filter((q) => q.level === level).length).toBeGreaterThanOrEqual(40);
  });

  it("has unique ids", () => {
    const ids = QUESTION_BANK.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has valid question shapes", () => {
    for (const q of QUESTION_BANK) {
      expect(q.options).toHaveLength(4);
      expect([0, 1, 2, 3]).toContain(q.correctIndex);
      expect(q.text.trim()).not.toBe("");
      expect(q.explanation.trim()).not.toBe("");
    }
  });

  it("keeps options similar in length (longest <= 2x shortest)", () => {
    for (const q of QUESTION_BANK) {
      const lengths = q.options.map((o) => o.length);
      expect(Math.max(...lengths), q.id).toBeLessThanOrEqual(2 * Math.min(...lengths));
    }
  });

  it.each(LEVELS)("does not use the same correct index for every %s question", (level) => {
    const idx = QUESTION_BANK.filter((q) => q.level === level).map((q) => q.correctIndex);
    expect(new Set(idx).size).toBeGreaterThan(1);
  });
});

describe("code-snippet questions (spec R9)", () => {
  it.each(LEVELS)("has at least one %s question with code", (level) => {
    const withCode = QUESTION_BANK.filter((q) => q.level === level && q.code !== undefined);
    expect(withCode.length).toBeGreaterThanOrEqual(1);
  });

  it("never has an empty code snippet", () => {
    for (const q of QUESTION_BANK) {
      if (q.code !== undefined) expect(q.code.trim(), q.id).not.toBe("");
    }
  });
});

describe("getQuestions (spec R3)", () => {
  it.each(LEVELS)("returns only %s questions in bank order", (level) => {
    const expected = QUESTION_BANK.filter((q) => q.level === level);
    expect(getQuestions(level)).toEqual(expected);
  });
});

describe("no answer tell (spec R2)", () => {
  const MIN_SHARE = 0.1;
  const MAX_SHARE = 0.3;
  const optionLengths = (q: Question) => q.options.map((option) => option.length);
  const isStrictly = (q: Question, pick: (lengths: number[]) => number) => {
    const lengths = optionLengths(q);
    const target = pick(lengths);
    return lengths[q.correctIndex] === target && lengths.filter((length) => length === target).length === 1;
  };

  it.each(LEVELS)("%s: the correct option is the strictly longest in 10% to 30% of the questions", (level) => {
    const questions = QUESTION_BANK.filter((q) => q.level === level);
    const share = questions.filter((q) => isStrictly(q, (l) => Math.max(...l))).length / questions.length;
    expect(share).toBeGreaterThanOrEqual(MIN_SHARE);
    expect(share).toBeLessThanOrEqual(MAX_SHARE);
  });

  it.each(LEVELS)("%s: the correct option is the strictly shortest in 10% to 30% of the questions", (level) => {
    const questions = QUESTION_BANK.filter((q) => q.level === level);
    const share = questions.filter((q) => isStrictly(q, (l) => Math.min(...l))).length / questions.length;
    expect(share).toBeGreaterThanOrEqual(MIN_SHARE);
    expect(share).toBeLessThanOrEqual(MAX_SHARE);
  });

  it.each(LEVELS)("%s: every answer position holds 15% to 35% of the correct answers", (level) => {
    const questions = QUESTION_BANK.filter((q) => q.level === level);
    for (const position of [0, 1, 2, 3]) {
      const share = questions.filter((q) => q.correctIndex === position).length / questions.length;
      expect(share, `position ${position}`).toBeGreaterThanOrEqual(0.15);
      expect(share, `position ${position}`).toBeLessThanOrEqual(0.35);
    }
  });
});
