import { describe, expect, it, vi } from "vitest";
import { type Imported, importFile, importKind, MAX_FILE_BYTES, sequence } from "./file";

describe("A local file opens into the textarea", () => {
  it.each([
    ["post.md", "markdown"],
    ["post.markdown", "markdown"],
    ["notes.txt", "markdown"],
    ["page.html", "html"],
    ["draft.docx", "docx"],
    ["DRAFT.DOCX", "docx"],
  ])("routes %s to the %s path", (name, kind) => {
    expect(importKind(name, 10)).toEqual({ kind });
  });

  it.each(["md", "x.constructor", "post.md.png"])("refuses %s", (name) => {
    expect(importKind(name, 10)).toHaveProperty("error");
  });

  it("refuses an unsupported file, and names the supported extensions", () => {
    const result = importKind("photo.png", 10);

    expect(result).toHaveProperty("error");
    for (const extension of [".md", ".markdown", ".txt", ".html", ".docx"]) {
      expect(result).toHaveProperty("error", expect.stringContaining(extension));
    }
  });

  it("refuses a file of 2 MB, and names the 1 MB limit", () => {
    expect(importKind("post.md", 2 * 1024 * 1024)).toEqual({ error: expect.stringContaining("1 MB") });
  });

  it("accepts a file of exactly 1 MB", () => {
    expect(MAX_FILE_BYTES).toBe(1024 * 1024);
    expect(importKind("post.md", MAX_FILE_BYTES)).toEqual({ kind: "markdown" });
  });
});

// The page calls `importFile`, so the Open file control has a test beside its logic (AGENTS.md).
describe("The Open file control imports a file", () => {
  it("loads a markdown file unchanged", async () => {
    expect(await importFile(new File(["# Post\n\ntext\n"], "post.md"))).toEqual({ markdown: "# Post\n\ntext\n" });
  });

  it("converts an HTML file", async () => {
    expect(await importFile(new File(["<h2>Setup</h2>"], "page.html"))).toEqual({ markdown: "## Setup\n" });
  });

  it("refuses a file of 2 MB, and does not read it", async () => {
    const text = vi.fn(async () => "");

    const imported = await importFile({ name: "post.md", size: 2 * 1024 * 1024, text, arrayBuffer: vi.fn() });

    expect(imported).toEqual({ error: expect.stringContaining("1 MB") });
    expect(text).not.toHaveBeenCalled();
  });

  it("names a file that does not convert", async () => {
    expect(await importFile(new File(["not a zip"], "bad.docx"))).toEqual({ error: "The page could not convert bad.docx." });
  });

  // docs/reviews/2026-09-27-add-jira-gdocs-and-import.md, finding 16: an empty result erased the draft.
  it("gives a message, not an empty text, for a file with no text", async () => {
    for (const file of [new File([" \n"], "empty.md"), new File(['<img src="data:image/png;base64,AAAA">'], "image.html")]) {
      expect(await importFile(file)).toEqual({ error: `The page found no text in ${file.name}.` });
    }
  });
});

// docs/reviews/2026-09-27-review-fixes.md, rule violation: the stale guard lived in the component with no test.
describe("An import that ends late changes nothing", () => {
  it("drops an import that ends after a later import", async () => {
    const imports = sequence();
    let finish!: (imported: Imported) => void;
    const slow = imports.load(new Promise((resolve) => (finish = resolve)));
    const fast = imports.load(Promise.resolve({ markdown: "fast" }));
    finish({ markdown: "slow" });

    expect(await fast).toEqual({ markdown: "fast" });
    expect(await slow).toBeUndefined();
  });

  it("drops an import that ends after an edit", async () => {
    const imports = sequence();
    const late = imports.load(Promise.resolve({ markdown: "late" }));
    imports.edit();

    expect(await late).toBeUndefined();
  });
});
