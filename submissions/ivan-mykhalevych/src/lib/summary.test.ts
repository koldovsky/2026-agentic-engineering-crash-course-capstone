import { describe, expect, it } from "vitest";
import type { Attempt } from "./attempts";
import { summarizeProgress } from "./progress";

const now = new Date(2026, 8, 30, 10, 0).getTime();

const attempt = (at: number, results: [string, boolean][]): Attempt => ({
  at,
  level: "junior",
  total: results.length,
  correct: results.filter(([, ok]) => ok).length,
  percent: 0,
  results: results.map(([topic, correct], i) => ({ id: `q${i}`, topic, correct })),
});

describe("summarizeProgress (spec R14)", () => {
  it("is all zeros and empty lists without attempts", () => {
    expect(summarizeProgress([], now)).toEqual({ attemptCount: 0, streak: 0, mastery: [], weakest: [] });
  });

  it("combines the attempt count, streak, mastery and weakest topics", () => {
    const attempts = [
      attempt(now, [["Strings", false], ["OOP", true], ["Strings", false]]),
      attempt(now - 1000, [["Strings", true], ["OOP", true]]),
    ];
    expect(summarizeProgress(attempts, now)).toEqual({
      attemptCount: 2,
      streak: 1,
      mastery: [
        { topic: "OOP", correct: 2, total: 2, percent: 100 },
        { topic: "Strings", correct: 1, total: 3, percent: 33 },
      ],
      weakest: [{ topic: "Strings", correct: 1, total: 3, percent: 33 }],
    });
  });
});
