import { describe, expect, it } from "vitest";
import { getMistakes } from "./mistakes";
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

describe("getMistakes (spec R6)", () => {
  const qs = [q("1", 0), q("2", 1), q("3", 2)];

  it("returns wrong and skipped answers in quiz order", () => {
    expect(getMistakes(qs, [0, 2, null])).toEqual([
      { question: qs[1], chosen: 2 },
      { question: qs[2], chosen: null },
    ]);
  });

  it("returns an empty list when everything is correct", () => {
    expect(getMistakes(qs, [0, 1, 2])).toEqual([]);
  });
});
