import { describe, expect, it } from "vitest";
import { initQuiz, nextQuestion, parseQuiz, selectOption, serializeQuiz } from "./quizState";
import type { QuizState } from "./quizState";
import { scoreQuiz } from "./scoring";
import type { Question } from "./types";

const q = (id: string, correctIndex: 0 | 1 | 2 | 3): Question => ({
  id,
  level: "junior",
  topic: "test",
  text: "t",
  options: ["a", "b", "c", "d"],
  correctIndex,
  explanation: "e",
});

const questions = [q("1", 0), q("2", 1)];

describe("quiz state (spec R5)", () => {
  it("starts at the first question with nothing answered", () => {
    expect(initQuiz(questions)).toEqual({
      questions,
      index: 0,
      selected: null,
      answers: [null, null],
      finished: false,
    });
  });

  it("records the chosen option for the current question", () => {
    const s = selectOption(initQuiz(questions), 2);
    expect(s.selected).toBe(2);
    expect(s.answers).toEqual([2, null]);
  });

  it("ignores a second selection on the same question", () => {
    const s = selectOption(selectOption(initQuiz(questions), 2), 3);
    expect(s.selected).toBe(2);
    expect(s.answers).toEqual([2, null]);
  });

  it("does not advance before an option is chosen", () => {
    const s = initQuiz(questions);
    expect(nextQuestion(s)).toEqual(s);
  });

  it("advances to the next question and clears the selection", () => {
    const s = nextQuestion(selectOption(initQuiz(questions), 0));
    expect(s.index).toBe(1);
    expect(s.selected).toBeNull();
    expect(s.finished).toBe(false);
  });

  it("finishes after the last question and ignores further input", () => {
    let s = nextQuestion(selectOption(initQuiz(questions), 0));
    s = nextQuestion(selectOption(s, 1));
    expect(s.finished).toBe(true);
    expect(selectOption(s, 3)).toEqual(s);
    expect(scoreQuiz(s.questions, s.answers)).toEqual({ correct: 2, total: 2, percent: 100 });
  });

});

describe("serializeQuiz and parseQuiz (spec R3)", () => {
  const q = (id: string, level: Question["level"] = "junior", extra: Partial<Question> = {}): Question => ({
    id,
    level,
    topic: "T",
    text: "text",
    options: ["a", "b", "c", "d"],
    correctIndex: 1,
    explanation: "e",
    ...extra,
  });
  const running: QuizState = { ...initQuiz([q("1"), q("2", "junior", { code: "int x;" })]), index: 1, selected: 2, answers: [0, 2] };

  it("round-trips a running quiz", () => {
    expect(parseQuiz(serializeQuiz(running), "junior")).toEqual(running);
  });

  it("returns null for anything that is not a valid running quiz of that level", () => {
    const bad = (state: unknown) => JSON.stringify(state);
    expect(parseQuiz(null, "junior")).toBeNull();
    expect(parseQuiz("{broken", "junior")).toBeNull();
    expect(parseQuiz("42", "junior")).toBeNull();
    expect(parseQuiz(serializeQuiz({ ...running, finished: true }), "junior")).toBeNull();
    expect(parseQuiz(serializeQuiz(running), "senior")).toBeNull();
    expect(parseQuiz(bad({ ...running, answers: [0] }), "junior")).toBeNull();
    expect(parseQuiz(bad({ ...running, index: 5 }), "junior")).toBeNull();
    expect(parseQuiz(bad({ ...running, selected: 4 }), "junior")).toBeNull();
    expect(parseQuiz(bad({ ...running, selected: 3 }), "junior")).toBeNull();
    expect(parseQuiz(bad({ ...running, questions: [] , answers: []}), "junior")).toBeNull();
    expect(parseQuiz(bad({ ...running, questions: [{ ...q("1"), options: ["a", "b", "c"] }, q("2")] }), "junior")).toBeNull();
  });
});
