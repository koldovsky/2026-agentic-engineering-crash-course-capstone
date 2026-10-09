import { describe, expect, it } from "vitest";
import { localizeQuestion, topicLabel } from "./localize";
import type { QuestionTranslation } from "./localize";
import { QUESTION_BANK } from "./questions";
import { UK_QUESTIONS } from "./questions.uk";
import { LEVELS } from "./types";
import type { Question } from "./types";

const sample: Question = {
  id: "x1",
  level: "junior",
  topic: "Strings",
  text: "English text",
  code: "int a = 1;",
  options: ["a", "b", "c", "d"],
  correctIndex: 2,
  explanation: "English explanation",
};

const translation: QuestionTranslation = {
  text: "Український текст",
  options: ["а", "б", "в", "г"],
  explanation: "Українське пояснення",
};

describe("localizeQuestion (spec R19)", () => {
  it("returns the question unchanged for English", () => {
    expect(localizeQuestion(sample, "en", { x1: translation })).toEqual(sample);
  });

  it("replaces text, options and explanation for Ukrainian and keeps everything else", () => {
    expect(localizeQuestion(sample, "uk", { x1: translation })).toEqual({
      ...sample,
      text: "Український текст",
      options: ["а", "б", "в", "г"],
      explanation: "Українське пояснення",
    });
  });

  it("falls back to English when there is no translation", () => {
    expect(localizeQuestion(sample, "uk", {})).toEqual(sample);
  });

  it("does not mutate the question", () => {
    const copy = JSON.parse(JSON.stringify(sample));
    localizeQuestion(sample, "uk", { x1: translation });
    expect(sample).toEqual(copy);
  });
});

describe("topicLabel (spec R19)", () => {
  it("is the stored name in English and for unknown topics", () => {
    expect(topicLabel("en", "Strings")).toBe("Strings");
    expect(topicLabel("uk", "No such topic")).toBe("No such topic");
  });

  it("has a Ukrainian label for every topic in the bank", () => {
    for (const topic of new Set(QUESTION_BANK.map((q) => q.topic))) {
      expect(topicLabel("uk", topic), topic).not.toBe(topic === "JVM" || topic === "Spring" || topic === "JPA" ? "" : topic);
      expect(topicLabel("uk", topic).trim(), topic).not.toBe("");
    }
  });
});

describe("Ukrainian question bank (spec R19)", () => {
  it("translates every question and nothing else", () => {
    expect(Object.keys(UK_QUESTIONS).sort()).toEqual(QUESTION_BANK.map((q) => q.id).sort());
  });

  it("has a non-empty text, explanation and exactly 4 distinct non-empty options", () => {
    for (const [id, tr] of Object.entries(UK_QUESTIONS)) {
      expect(tr.text.trim(), id).not.toBe("");
      expect(tr.explanation.trim(), id).not.toBe("");
      expect(tr.options, id).toHaveLength(4);
      expect(new Set(tr.options).size, id).toBe(4);
      for (const option of tr.options) expect(option.trim(), id).not.toBe("");
    }
  });

  it("keeps Ukrainian options similar in length (longest at most twice the shortest)", () => {
    for (const [id, tr] of Object.entries(UK_QUESTIONS)) {
      const lengths = tr.options.map((option) => option.length);
      expect(Math.max(...lengths), id).toBeLessThanOrEqual(2 * Math.min(...lengths));
    }
  });

  describe.each(LEVELS)("%s no-tell bounds", (level) => {
    const questions = QUESTION_BANK.filter((q) => q.level === level);
    const share = (pick: (lengths: number[]) => number) => {
      const hits = questions.filter((q) => {
        const lengths = UK_QUESTIONS[q.id]?.options.map((option) => option.length) ?? [];
        const target = pick(lengths);
        return lengths[q.correctIndex] === target && lengths.filter((length) => length === target).length === 1;
      });
      return hits.length / questions.length;
    };

    it("the correct option is the strictly longest in 10% to 30% of the questions", () => {
      expect(share((l) => Math.max(...l))).toBeGreaterThanOrEqual(0.1);
      expect(share((l) => Math.max(...l))).toBeLessThanOrEqual(0.3);
    });

    it("the correct option is the strictly shortest in 10% to 30% of the questions", () => {
      expect(share((l) => Math.min(...l))).toBeGreaterThanOrEqual(0.1);
      expect(share((l) => Math.min(...l))).toBeLessThanOrEqual(0.3);
    });
  });
});
