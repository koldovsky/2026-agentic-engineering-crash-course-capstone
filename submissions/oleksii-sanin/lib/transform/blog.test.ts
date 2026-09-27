import { describe, expect, it } from "vitest";
import { transform } from "./index";

describe("Blog output keeps the document structure", () => {
  it("keeps a fenced code block as a code block", () => {
    const source = ["```ts", "const a = 1;", "const b = 2;", "```", ""].join("\n");

    const { blog } = transform(source);

    expect(blog).toContain('<pre><code class="language-ts">');
    expect(blog).toContain("const a = 1;");
    expect(blog).toContain("const b = 2;");
    // Both lines sit inside the one code element, not beside it.
    const code = blog.slice(blog.indexOf("<pre>"), blog.indexOf("</pre>"));
    expect(code).toContain("const a = 1;\nconst b = 2;");
  });

  it("keeps the target of a link", () => {
    const { blog } = transform("[docs](https://example.com/a?b=1)");

    expect(blog).toContain('<a href="https://example.com/a?b=1">docs</a>');
  });

  it("keeps headings and lists", () => {
    const { blog } = transform("## Title\n\n- one\n- two\n");

    expect(blog).toContain("<h2>Title</h2>");
    expect(blog).toContain("<ul>");
    expect(blog).toContain("<li>one</li>");
  });
});
