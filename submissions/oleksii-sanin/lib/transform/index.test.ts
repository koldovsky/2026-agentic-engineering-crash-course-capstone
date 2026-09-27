import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { transform } from "./index";

const SOURCE = `# Title

A paragraph with a [link](https://example.com/a?b=1) in it.
`;

describe("One source, all channel outputs", () => {
  it("returns all six outputs together", () => {
    const result = transform(SOURCE);

    expect(result.blog).not.toBe("");
    expect(result.email).not.toBe("");
    expect(result.x.length).toBeGreaterThan(0);
    expect(result.linkedin).not.toBe("");
    expect(result.jira).not.toBe("");
    expect(result.gdocs).not.toBe("");
  });

  it("returns the same output for the same input", () => {
    expect(transform(SOURCE)).toEqual(transform(SOURCE));
  });

  it("returns empty outputs for an empty string, and throws nothing", () => {
    const result = transform("");

    expect(result.blog).toBe("");
    expect(result.email).toBe("");
    expect(result.x).toEqual([]);
    expect(result.linkedin).toBe("");
    expect(result.jira).toBe("");
    expect(result.gdocs).toBe("");
  });

  // Review finding 2.3: the rule had no test.
  it("imports no React and no Next", () => {
    const dir = fileURLToPath(new URL(".", import.meta.url));
    const sources = readdirSync(dir).filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"));

    expect(sources).toContain("index.ts");
    for (const file of sources) {
      expect(readFileSync(`${dir}${file}`, "utf8"), file).not.toMatch(/["'](react|react-dom|next)(\/[^"']*)?["']/);
    }
  });
});

// Review findings 2.2, 3.2 and 3.3: a count compared with `.length` restates the code. The
// cases below assert literal numbers for fixed sources.
describe("The result reports its own size", () => {
  it("counts the thread parts", () => {
    // Three sentences of 206 characters. No two fit one part, so the thread has three.
    const long = (n: number): string => `Sentence ${n} ${"word ".repeat(37)}ends here.`;

    const { meta } = transform([1, 2, 3].map(long).join(" "));

    expect(meta.x.parts).toBe(3);
  });

  it("counts the characters of each output", () => {
    const result = transform(SOURCE);

    expect(result.meta.blog.chars).toBe(result.blog.length);
    expect(result.meta.email.chars).toBe(result.email.length);
    expect(transform(`${"a".repeat(1199)}.`).meta.linkedin.chars).toBe(1200);
    // "Title\n\n1/1"
    expect(transform("# Title\n").meta.x).toEqual({ parts: 1, chars: 10 });
  });

  it("counts the Jira and Google Docs outputs", () => {
    const { jira, gdocs, meta } = transform("## Setup\n");

    expect([jira, gdocs]).toEqual(["h2. Setup", "<h2>Setup</h2>"]);
    expect(meta.jira).toEqual({ chars: 9 });
    expect(meta.gdocs).toEqual({ chars: 14 });
  });

  it("reports zero for every output of an empty source", () => {
    const { meta } = transform("");

    expect(meta).toEqual({
      blog: { chars: 0 },
      email: { chars: 0 },
      x: { parts: 0, chars: 0 },
      linkedin: { chars: 0, truncated: false },
      jira: { chars: 0 },
      gdocs: { chars: 0 },
    });
  });
});
