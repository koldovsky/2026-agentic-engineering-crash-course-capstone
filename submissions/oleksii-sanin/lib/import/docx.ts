import mammoth from "mammoth";

import { htmlToMarkdown } from "./html";

/**
 * A `.docx` file to markdown: `mammoth` writes HTML, and the HTML path does the rest. `mammoth`
 * writes an image as a `data:` URL, and the HTML path drops it. The input is the `mammoth` input:
 * the page passes `{ arrayBuffer }`, and Node passes `{ buffer }`.
 */
export async function docxToMarkdown(input: Parameters<typeof mammoth.convertToHtml>[0]): Promise<string> {
  return htmlToMarkdown((await mammoth.convertToHtml(input)).value);
}
