import { describe, expect, it } from "vitest";
import { mergeBestScores, mergeStoredBestScores } from "./bestScores";

describe("mergeBestScores (spec R16)", () => {
  it("keeps the higher score per level", () => {
    expect(mergeBestScores({ junior: 90, middle: 10 }, { junior: 80, middle: 40 })).toEqual({ junior: 90, middle: 40 });
  });

  it("keeps levels that are present in only one of the inputs", () => {
    expect(mergeBestScores({ junior: 50 }, { senior: 30 })).toEqual({ junior: 50, senior: 30 });
  });

  it("does not mutate its inputs", () => {
    const a = { junior: 10 };
    const b = { junior: 20 };
    mergeBestScores(a, b);
    expect(a).toEqual({ junior: 10 });
    expect(b).toEqual({ junior: 20 });
  });
});

describe("mergeStoredBestScores (spec R16)", () => {
  it("merges the stored profile scores with the legacy scores", () => {
    const merged = mergeStoredBestScores('{"junior":90,"middle":10}', '{"junior":80}');
    expect(JSON.parse(merged)).toEqual({ junior: 90, middle: 10 });
  });

  it("uses the legacy scores when the profile has none", () => {
    expect(JSON.parse(mergeStoredBestScores(null, '{"junior":80}'))).toEqual({ junior: 80 });
  });

  it("ignores invalid text on either side", () => {
    expect(JSON.parse(mergeStoredBestScores("not json", '{"senior":70}'))).toEqual({ senior: 70 });
    expect(JSON.parse(mergeStoredBestScores('{"senior":70}', "garbage"))).toEqual({ senior: 70 });
  });
});
