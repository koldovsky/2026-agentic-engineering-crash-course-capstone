import { convert, type Imported } from "./import/file";

/**
 * Copy `text`, and report the outcome instead of a rejection. A refused permission rejects, and
 * a browser with no clipboard API passes `undefined`.
 *
 * With `html`, the copy is rich text: one clipboard item with a `text/html` entry and a
 * `text/plain` entry. Google Docs, Word and Gmail paste the HTML. A plain text field pastes `text`.
 * A browser with no `ClipboardItem` throws inside the `try`, so it reports failed too.
 */
export async function copy(
  text: string,
  clipboard: { writeText(text: string): Promise<void>; write?(items: ClipboardItem[]): Promise<void> } | undefined,
  html?: string,
): Promise<"copied" | "failed"> {
  if (!clipboard) return "failed";
  try {
    if (html === undefined) {
      await clipboard.writeText(text);
    } else {
      if (!clipboard.write) return "failed";
      const blob = (value: string, type: string) => new Blob([value], { type });
      await clipboard.write([
        new ClipboardItem({ "text/html": blob(html, "text/html"), "text/plain": blob(text, "text/plain") }),
      ]);
    }
    return "copied";
  } catch {
    return "failed";
  }
}

/**
 * The Paste rich text control: the `text/html` entry of the clipboard, as markdown. It is a button,
 * not a paste handler, because VS Code puts HTML on the clipboard when it copies plain markdown.
 */
export async function paste(clipboard: Pick<Clipboard, "read">): Promise<Imported> {
  let html: string;
  try {
    const item = (await clipboard.read()).find((entry) => entry.types.includes("text/html"));
    if (!item) return { error: "The clipboard holds no rich text. Copy from Google Docs, Word or a web page first." };
    html = await (await item.getType("text/html")).text();
  } catch {
    return { error: "The page could not read the clipboard. Allow clipboard access, then try again." };
  }
  return convert(async () => (await import("./import/html")).htmlToMarkdown(html), "the rich text");
}
