import { describe, expect, it } from "vitest";
import { graphemes, sentences, splitGraphemes } from "./ast";

const FAMILY = "\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}";

// Review finding 3.1: a count by code unit and a split by code point both passed the suite.
describe("The grapheme helpers hold the Intl.Segmenter decision", () => {
  it("counts a family emoji as one grapheme", () => {
    expect(graphemes(`a${FAMILY}`)).toBe(2);
  });

  it("never cuts inside a family emoji", () => {
    expect(splitGraphemes(`a${FAMILY}${FAMILY}`, 2)).toEqual([`a${FAMILY}`, FAMILY]);
  });
});

// docs/reviews/2026-09-27-task-6-5-fixes-round-2.md, finding 1.
describe("The sentence split", () => {
  it("keeps the question mark of a URL query inside its sentence", () => {
    expect(sentences("See https://example.com/watch?v=abc now. Next.")).toEqual([
      "See https://example.com/watch?v=abc now. ",
      "Next.",
    ]);
  });

  it("still ends a sentence at a full-width mark with no space after it", () => {
    expect(sentences("一つ目の文。二つ目の文！三つ目？")).toEqual(["一つ目の文。", "二つ目の文！", "三つ目？"]);
  });
});
