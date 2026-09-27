/**
 * The largest file that the page reads. It is higher than the 100 KB that the transform accepts,
 * because a `.docx` file is compressed, and its markdown is much smaller than the file.
 */
export const MAX_FILE_BYTES = 1024 * 1024;

/** The conversion path for a file, or the reason the page refuses it. Call it before the file is read. */
export function importKind(name: string, size: number): { kind: "markdown" | "html" | "docx" } | { error: string } {
  const kind = /\.(md|markdown|txt)$/i.test(name)
    ? "markdown"
    : /\.html$/i.test(name)
      ? "html"
      : /\.docx$/i.test(name)
        ? "docx"
        : undefined;
  if (!kind) return { error: "Open a .md, .markdown, .txt, .html or .docx file." };
  if (size > MAX_FILE_BYTES) return { error: "The file is over the 1 MB limit." };
  return { kind };
}

/** What an import gives the page: markdown for the textarea, or the message to show instead. */
export type Imported = { markdown: string } | { error: string };

/** Run a conversion. A throw or a result with no text gives a message, so the textarea keeps its draft. */
export async function convert(run: () => Promise<string>, name: string): Promise<Imported> {
  try {
    const markdown = await run();
    return markdown.trim() ? { markdown } : { error: `The page found no text in ${name}.` };
  } catch {
    return { error: `The page could not convert ${name}.` };
  }
}

/**
 * The stale guard of the page. It numbers each import and each edit of the textarea. An import that
 * ends after a later import or edit is stale, and `load` gives `undefined` for it.
 */
export function sequence() {
  let latest = 0;
  return {
    edit: () => void latest++,
    async load(pending: Promise<Imported>): Promise<Imported | undefined> {
      const id = ++latest;
      const imported = await pending;
      return id === latest ? imported : undefined;
    },
  };
}

/**
 * The Open file control. The route check runs before the file is read. The HTML and `.docx`
 * conversions load on demand, so the first page load carries none of them.
 */
export async function importFile(file: Pick<File, "name" | "size" | "text" | "arrayBuffer">): Promise<Imported> {
  const route = importKind(file.name, file.size);
  if ("error" in route) return route;
  return convert(async () => {
    if (route.kind === "markdown") return file.text();
    if (route.kind === "html") return (await import("./html")).htmlToMarkdown(await file.text());
    // mammoth in Node reads `{ buffer }` only, so the browser run is the proof of this line.
    return (await import("./docx")).docxToMarkdown({ arrayBuffer: await file.arrayBuffer() });
  }, file.name);
}
