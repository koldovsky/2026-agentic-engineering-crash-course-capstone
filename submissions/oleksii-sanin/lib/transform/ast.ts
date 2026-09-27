/**
 * The hast tree, reduced to what the outputs read.
 *
 * `@types/hast` is a transitive dependency, and pnpm hides it from an import here. A full
 * type costs one more dependency and one more human decision, so this module declares the
 * fields that the walks actually touch.
 */

export type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
};

/** One top-level block of the document, as plain text. */
export type Block = {
  /** A code block never merges with prose, and it never splits at a sentence. */
  kind: "code" | "text";
  /** The plain text. For a code block, the code without its fences. */
  text: string;
};

/** Wrap code in the fences that the plain-text outputs print. */
export const fence = (code: string): string => `\`\`\`\n${code}\n\`\`\``;

const GRAPHEMES = new Intl.Segmenter("en", { granularity: "grapheme" });
const SENTENCES = new Intl.Segmenter("en", { granularity: "sentence" });

/** The grapheme count of `text`. X counts differently, and `x.ts` names that ceiling. */
export const graphemes = (text: string): number => [...GRAPHEMES.segment(text)].length;

/** The grapheme clusters of `text`, in order. */
export const clusters = (text: string): string[] => [...GRAPHEMES.segment(text)].map((g) => g.segment);

/**
 * The sentences of `text`. A sentence end is followed by a space or a line end, or it is a
 * full-width mark, which Chinese and Japanese write with no space. Any other boundary sits inside a
 * word, such as the "?" of a URL query, so that piece joins the next one.
 */
export const sentences = (text: string): string[] =>
  [...SENTENCES.segment(text)].reduce<string[]>((out, { segment }) => {
    const last = out.length - 1;
    if (last >= 0 && !/[\s。！？]$/.test(out[last])) out[last] += segment;
    else out.push(segment);
    return out;
  }, []);

/**
 * The words of `text` and the spaces between them. A word is a run with no space in it, so a URL
 * is one word. The `Intl.Segmenter` word granularity cut a URL at each "/" and "-".
 *
 * ponytail: text with no spaces, such as Chinese or Japanese, is one long word, so it falls to
 * the grapheme cut. Split such a word with the `Intl.Segmenter` word granularity if CJK threads
 * matter.
 */
export const words = (text: string): string[] => text.match(/\s+|\S+/g) ?? [];

/** Cut `text` into pieces of at most `budget` graphemes. The last resort, inside one word. */
export const splitGraphemes = (text: string, budget: number): string[] => {
  const all = clusters(text);
  const out: string[] = [];
  for (let i = 0; i < all.length; i += budget) out.push(all.slice(i, i + budget).join(""));
  return out;
};

/** The text of `node` and of everything under it. */
export const textOf = (node: HastNode): string =>
  node.type === "text" ? (node.value ?? "") : (node.children ?? []).map(textOf).join("");

/** The text of `node` less every nested `pre`, which becomes a code block of its own. */
const proseOf = (node: HastNode): string =>
  node.tagName === "pre"
    ? ""
    : node.type === "text"
      ? (node.value ?? "")
      : (node.children ?? []).map(proseOf).join("");

const presOf = (node: HastNode): HastNode[] =>
  node.tagName === "pre" ? [node] : (node.children ?? []).flatMap(presOf);

const hrefsOf = (node: HastNode): string[] => {
  const here = node.tagName === "a" && typeof node.properties?.href === "string"
    ? [node.properties.href as string]
    : [];
  return [...here, ...(node.children ?? []).flatMap(hrefsOf)];
};

/** `url` as the reader sees it. remark percent-encodes an href. A malformed escape stays as it is. */
const readable = (url: string): string => {
  try {
    return decodeURI(url);
  } catch {
    return url;
  }
};

/** One bullet line for each item. An item that holds only code gets no bullet. */
const listText = (items: HastNode[]): string =>
  items
    .map((li) => proseOf(li).trim())
    .filter(Boolean)
    .map((text) => `• ${text}`)
    .join("\n");

/**
 * Turn the document into top-level blocks of plain text.
 *
 * Every URL moves to its own line under the block that holds it. LinkedIn breaks an inline
 * link, and the plain text of a link element would otherwise drop the target altogether.
 */
export function toBlocks(tree: HastNode): Block[] {
  const blocks: Block[] = [];

  /** One text block: `base`, then the target of each link in `nodes` on a line of its own. */
  const addText = (nodes: HastNode[], base: string) => {
    // A bare link is already a line of its own, with or without a bullet.
    const lines = base.split("\n").map((line) => line.replace(/^• /, ""));
    const urls = nodes
      .flatMap(hrefsOf)
      .filter((url) => !lines.includes(url) && !lines.includes(readable(url)));
    const text = [base, ...urls].filter(Boolean).join("\n");
    if (text.trim()) blocks.push({ kind: "text", text });
  };
  const addCode = (node: HastNode) => {
    for (const pre of presOf(node)) {
      const code = textOf(pre).replace(/\n+$/, "");
      if (code.trim()) blocks.push({ kind: "code", text: code });
    }
  };

  for (const node of tree.children ?? []) {
    if (node.type !== "element" || !node.tagName) continue;

    if (node.tagName === "ul" || node.tagName === "ol") {
      // An item that holds code closes the text block, so its code follows its own text.
      // ponytail: the walk splits at each item, not at each `pre`, and it is one level deep. Text
      // below a code block in the same item moves above that code. In a nested list, every command
      // moves below all the steps. The upgrade is a walk that splits at each `pre` and calls itself
      // for a nested list.
      let items: HastNode[] = [];
      for (const li of (node.children ?? []).filter((child) => child.tagName === "li")) {
        items.push(li);
        if (presOf(li).length === 0) continue;
        addText(items, listText(items));
        addCode(li);
        items = [];
      }
      addText(items, listText(items));
      continue;
    }

    addText([node], proseOf(node).trim());
    // ponytail: a code block inside a quote follows all the text of that quote, so text below
    // the code moves above it. The upgrade of the list walk above fixes this too.
    addCode(node);
  }

  return blocks;
}
