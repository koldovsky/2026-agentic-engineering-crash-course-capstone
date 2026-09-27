import { type Block, fence, graphemes, sentences, splitGraphemes, words } from "./ast";

/**
 * ponytail: the ceiling is the grapheme count.
 *
 * X does not count graphemes. It applies a weighted count in which any URL counts as 23
 * characters, and a CJK character counts as 2. A thread that is heavy in URLs or in CJK
 * therefore lands a few characters away from the real limit, in both directions.
 *
 * The upgrade path is the `twitter-text` package, which implements the weighted count.
 * It replaces `graphemes()` at the three call sites below and changes nothing else.
 * The human chose `Intl.Segmenter` on 2026-09-20, because it is native and adds no
 * dependency. Take the upgrade when a user reports a part that X rejects.
 */
const LIMIT = 280;

/** Room for the `\n\n` and the `n/total` counter that each part carries. */
const reserve = (total: number): number => 2 + 2 * String(total).length + 1;

/** Room for the two fences that each piece of a code block carries. */
const FENCES = graphemes(fence(""));

/** Cut one oversized sentence at a word boundary. No part may cut a word in half. */
function splitWords(text: string, budget: number): string[] {
  const out: string[] = [];
  let current = "";

  for (const word of words(text)) {
    if (graphemes(current + word) <= budget) {
      current += word;
      continue;
    }
    if (graphemes(word) <= budget) {
      if (current.trim()) out.push(current.trim());
      current = word;
      continue;
    }
    // One "word" longer than the whole budget, such as a long URL. Graphemes are the last resort.
    // The split starts from `current`, so the part in progress fills before the next one opens.
    const pieces = splitGraphemes(current + word, budget);
    out.push(...pieces.slice(0, -1));
    current = pieces.at(-1) ?? "";
  }

  if (current.trim()) out.push(current.trim());
  return out;
}

/**
 * Cut an oversized code block at a line end, because a sentence boundary means nothing in code.
 * Each piece gets its own fences, so a piece never has to fill before the next one opens.
 */
function splitLines(text: string, budget: number): string[] {
  const out: string[] = [];
  // `undefined` marks "no line yet". An empty first line is still a line.
  let current: string | undefined;
  const flush = () => {
    // A piece of blank lines alone would print as two fences with nothing between them.
    if (current?.trim()) out.push(current);
    current = undefined;
  };

  for (const line of text.split(/\r?\n/)) {
    const candidate = current === undefined ? line : `${current}\n${line}`;
    if (graphemes(candidate) <= budget) {
      current = candidate;
      continue;
    }
    flush();
    if (graphemes(line) <= budget) {
      current = line;
      continue;
    }
    // A line longer than the whole budget. Graphemes are the last resort.
    const pieces = splitGraphemes(line, budget);
    out.push(...pieces.slice(0, -1));
    current = pieces.at(-1);
  }

  flush();
  return out;
}

/** Group the blocks into parts of at most `budget` graphemes, splitting on sentences. */
function pack(blocks: Block[], budget: number): string[] {
  const parts: string[] = [];
  let buffer = "";

  const push = (text: string) => {
    const trimmed = text.trim();
    if (trimmed) parts.push(trimmed);
  };
  const flush = () => {
    push(buffer);
    buffer = "";
  };

  for (const block of blocks) {
    if (block.kind === "code") {
      flush();
      // Each piece opens and closes its own fence, so a piece never starts mid-block.
      splitLines(block.text, budget - FENCES).map(fence).forEach(push);
      continue;
    }

    let first = true;
    for (const sentence of sentences(block.text)) {
      const separator = buffer === "" ? "" : first ? "\n\n" : "";
      const candidate = buffer + separator + sentence;
      first = false;

      if (graphemes(candidate) <= budget) {
        buffer = candidate;
        continue;
      }
      flush();
      if (graphemes(sentence) <= budget) {
        buffer = sentence;
        continue;
      }
      const chunks = splitWords(sentence, budget);
      chunks.slice(0, -1).forEach(push);
      buffer = chunks.at(-1) ?? "";
    }
  }

  flush();
  return parts;
}

/**
 * The X thread: parts of at most 280 graphemes, each with its `n/total` counter.
 *
 * The counter costs graphemes too, and its width depends on the number of parts, which the
 * split decides. The loop repeats the split until the width stops growing. It runs twice
 * for a thread of 100 parts or more, and once for every shorter thread.
 */
export function thread(blocks: Block[]): string[] {
  let total = 1;
  let parts: string[] = [];

  for (let pass = 0; pass < 4; pass++) {
    parts = pack(blocks, LIMIT - reserve(total));
    if (parts.length === total) break;
    total = parts.length;
  }

  return parts.map((part, index) => `${part}\n\n${index + 1}/${parts.length}`);
}
