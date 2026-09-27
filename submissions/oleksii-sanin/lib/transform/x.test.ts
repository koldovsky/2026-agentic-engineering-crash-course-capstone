import { describe, expect, it } from "vitest";
import { transform } from "./index";

const GRAPHEMES = new Intl.Segmenter("en", { granularity: "grapheme" });
const count = (text: string): number => [...GRAPHEMES.segment(text)].length;

/** A part without its trailing `n/total` counter. */
const body = (part: string): string => part.replace(/\n\n\d+\/\d+$/, "");

/** One sentence of about 100 characters, ending with a full stop. */
const sentence = (n: number): string => `Sentence ${n} ${"word ".repeat(17)}ends here.`;

const FAMILY = "\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}";

describe("The X thread splits at sentence boundaries", () => {
  it("gives one part for short input, and it counts 1/1", () => {
    const { x } = transform(sentence(1));

    expect(x).toHaveLength(1);
    expect(x[0]).toMatch(/\n\n1\/1$/);
    expect(count(x[0])).toBeLessThanOrEqual(280);
  });

  it("splits long input on sentences", () => {
    const source = [1, 2, 3, 4, 5, 6].map(sentence).join(" ");

    const { x } = transform(source);

    expect(x.length).toBeGreaterThan(1);
    for (const part of x) {
      expect(count(part)).toBeLessThanOrEqual(280);
      expect(body(part).trimEnd()).toMatch(/\.$/);
    }
    // The packing is greedy: a part carries as many sentences as fit. Without this bound a
    // splitter that emitted one sentence per part would satisfy every assertion above.
    for (const part of x.slice(0, -1)) expect(count(part)).toBeGreaterThan(150);
  });

  it("splits a sentence longer than the limit at a word boundary", () => {
    const source = `${"word ".repeat(79)}end`;

    const { x } = transform(source);

    expect(x.length).toBeGreaterThan(1);
    for (const part of x) expect(count(part)).toBeLessThanOrEqual(280);
    // No part cuts a word: the words of all parts, in order, are the words of the source.
    const words = x.flatMap((part) => body(part).split(/\s+/).filter(Boolean));
    expect(words).toEqual(source.split(/\s+/).filter(Boolean));
  });

  // docs/reviews/2026-09-27-task-6-5-fixes.md, finding 13: the cut fell at a "-" inside the URL.
  // Round 2, finding 1: the cut fell after the "?", which Intl.Segmenter reads as a sentence end.
  const VIDEO = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  it.each([
    ["with a path", "https://example.com/some-long-path-here/and-more", (url: string) => `${"word ".repeat(50)}${url} now`],
    ["with a query", VIDEO, (url: string) => `${"word ".repeat(46)}${url} now.`],
    ["as a link target", VIDEO, (url: string) => `${"word ".repeat(43)}ok. Read [the video](${url}) now.`],
  ])("keeps a URL %s whole in a sentence longer than a part", (_, url, source) => {
    const { x } = transform(source(url));

    expect(x.length).toBeGreaterThan(1);
    expect(x.filter((part) => part.includes(url))).toHaveLength(1);
    for (const part of x) expect(count(part)).toBeLessThanOrEqual(280);
  });

  // Review finding 1.2, docs/reviews/2026-09-20-lib-transform-groups-2-3.md.
  it("splits a word longer than a part from the part in progress", () => {
    const source = `See https://example.com/${"a".repeat(400)} now.`;

    const { x } = transform(source);

    // 429 graphemes fit in two parts of 275. The broken split gave three: the first part held
    // the 24 graphemes before the long word and nothing else.
    expect(x).toHaveLength(2);
    expect(count(body(x[0]))).toBe(275);
  });

  it("keeps a family emoji whole and counts it as one grapheme", () => {
    // 272 graphemes, and 572 UTF-16 code units. The sentence fits one part only if the limit
    // counts graphemes, so the limit acts on the emoji (review finding 2.1).
    const source = `${"a".repeat(240)} ${FAMILY.repeat(30)}.`;

    const { x } = transform(source);

    expect(x).toHaveLength(1);
    expect(body(x[0])).toBe(source);
    expect(count(x[0])).toBeLessThanOrEqual(280);
  });

  it("keeps a URL whole when it lands at the limit", () => {
    const url = "https://example.com/a-fairly-long-path/for-the-limit-case?q=1";
    const source = `${"word ".repeat(48)}ends here. Read [the docs](${url}) now.`;

    const { x } = transform(source);

    expect(x.length).toBeGreaterThan(1);
    // Part 1 is nearly full, so the URL moved because of the limit and not for some other
    // reason. Without this bound the case would pass even if the parts split anywhere.
    expect(count(x[0])).toBeGreaterThan(200);
    expect(x[0]).not.toContain("https://");
    // The URL sits in exactly one part, uncut. A split inside it would give two parts that
    // each hold a piece, and neither piece would be a link any more.
    expect(x.filter((part) => part.includes(url))).toHaveLength(1);
    // The spec puts each URL on its own line (review finding 4.3).
    expect(x.some((part) => body(part).split("\n").includes(url))).toBe(true);
    for (const part of x) expect(count(part)).toBeLessThanOrEqual(280);
  });

  it("gives a fenced code block its own part", () => {
    const source = [
      "A paragraph before the code.",
      "",
      "```ts",
      "const a = 1;",
      "const b = 2;",
      "const c = 3;",
      "const d = 4;",
      "const e = 5;",
      "```",
      "",
    ].join("\n");

    const { x } = transform(source);

    const codeParts = x.filter((part) => part.includes("const a = 1;"));
    expect(codeParts).toHaveLength(1);
    expect(codeParts[0]).toContain("const e = 5;");
    expect(codeParts[0]).not.toContain("A paragraph before the code.");

    const textParts = x.filter((part) => part.includes("A paragraph before the code."));
    expect(textParts).toHaveLength(1);
    expect(textParts[0]).not.toContain("const a = 1;");
  });

  // Review finding 1.5: the code merged into the list text and lost its fence.
  it("gives a fenced code block inside a list item its own part", () => {
    const source = ["- item one", "", "  ```ts", "  const a = 1;", "  const b = 2;", "  ```", ""].join(
      "\n",
    );

    const { x } = transform(source);

    expect(x.map(body)).toEqual(["• item one", "```\nconst a = 1;\nconst b = 2;\n```"]);
  });

  // docs/reviews/2026-09-27-task-6-5-fixes.md, finding 9.
  it("gives a fenced code block inside a quote its own part", () => {
    const { x } = transform("> Run:\n>\n> ```\n> npm i\n> ```\n");

    expect(x.map(body)).toEqual(["Run:", "```\nnpm i\n```"]);
  });

  // The same review, finding 1: every command moved below the last step.
  it("keeps the code of each list item below that item", () => {
    const source = [
      "1. Install:",
      "",
      "   ```",
      "   npm i",
      "   ```",
      "",
      "2. Build:",
      "",
      "   ```",
      "   npm run build",
      "   ```",
      "",
    ].join("\n");

    const { x } = transform(source);

    expect(x.map(body)).toEqual(["• Install:", "```\nnpm i\n```", "• Build:", "```\nnpm run build\n```"]);
  });

  // The same review, finding 2.
  it("prints no empty bullet for an item that holds only code", () => {
    const { x, linkedin } = transform("- Install\n- ```sh\n  npm i\n  ```\n- Run\n");

    expect(x.map(body)).toEqual(["• Install", "```\nnpm i\n```", "• Run"]);
    expect(linkedin).not.toMatch(/^•\s*$/m);
  });

  // Review finding 1.3, docs/reviews/2026-09-20-lib-transform-groups-2-3.md.
  it("splits a code line longer than the limit with no part that holds only a fence", () => {
    const source = ["```js", `const x = "${"y".repeat(400)}";`, "```", ""].join("\n");

    const { x } = transform(source);

    for (const part of x) expect(body(part).trim()).not.toMatch(/^`{3}\w*$/);
    // The block is 421 graphemes with its fences, and a part holds 275 before the counter.
    // Two parts are enough. The broken split gave four: a fence, two pieces, a fence.
    expect(x).toHaveLength(2);
    expect(body(x[0])).toMatch(/^```/);
    expect(body(x[1])).toMatch(/```$/);
    for (const part of x) expect(count(part)).toBeLessThanOrEqual(280);
  });

  // The open edge of finding 1.3: a line of 546 filled two parts exactly, and the closing
  // fence got a part of its own. 534 fills two parts exactly under the re-fenced split.
  it.each([400, 534, 546])("fences each piece of a code line of %i characters", (n) => {
    const line = "y".repeat(n);

    const { x } = transform(["```", line, "```", ""].join("\n"));

    for (const part of x) expect(body(part)).toMatch(/^```\ny+\n```$/);
    expect(x.map((part) => body(part).slice(4, -4)).join("")).toBe(line);
    for (const part of x) expect(count(part)).toBeLessThanOrEqual(280);
  });

  // docs/reviews/2026-09-27-task-6-5-fixes.md, findings 8 and 12: the split falls at a line end.
  it("splits a code block at a line end before a line longer than a part", () => {
    const long = "y".repeat(300);

    const { x } = transform(["```", "short", long, "```", ""].join("\n"));

    expect(x.map(body)).toEqual([
      "```\nshort\n```",
      `\`\`\`\n${long.slice(0, 267)}\n\`\`\``,
      `\`\`\`\n${long.slice(267)}\n\`\`\``,
    ]);
  });

  // The same review, finding 3.
  it("keeps a blank line at the start of a code block", () => {
    const { x } = transform("```\n\nfoo\nbar\n```\n");

    expect(x.map(body)).toEqual(["```\n\nfoo\nbar\n```"]);
  });

  // docs/reviews/2026-09-27-task-6-5-fixes-round-2.md, finding 4: the "\r" became a blank line.
  it("splits a CRLF code block at its line ends", () => {
    const line = "y".repeat(267);

    const { x } = transform(`\`\`\`\r\n${line}\r\nshort\r\n\`\`\`\r\n`);

    expect(x.map(body)).toEqual([`\`\`\`\n${line}\n\`\`\``, "```\nshort\n```"]);
  });

  // The same review, findings 4 and 5.
  it.each([
    ["a line break", `${"y".repeat(267)}\n${"y".repeat(300)}`],
    ["a blank line", `${"y".repeat(267)}\n   \n${"y".repeat(265)}`],
  ])("adds no blank piece for %s at a piece boundary", (_, code) => {
    const { x } = transform(`\`\`\`\n${code}\n\`\`\`\n`);

    for (const part of x) expect(body(part)).toMatch(/^```\ny+\n```$/);
  });

  // Review finding 1.4: parts 3 to 6 lost the opening fence, and the indent of their first line.
  it("keeps the fences and the indent on every piece of a long code block", () => {
    const lines = Array.from({ length: 30 }, (_, i) => `    const value${i} = ${i};`);

    const { x } = transform(["```ts", ...lines, "```", ""].join("\n"));

    expect(x.length).toBeGreaterThan(2);
    for (const part of x) expect(body(part)).toMatch(/^```\n {4}const [^]*\n```$/);
    expect(x.flatMap((part) => body(part).split("\n").slice(1, -1))).toEqual(lines);
  });
});
