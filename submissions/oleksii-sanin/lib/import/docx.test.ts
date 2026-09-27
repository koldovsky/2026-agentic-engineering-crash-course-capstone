/*
 * fixtures/sample.docx comes from python-docx, because macOS textutil writes font sizes, not the
 * Word style named Heading 1, and mammoth reads the style name. Run from this project directory:
 *
 * uv run --no-project --with python-docx python -c '
 * import base64, io, docx
 * d = docx.Document()
 * d.add_heading("Release notes", level=1)
 * p = d.add_paragraph("Run the ")
 * p.add_run("check").bold = True
 * p.add_run(" first.")
 * d.add_paragraph("one", style="List Bullet")
 * d.add_paragraph("two", style="List Bullet")
 * d.add_picture(io.BytesIO(base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")))
 * d.save("lib/import/fixtures/sample.docx")
 * '
 */

import { readFileSync } from "node:fs";
import mammoth from "mammoth";
import { describe, expect, it } from "vitest";
import { docxToMarkdown } from "./docx";

// Node reads `{ buffer }`. The page passes `{ arrayBuffer }`, and only the manual check proves that path.
const buffer = readFileSync(new URL("./fixtures/sample.docx", import.meta.url));

describe("A .docx file converts to markdown", () => {
  it("keeps the heading, the bold word and the list", async () => {
    const lines = (await docxToMarkdown({ buffer })).split("\n");

    expect(lines).toContain("# Release notes");
    expect(lines).toContain("Run the **check** first.");
    expect(lines).toContain("- one");
    expect(lines).toContain("- two");
  });

  it("drops the image", async () => {
    // The fixture holds an image, and mammoth writes it as a data: URL.
    expect((await mammoth.convertToHtml({ buffer })).value).toContain('<img src="data:image/png');

    const markdown = await docxToMarkdown({ buffer });

    expect(markdown).not.toContain("data:");
    expect(markdown).not.toContain("![");
  });
});
