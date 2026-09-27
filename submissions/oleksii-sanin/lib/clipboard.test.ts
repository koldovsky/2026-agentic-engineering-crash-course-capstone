import { afterEach, describe, expect, it, vi } from "vitest";
import { copy, paste } from "./clipboard";

// docs/reviews/2026-09-27-task-6-5-fixes.md, finding 10.
describe("The copy action reports its outcome", () => {
  it("writes the text, and reports copied", async () => {
    const written: string[] = [];

    const status = await copy("part 2", { writeText: async (text) => void written.push(text) });

    expect(status).toBe("copied");
    expect(written).toEqual(["part 2"]);
  });

  it("reports failed when the clipboard rejects", async () => {
    const status = await copy("part 2", { writeText: () => Promise.reject(new Error("denied")) });

    expect(status).toBe("failed");
  });

  it("reports failed when the browser has no clipboard API", async () => {
    expect(await copy("part 2", undefined)).toBe("failed");
  });
});

/** The stand-in for the browser class. Node has no `ClipboardItem`. */
class FakeItem {
  constructor(readonly entries: Record<string, Blob>) {}
}

describe("The Google Docs tab copies rich text", () => {
  afterEach(() => void vi.unstubAllGlobals());

  it("writes one item with a text/html entry and a text/plain entry", async () => {
    vi.stubGlobal("ClipboardItem", FakeItem);
    const written: FakeItem[] = [];
    const clipboard = {
      writeText: () => Promise.reject(new Error("plain text only")),
      write: async (items: ClipboardItem[]) => void written.push(...(items as unknown as FakeItem[])),
    };

    const status = await copy("## Setup", clipboard, "<h2>Setup</h2>");

    expect(status).toBe("copied");
    expect(written).toHaveLength(1);
    expect(Object.keys(written[0].entries).sort()).toEqual(["text/html", "text/plain"]);
    expect(await written[0].entries["text/html"].text()).toBe("<h2>Setup</h2>");
    expect(await written[0].entries["text/plain"].text()).toBe("## Setup");
  });

  it("reports failed when the browser has no ClipboardItem", async () => {
    const clipboard = { writeText: async () => {}, write: async () => {} };

    expect(await copy("## Setup", clipboard, "<h2>Setup</h2>")).toBe("failed");
  });
});

/** A clipboard that holds one item with the given entries. */
const holding = (entries: Record<string, string>) => ({
  read: async () =>
    [{ types: Object.keys(entries), getType: async (type: string) => new Blob([entries[type]]) }] as unknown as ClipboardItems,
});

// The page calls `paste`, so the Paste rich text control has a test beside its logic (AGENTS.md).
describe("The Paste rich text control reads the HTML entry", () => {
  it("converts the text/html entry to markdown", async () => {
    expect(await paste(holding({ "text/html": "<h2>Setup</h2>", "text/plain": "Setup" }))).toEqual({ markdown: "## Setup\n" });
  });

  it("gives a message when the clipboard holds plain text only", async () => {
    expect(await paste(holding({ "text/plain": "## Setup" }))).toEqual({
      error: "The clipboard holds no rich text. Copy from Google Docs, Word or a web page first.",
    });
  });

  it("gives a message when the browser refuses the read", async () => {
    expect(await paste({ read: () => Promise.reject(new Error("denied")) })).toEqual({
      error: "The page could not read the clipboard. Allow clipboard access, then try again.",
    });
  });

  // docs/reviews/2026-09-27-add-jira-gdocs-and-import.md, finding 16.
  it("gives a message, not an empty text, for rich text with only an inline image", async () => {
    expect(await paste(holding({ "text/html": '<img src="data:image/png;base64,AAAA">' }))).toEqual({
      error: "The page found no text in the rich text.",
    });
  });
});

