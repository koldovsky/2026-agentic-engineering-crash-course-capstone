import { describe, expect, it } from "vitest";
import { transform } from "./index";

/** The style attribute of the first `tag` element in `html`. */
const styleOf = (html: string, tag: string): string => {
  const match = html.match(new RegExp(`<${tag}[^>]*\\sstyle="([^"]*)"`));
  return match ? match[1] : "";
};

describe("Email output carries inline styles", () => {
  it("puts a style attribute on a heading", () => {
    const { email } = transform("## Title\n");

    expect(email).toMatch(/<h2[^>]*\sstyle="/);
    expect(styleOf(email, "h2")).toContain("font-size");
  });

  it("keeps a code block readable with a monospace font", () => {
    const { email } = transform(["```ts", "const a = 1;", "```", ""].join("\n"));

    expect(styleOf(email, "pre")).toContain("monospace");
    expect(styleOf(email, "code")).toContain("monospace");
  });

  it("uses no style block and no external stylesheet, because Gmail strips both", () => {
    const { email } = transform("## Title\n\nA paragraph.\n");

    expect(email).not.toContain("<style");
    expect(email).not.toContain("<link");
    expect(styleOf(email, "p")).toContain("line-height");
  });
});
