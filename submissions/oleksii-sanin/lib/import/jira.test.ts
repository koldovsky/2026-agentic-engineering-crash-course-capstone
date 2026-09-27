import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { transform } from "@/lib/transform";
import { jiraToMarkdown } from "./jira";

const FIXTURE = readFileSync(new URL("./fixtures/round-trip.md", import.meta.url), "utf8");

describe("Jira wiki markup converts to markdown", () => {
  it("keeps the blog HTML of a markdown source through a round trip", () => {
    const { jira, blog } = transform(FIXTURE);

    // The fixture must reach every construct that the Jira output writes.
    for (const mark of ["h1. ", "h3. ", "*bold*", "_italic_", "{{pnpm check}}", "[link|", "{code:ts}", "{code}",
      "\n*# ", "\n** ", "\n# ", "\n#* ", "\\*not bold\\*", "\\[not\\|a link\\]", "{quote}", "----", "\\{", "\\*", "\\_", "\\|", "\\!", "\n\\#", "\n\\-",
      // docs/reviews/2026-09-27-add-jira-gdocs-and-import.md: the constructs that did not round-trip.
      "|https://example.com/*a*/b]", "!https://example.com/i.png!", "{{a ` b}}", "{{{name}}}", "List<String>", "`tick`",
      "\nh2\\. ", "\nbq\\. ", "{code}\n```\ninner fence", "* item with code\n{code:js}\n",
      // docs/reviews/2026-09-27-review-fixes.md, finding 5.
      "* {code:js}\nlet y"]) {
      expect(jira, mark).toContain(mark);
    }
    expect(transform(jiraToMarkdown(jira)).blog).toBe(blog);
  });

  it("passes an unsupported macro through as text", () => {
    expect(jiraToMarkdown("{panel}Note{panel}")).toContain("Note");
  });

  it("turns a heading into its markdown form", () => {
    expect(jiraToMarkdown("h2. Setup")).toBe("## Setup");
  });

  // design.md: people who write Jira by hand use both.
  it("reads a noformat block and a bq. line", () => {
    expect(jiraToMarkdown("bq. Quoted\n\n{noformat}\na *b*\n{noformat}")).toBe("> Quoted\n\n```\na *b*\n```");
  });

  // Markdown reads `----` under a text line as a heading underline.
  it("keeps a rule under a text line a rule", () => {
    const { blog } = transform(jiraToMarkdown("Text\n----"));

    expect(blog).toBe("<p>Text</p>\n<hr>");
  });

  it("closes a code block that Jira leaves open", () => {
    expect(jiraToMarkdown("{code:js}\nlet a")).toBe("```js\nlet a\n```");
  });

  // docs/reviews/2026-09-27-add-jira-gdocs-and-import.md, missing tests: the macro parameters.
  it("reads the language of a code macro with parameters", () => {
    expect(jiraToMarkdown("{code:java|title=A.java}\nx\n{code}")).toBe("```java\nx\n```");
    expect(jiraToMarkdown("{code:title=A.java}\nx\n{code}")).toBe("```\nx\n```");
  });

  // Findings 2, 3, 7, 8, 11 and 12, one input each. The round-trip fixture holds them too.
  it("keeps the stars of a link URL", () => {
    expect(jiraToMarkdown("[a|https://x.com/*foo*/bar*]")).toBe("[a](https://x.com/*foo*/bar*)");
  });

  it("keeps angle brackets and backticks as text", () => {
    expect(transform(jiraToMarkdown("returns List<String>, use `tick` here")).blog).toBe(
      "<p>returns List&#x3C;String>, use `tick` here</p>",
    );
  });

  it("gives code that holds backticks a longer fence", () => {
    expect(jiraToMarkdown("{code}\n```\ninner\n```\n{code}")).toBe("````\n```\ninner\n```\n````");
    expect(transform(jiraToMarkdown("{{a ` b}} and {{{a}}}")).blog).toBe("<p><code>a ` b</code> and <code>{a}</code></p>");
  });

  it("keeps a code block under the list item before it", () => {
    expect(jiraToMarkdown("* a\n{code:js}\nx\n{code}\n* b")).toBe("- a\n  ```js\n  x\n  ```\n- b");
  });

  // Finding 6 of docs/reviews/2026-09-27-review-fixes.md. Jira ends a list item at a blank line only.
  it("keeps the text under a code block in the list item", () => {
    expect(jiraToMarkdown("* a\n{code:js}\nx\n{code}\nmore\n* b\n\nout")).toBe("- a\n  ```js\n  x\n  ```\n  more\n- b\n\nout");
  });

  it("reads an image", () => {
    expect(jiraToMarkdown("see !https://x.com/i.png! and !a.png|thumbnail!")).toBe("see ![](https://x.com/i.png) and ![](a.png)");
  });

  // Finding 19: the regexes were quadratic, and 40,000 `[` took 4.1 s.
  it.each(["[", "{", "[a|b "])("reads a long line of %j in linear time", (unit) => {
    const start = performance.now();
    jiraToMarkdown(unit.repeat(100_000));

    expect(performance.now() - start).toBeLessThan(1000);
  });

  // docs/reviews/2026-09-27-review-fixes.md, missing tests: no input reached the padding of a span.
  it("pads a code span with a backtick or a space at each end", () => {
    expect(jiraToMarkdown("{{`}}")).toBe("`` ` ``");
    expect(jiraToMarkdown("{{ a }}")).toBe("`  a  `");
  });

  // Finding 3 of that review: the padding regex took 3.8 s here.
  it("reads a long code span that starts with a space in linear time", () => {
    const start = performance.now();
    jiraToMarkdown(`{{ ${"a".repeat(100_000)}}}`);

    expect(performance.now() - start).toBeLessThan(1000);
  });

  // Finding 4 of that review: a kept URL held a placeholder, and the one restore pass left it in.
  it("keeps an escape and a code span inside a link or an image URL", () => {
    expect(jiraToMarkdown("[a|https://x.com/a\\_b]")).toBe("[a](https://x.com/a\\_b)");
    expect(jiraToMarkdown("[share|\\\\server\\share]")).toBe("[share](\\\\server\\share)");
    for (const input of ["[a|https://x.com/{{id}}]", "!foo[a|https://x.com]bar!"]) {
      expect(jiraToMarkdown(input)).not.toMatch(/[]/);
    }
  });

  // Finding 20: the placeholders are private-use characters, and input can hold them too.
  it("keeps text that looks like a placeholder", () => {
    expect(jiraToMarkdown("text \uE0000\uE001 here")).toBe("text 0 here");
  });
});

