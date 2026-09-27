import { describe, expect, it } from "vitest";
import { transform } from "./index";

const lines = (text: string): string[] => text.split("\n");

describe("Jira output is wiki markup", () => {
  it("gives a heading its level prefix", () => {
    expect(lines(transform("## Setup\n").jira)).toContain("h2. Setup");
  });

  it("uses the Jira marks for emphasis", () => {
    const { jira } = transform("A **bold** and _italic_ word.\n");

    expect(jira).toBe("A *bold* and _italic_ word.");
  });

  it("puts inline code between double braces", () => {
    expect(transform("Run `pnpm check` first.\n").jira).toBe("Run {{pnpm check}} first.");
  });

  it("keeps the language of a fenced code block", () => {
    const { jira } = transform(["```ts", "const a = 1;", "const b = 2;", "```", ""].join("\n"));

    expect(jira).toBe(["{code:ts}", "const a = 1;", "const b = 2;", "{code}"].join("\n"));
  });

  it("gives a fence with no language a bare code macro", () => {
    const { jira } = transform(["```", "a {b} [c]", "```", ""].join("\n"));

    // Code is never escaped. Jira reads no markup inside the macro.
    expect(jira).toBe(["{code}", "a {b} [c]", "{code}"].join("\n"));
  });

  it("uses the pipe form for a link", () => {
    expect(transform("[docs](https://example.com/a?b=1)\n").jira).toBe("[docs|https://example.com/a?b=1]");
  });

  it("keeps the depth and the type of a nested list", () => {
    const { jira } = transform(["- bullet", "  1. numbered", "- next", ""].join("\n"));

    expect(lines(jira)).toEqual(["* bullet", "*# numbered", "* next"]);
  });

  it("puts a block quote of two paragraphs in the quote macro", () => {
    const { jira } = transform(["> First.", ">", "> Second.", ""].join("\n"));

    expect(jira).toBe(["{quote}", "First.", "", "Second.", "{quote}"].join("\n"));
  });

  it("escapes markup characters in plain text", () => {
    expect(transform("use {name} or [id]\n").jira).toBe("use \\{name\\} or \\[id\\]");
  });

  // The spec names `#` and `-` at the start of a line. Inside a line, `-` stays as it is.
  it("escapes a list mark at the start of a line only", () => {
    expect(transform("\\# not a heading\n\n\\- not a list, a-b\n").jira).toBe(
      "\\# not a heading\n\n\\- not a list, a-b",
    );
  });

  // docs/reviews/2026-09-27-add-jira-gdocs-and-import.md, findings 9 to 12.
  it("escapes a heading mark and a quote mark at the start of a line", () => {
    expect(transform("h2. looks like a heading\n\nbq. looks like a quote\n").jira).toBe(
      "h2\\. looks like a heading\n\nbq\\. looks like a quote",
    );
  });

  it("joins a nested block quote into the outer quote", () => {
    expect(transform("> nested\n>\n>> deeper\n").jira).toBe("{quote}\nnested\n\ndeeper\n{quote}");
  });

  it("keeps a code block in a list item with no blank line before it", () => {
    const { jira } = transform(["- a", "  ```js", "  x", "  ```", "- b", ""].join("\n"));

    expect(lines(jira)).toEqual(["* a", "{code:js}", "x", "{code}", "* b"]);
  });

  // docs/reviews/2026-09-27-review-fixes.md, finding 6: the blank line ended the Jira list.
  it("joins a quote in a list item into the item, with no blank line", () => {
    expect(lines(transform("- a\n\n  > q\n- b\n").jira)).toEqual(["* a", "q", "* b"]);
  });

  // Finding 8 of that review: a `!` in the URL closed the image early.
  it("encodes a bang in the URL of an image", () => {
    expect(transform("![](https://x.com/wow!.png)\n").jira).toBe("!https://x.com/wow%21.png!");
  });

  it("uses the bang form for an image", () => {
    expect(transform("Text with ![i](https://example.com/i.png) image\n").jira).toBe("Text with !https://example.com/i.png! image");
  });
});
