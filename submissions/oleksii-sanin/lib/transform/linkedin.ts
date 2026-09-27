import { type Block, clusters, fence, sentences } from "./ast";

/**
 * LinkedIn stops showing a post beyond this length. The count is UTF-16 code units, which is
 * never lower than a grapheme count or a code point count, so a post under it is under those
 * counts too. A UTF-8 byte count or a weighted count can be higher. How LinkedIn counts is not
 * verified.
 */
const LIMIT = 3000;

/** The longest run of whole pieces, from the start, that fits the limit. */
const fit = (pieces: string[]): string => {
  let out = "";
  for (const piece of pieces) {
    if (out.length + piece.length > LIMIT) break;
    out += piece;
  }
  return out;
};

/**
 * The LinkedIn output: plain text, no emphasis marks, each URL on its own line.
 *
 * `toBlocks` already did the first two: the walk reads text nodes, so a mark never survives,
 * and it puts every href on a line of its own. This function adds the cut.
 */
export function linkedin(blocks: Block[]): { text: string; truncated: boolean } {
  const full = blocks
    .map((block) => (block.kind === "code" ? fence(block.text) : block.text))
    .join("\n\n");
  if (full.length <= LIMIT) return { text: full, truncated: false };

  // A first sentence longer than the whole limit leaves nothing to keep. The cut between
  // graphemes is the only answer left, and it is better than an empty post.
  return { text: fit(sentences(full)).trimEnd() || fit(clusters(full)), truncated: true };
}
