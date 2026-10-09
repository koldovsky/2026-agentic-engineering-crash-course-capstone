import { describe, expect, it } from "vitest";
import { parseBestScores, withBestScore } from "./bestScores";

describe("parseBestScores (spec R8)", () => {
  it("keeps valid levels and drops unknown levels and bad values", () => {
    expect(parseBestScores('{"junior":80,"bogus":50,"middle":"x"}')).toEqual({ junior: 80 });
  });

  it("returns an empty object for invalid JSON", () => {
    expect(parseBestScores("not json")).toEqual({});
  });

  it("returns an empty object for null and non-objects", () => {
    expect(parseBestScores(null)).toEqual({});
    expect(parseBestScores("[1,2]")).toEqual({});
    expect(parseBestScores("42")).toEqual({});
  });

  it("rejects percents outside 0..100 and non-integers", () => {
    expect(parseBestScores('{"junior":101,"middle":-1,"senior":55.5}')).toEqual({});
  });

  it("accepts the boundary values 0 and 100", () => {
    expect(parseBestScores('{"junior":0,"senior":100}')).toEqual({ junior: 0, senior: 100 });
  });
});

describe("withBestScore (spec R8)", () => {
  it("keeps the higher existing score", () => {
    expect(withBestScore({ junior: 80 }, "junior", 60)).toEqual({ junior: 80 });
  });

  it("replaces a lower score", () => {
    expect(withBestScore({ junior: 80 }, "junior", 90)).toEqual({ junior: 90 });
  });

  it("adds a level that had no score and keeps the others", () => {
    expect(withBestScore({ junior: 80 }, "senior", 40)).toEqual({ junior: 80, senior: 40 });
  });

  it("does not mutate its input", () => {
    const scores = { junior: 80 };
    withBestScore(scores, "junior", 90);
    expect(scores).toEqual({ junior: 80 });
  });
});
