import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { htmlToMarkdown } from "./html";

describe("HTML converts to markdown", () => {
  it("keeps a heading and a link", () => {
    const markdown = htmlToMarkdown('<h2>Setup</h2><p>See <a href="https://example.com">docs</a>.</p>');

    expect(markdown.split("\n")).toContain("## Setup");
    expect(markdown).toContain("[docs](https://example.com)");
  });

  it("keeps the language of a code block", () => {
    const markdown = htmlToMarkdown('<pre><code class="language-ts">const a = 1</code></pre>');

    expect(markdown).toContain("```ts\nconst a = 1\n```");
  });

  it("drops a script and a style", () => {
    const markdown = htmlToMarkdown("<style>p { color: red }</style><script>alert(1)</script><p>Hi</p>");

    expect(markdown).toContain("Hi");
    expect(markdown).not.toContain("alert");
    expect(markdown).not.toContain("color");
  });

  it("drops an inline image and an image with no source, and keeps a linked image", () => {
    const markdown = htmlToMarkdown(
      '<p><img src="data:image/png;base64,AAAA" alt="a"><img src="" alt="c"><img src="https://example.com/b.png" alt="b"></p>',
    );

    expect(markdown).toContain("![b](https://example.com/b.png)");
    expect(markdown).not.toContain("data:");
    expect(markdown.match(/!\[/g)).toHaveLength(1);
  });

  // The human chose a hand-made fixture on 2026-09-27. It copies the Google Docs clipboard shape:
  // the `docs-internal-guid` wrapper with a normal weight, and a style on each span. It is NOT a
  // captured clipboard, so the paste in task 9.1 is the only proof against real Google Docs.
  it("keeps only the real bold of Google Docs HTML", () => {
    const html = readFileSync(new URL("./fixtures/gdocs.html", import.meta.url), "utf8");

    expect(htmlToMarkdown(html).trim().split("\n")).toEqual(["# Release notes", "", "Run the **check** before you push."]);
  });

  // docs/reviews/2026-09-27-add-jira-gdocs-and-import.md, finding 1. mammoth writes the same tags.
  it("turns a table and struck-through text into plain text", () => {
    const markdown = htmlToMarkdown(
      "<table><thead><tr><th>a</th></tr></thead><tbody><tr><td><p>b</p></td></tr></tbody></table>" +
        "<p><s>old</s> <del>gone</del> <strike>was</strike></p>",
    );

    for (const text of ["a", "b", "old gone was"]) expect(markdown).toContain(text);
  });

  // Findings 4, 5 and 14. mammoth writes an `<a id>` with no href for each Word bookmark.
  it.each([
    '<a href="javascript:alert(1)">click</a>',
    '<a href="JavaScript:alert(1)">click</a>',
    '<a href="java&#9;script:alert(1)">click</a>',
    '<a href="data:text/html,x">click</a>',
    '<a id="_Toc1">click</a>',
  ])("keeps the text and drops the link of %s", (html) => {
    expect(htmlToMarkdown(html).trim()).toBe("click");
  });

  // docs/reviews/2026-09-27-review-fixes.md, spec drift: `select`, `textarea` and `button` kept their text.
  it("drops an unsafe image, audio, video, a frame and the form fields", () => {
    const markdown = htmlToMarkdown(
      '<p><img src="DATA:image/png;base64,AAAA" alt="x"><img src="javascript:x" alt="y">' +
        '<video src="a.mp4"></video><audio src="a.mp3"></audio><iframe src="https://example.com" title="t"></iframe>' +
        '<input type="url" value="javascript:x"><select><option>a</option></select><textarea>t</textarea>' +
        "<button>b</button>end</p>",
    );

    expect(markdown.trim()).toBe("end");
  });

  // Finding 1: `rehype-remark` resolves each URL against a `<base>`, after the check of the raw URL.
  it.each(['<base href="javascript://%0aalert(1)/"><a href="x">click</a>', '<base href="javascript:alert(1)"><a href="x">click</a>'])(
    "ignores the base URL of %s",
    (html) => {
      expect(htmlToMarkdown(html).trim()).toBe("[click](x)");
    },
  );

  it("keeps an http, a mailto and a relative link", () => {
    const markdown = htmlToMarkdown(
      '<a href="https://example.com">a</a> <a href="mailto:me@example.com">b</a> <a href="/docs">c</a> <a href="#top">d</a>',
    );

    expect(markdown.trim()).toBe("[a](https://example.com) [b](mailto:me@example.com) [c](/docs) [d](#top)");
  });

  // Finding 15: markdown does not read `**bold **word` as bold, so the output fell back to `&#x20;`.
  it("writes marks that stay readable inside a word and next to a space", () => {
    expect(htmlToMarkdown("<p>x<em>y</em>z</p>").trim()).toBe("x*y*z");
    expect(htmlToMarkdown('<p>one <span style="font-weight:700">bold </span>word</p>').trim()).toBe("one **bold** word");
    expect(htmlToMarkdown("<p>a<strong> b </strong>c</p>").trim()).toBe("a **b** c");
    expect(htmlToMarkdown("<p>a<b> </b>c<b></b>d</p>").trim()).toBe("a cd");
  });

  // Finding 7: a link inside a mark kept its space, and the mark printed `&#x61;` next to it.
  it("moves the spaces at the edge of a link out of the mark around it", () => {
    expect(htmlToMarkdown('<p><b><a href="https://x.com">link </a></b>after</p>').trim()).toBe("**[link](https://x.com)** after");
  });

  // Finding 2: `/\s*$/` took 4.6 s here.
  it("reads a long run of spaces inside a mark in linear time", () => {
    const start = performance.now();
    htmlToMarkdown(`<p><b>y${" ".repeat(100_000)}x</b></p>`);

    expect(performance.now() - start).toBeLessThan(1000);
  });
});
