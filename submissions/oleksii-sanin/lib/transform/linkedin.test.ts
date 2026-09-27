import { describe, expect, it } from "vitest";
import { transform } from "./index";

/** One sentence of about 100 characters, ending with a full stop. */
const sentence = (n: number): string => `Sentence ${n} ${"word ".repeat(17)}ends here.`;

const FAMILY = "\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}";

describe("LinkedIn output is plain text", () => {
  it("removes the emphasis marks", () => {
    const { linkedin } = transform("A **bold** word and an _italic_ word.\n");

    expect(linkedin).toContain("bold");
    expect(linkedin).toContain("italic");
    expect(linkedin).not.toContain("*");
    expect(linkedin).not.toContain("_");
  });

  it("removes the heading marks", () => {
    const { linkedin } = transform("## A heading\n\nA paragraph.\n");

    expect(linkedin).toContain("A heading");
    expect(linkedin).not.toContain("#");
  });

  it("moves a link to its own line", () => {
    const { linkedin } = transform("Read the [docs](https://example.com/a?b=1) today.\n");

    const lines = linkedin.split("\n");
    expect(lines[0]).toBe("Read the docs today.");
    expect(lines[1]).toBe("https://example.com/a?b=1");
  });

  // docs/reviews/2026-09-27-task-6-5-fixes-round-2.md, finding 5: the spec rule had no test.
  it("keeps a bare URL where the prose has it, in LinkedIn and in X", () => {
    const { linkedin, x } = transform("Visit https://example.com/a today.\n");

    expect(linkedin).toBe("Visit https://example.com/a today.");
    expect(x).toEqual(["Visit https://example.com/a today.\n\n1/1"]);
  });

  // Review finding 1.6: a link whose text is its target printed the URL twice.
  it("prints a bare link once", () => {
    expect(transform("<https://example.com/a>\n").linkedin).toBe("https://example.com/a");
  });

  // docs/reviews/2026-09-27-task-6-5-fixes.md, finding 6.
  it.each([
    ["in a list item", "- <https://example.com/a>\n", "• https://example.com/a"],
    ["with a character that the href encodes", "<https://example.com/ä>\n", "https://example.com/ä"],
  ])("prints a bare link once %s", (_, source, expected) => {
    expect(transform(source).linkedin).toBe(expected);
  });

  it("keeps a link with a malformed escape, and throws nothing", () => {
    expect(transform("[x](https://example.com/%FF)\n").linkedin).toBe("x\nhttps://example.com/%FF");
  });

  it("cuts long input at the last complete sentence under 3000 characters", () => {
    const source = Array.from({ length: 40 }, (_, i) => sentence(i + 1)).join(" ");
    expect(source.length).toBeGreaterThan(3000);

    const { linkedin, meta } = transform(source);

    expect(linkedin.length).toBeLessThanOrEqual(3000);
    // The cut sits at the LAST sentence under the limit, not at an early one. Without this
    // bound a limit of 300, or of 10, would satisfy every other assertion here.
    expect(linkedin.length).toBeGreaterThan(2800);
    expect(linkedin.trimEnd()).toMatch(/\.$/);
    expect(meta.linkedin.truncated).toBe(true);
    // The cut keeps whole sentences: the text is a prefix of the source.
    expect(source.startsWith(linkedin.trimEnd())).toBe(true);
  });

  // Review finding 1.1: with no complete sentence to keep, the hard cut split a surrogate pair.
  // 2999 catches a cut by code unit. 2998 catches a cut by code point, which keeps the first
  // person of the family and drops the rest (docs/reviews/2026-09-27-task-6-5-fixes.md, finding 7).
  it.each([2998, 2999])("cuts a first sentence over the limit between graphemes, after %i", (n) => {
    const { linkedin, meta } = transform(`${"x".repeat(n)}${FAMILY} more.`);

    expect(linkedin).toBe("x".repeat(n));
    expect(meta.linkedin.truncated).toBe(true);
  });

  // docs/reviews/2026-09-27-task-6-5-fixes-round-2.md, finding 1.
  it("cuts before a URL with a query, not after its question mark", () => {
    const source = `${"Sentence here. ".repeat(197)}Watch https://www.youtube.com/watch?v=dQw4w9WgXcQ now.`;

    const { linkedin } = transform(source);

    expect(linkedin).toBe("Sentence here. ".repeat(197).trimEnd());
  });

  it("marks short input as not truncated", () => {
    const { linkedin, meta } = transform(sentence(1));

    expect(meta.linkedin.truncated).toBe(false);
    expect(meta.linkedin.chars).toBe(linkedin.length);
  });
});
