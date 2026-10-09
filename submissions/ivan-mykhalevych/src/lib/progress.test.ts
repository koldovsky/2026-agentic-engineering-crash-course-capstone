import { describe, expect, it } from "vitest";
import type { Attempt } from "./attempts";
import { currentStreak, masteryByTopic, weakestTopics } from "./progress";
import type { TopicMastery } from "./progress";

const attemptWith = (results: [string, boolean][], at = 0): Attempt => ({
  at,
  level: "junior",
  total: results.length,
  correct: results.filter(([, ok]) => ok).length,
  percent: 0,
  results: results.map(([topic, correct], i) => ({ id: `q${i}`, topic, correct })),
});

const topic = (name: string, correct: number, total: number): TopicMastery => ({
  topic: name,
  correct,
  total,
  percent: Math.round((correct / total) * 100),
});

describe("masteryByTopic (spec R13)", () => {
  it("adds up results per topic across attempts, sorted by topic name", () => {
    const attempts = [
      attemptWith([["Strings", true], ["OOP", true]]),
      attemptWith([["Strings", false], ["OOP", true], ["Strings", false]]),
    ];
    expect(masteryByTopic(attempts)).toEqual([
      { topic: "OOP", correct: 2, total: 2, percent: 100 },
      { topic: "Strings", correct: 1, total: 3, percent: 33 },
    ]);
  });

  it("returns an empty list when there are no attempts", () => {
    expect(masteryByTopic([])).toEqual([]);
  });
});

describe("weakestTopics (spec R13)", () => {
  const mastery = [topic("OOP", 2, 2), topic("Strings", 1, 3), topic("Basics", 1, 3), topic("JVM", 0, 4), topic("Spring", 4, 8)];

  it("skips topics with too few answers and orders by percent then name", () => {
    expect(weakestTopics(mastery).map((m) => m.topic)).toEqual(["JVM", "Basics", "Strings"]);
  });

  it("respects count and minAnswered", () => {
    expect(weakestTopics(mastery, 1).map((m) => m.topic)).toEqual(["JVM"]);
    expect(weakestTopics(mastery, 5, 8).map((m) => m.topic)).toEqual(["Spring"]);
  });

  it("returns an empty list for empty input", () => {
    expect(weakestTopics([])).toEqual([]);
  });
});

describe("currentStreak (spec R13)", () => {
  const today = new Date(2026, 8, 30, 10, 0).getTime();
  const daysAgo = (n: number, hour = 12) => new Date(2026, 8, 30 - n, hour, 0).getTime();
  const on = (...days: number[]) => days.map((n) => attemptWith([["T", true]], daysAgo(n)));

  it("is 0 without attempts", () => {
    expect(currentStreak([], today)).toBe(0);
  });

  it("is 1 with attempts today only, even several", () => {
    expect(currentStreak([...on(0), attemptWith([["T", true]], daysAgo(0, 8))], today)).toBe(1);
  });

  it("counts consecutive days back from today", () => {
    expect(currentStreak(on(0, 1, 2), today)).toBe(3);
  });

  it("stops at a gap", () => {
    expect(currentStreak(on(0, 2), today)).toBe(1);
  });

  it("still counts from yesterday when there is no attempt today", () => {
    expect(currentStreak(on(1, 2), today)).toBe(2);
  });

  it("is 0 when the latest attempt is older than yesterday", () => {
    expect(currentStreak(on(2), today)).toBe(0);
  });

  it("does not depend on the order of the input", () => {
    expect(currentStreak(on(2, 0, 1), today)).toBe(3);
  });

  it("crosses a month boundary", () => {
    const firstOfOctober = new Date(2026, 9, 1, 9, 0).getTime();
    const attempts = [new Date(2026, 8, 30, 20, 0), new Date(2026, 8, 29, 8, 0)].map((day) =>
      attemptWith([["T", true]], day.getTime()),
    );
    expect(currentStreak(attempts, firstOfOctober)).toBe(2);
  });

  it("crosses a year boundary", () => {
    const newYear = new Date(2027, 0, 1, 9, 0).getTime();
    const lastDayOfYear = attemptWith([["T", true]], new Date(2026, 11, 31, 23, 0).getTime());
    expect(currentStreak([lastDayOfYear], newYear)).toBe(1);
  });
});
