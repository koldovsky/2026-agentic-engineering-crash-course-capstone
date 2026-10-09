import { describe, expect, it } from "vitest";
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

describe("scoreQuiz (spec R4)", () => {
  it("counts a skipped answer as wrong", () => {
    const qs = [q("1", 0), q("2", 1), q("3", 2)];
    expect(scoreQuiz(qs, [0, 2, null])).toEqual({ correct: 1, total: 3, percent: 33 });
  });

  it("scores a perfect quiz as 100", () => {
    expect(scoreQuiz([q("1", 3), q("2", 0)], [3, 0])).toEqual({ correct: 2, total: 2, percent: 100 });
  });

  it("returns 0 percent for an empty quiz", () => {
    expect(scoreQuiz([], [])).toEqual({ correct: 0, total: 0, percent: 0 });
  });
});
