import { describe, expect, it } from "vitest";
import { transform } from "./index";

const MONOSPACE_FONT = /\sstyle="font-family:[^;"]*monospace/;

describe("Google Docs output pastes as formatted text", () => {
  it("puts no style on a heading, a list or a link", () => {
    const { gdocs } = transform("## Setup\n\n- [docs](https://example.com)\n");

    expect(gdocs).toContain("<h2>Setup</h2>");
    // Google Docs maps a bare element to its own heading and list styles.
    expect(gdocs).not.toMatch(/<(h2|ul|li|a|p)\s[^>]*style=/);
  });

  it("keeps a code block and inline code monospace", () => {
    const { gdocs } = transform(["Run `pnpm check`.", "", "```ts", "const a = 1;", "```", ""].join("\n"));

    expect(gdocs).toMatch(new RegExp(`<pre${MONOSPACE_FONT.source}`));
    expect(gdocs).toMatch(new RegExp(`<p>Run <code${MONOSPACE_FONT.source}[^>]*>pnpm check</code>`));
  });
});
