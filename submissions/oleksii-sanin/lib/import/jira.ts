/**
 * Jira wiki markup to markdown. A line parser for the constructs that `lib/transform/jira.ts`
 * writes, plus `{noformat}` and `bq.`, which people who write Jira by hand use. The round trip in
 * `jira.test.ts` is the contract. Anything else passes through as text.
 *
 * ponytail: tables, panels, colours, mentions and `\\` line breaks pass through as text. A text
 * line that markdown reads as block syntax, such as `1. step`, stays as it is too. Add a rule when
 * a user pastes a ticket that converts wrong.
 */

const CODE = /^\{code(?::([\w+#-]+)(?=[|}]))?[^}]*\}$/;
const HEADING = /^h([1-6])\. (.*)$/;
const LIST = /^([*#]+) (.*)$/;
// Private-use characters mark a kept piece. The input loses its own copies of them first.
const KEPT = /\uE000(\d+)\uE001/g;

/** A backtick run longer than any run in `code`, and `min` long at least. */
const ticks = (code: string, min: number): string =>
  "`".repeat(Math.max(min, ...(code.match(/`+/g) ?? []).map((run) => run.length + 1)));

/**
 * A markdown code span for `code`. Markdown strips one space from each end when both ends hold one,
 * and a backtick at an end needs a space beside it, so both cases get a space of padding.
 */
function span(code: string): string {
  const mark = ticks(code, 1);
  // Not `/^ .*\S.* $/`: it is quadratic on a long span that starts with a space.
  const spaced = code.startsWith(" ") && code.endsWith(" ") && code.trim() !== "";
  const pad = code.startsWith("`") || code.endsWith("`") || spaced ? " " : "";
  return `${mark}${pad}${code}${pad}${mark}`;
}

/**
 * Each `{{…}}` as a kept code span. A scan and not a regex: a lazy regex is quadratic on a long line
 * with no `}}`. A `}` right after the `}}` belongs to the code, so `{{{a}}}` is the code `{a}`.
 *
 * ponytail: `{{a}}{{b}}` gives two spans with no space between them, and markdown reads them as one
 * span. The transform never writes that. Add a space when a user pastes it.
 */
function spans(text: string, keep: (value: string) => string): string {
  let out = "";
  let at = 0;
  for (let open = text.indexOf("{{"); open !== -1; open = text.indexOf("{{", at)) {
    let close = text.indexOf("}}", open + 3);
    if (close === -1) break;
    while (text[close + 2] === "}") close++;
    out += text.slice(at, open) + keep(span(text.slice(open + 2, close)));
    at = close + 2;
  }
  return out + text.slice(at);
}

/**
 * The inline rules. Code spans, backslash escapes and URLs come out first, so that no rule touches
 * them. An escape stays as it is, because markdown reads a backslash before punctuation the same
 * way. A `<` or a backtick in the text gets a backslash, so that markdown does not read HTML or code.
 * A URL can hold a kept piece, so it is restored before it is kept. A kept piece then never holds another.
 */
function inline(text: string): string {
  const kept: string[] = [];
  const keep = (value: string): string => `\uE000${kept.push(value) - 1}\uE001`;
  const restore = (value: string): string => value.replace(KEPT, (_, index: string) => kept[Number(index)]);
  return restore(
    spans(text.replace(/[\uE000\uE001]/g, ""), keep)
      .replace(/\\[^\sA-Za-z0-9]/g, keep)
      .replace(/\[([^|[\]]*)\|([^[\]]+)\]/g, (_, label: string, url: string) => `[${label}](${keep(restore(url))})`)
      .replace(/!([^\s!|]+)(?:\|[^!]*)?!/g, (_, src: string) => `![](${keep(restore(src))})`)
      .replace(/[<`]/g, "\\$&")
      .replace(/\*([^*\s](?:[^*]*[^*\s])?)\*/g, "**$1**"),
  );
}

/** A list line. Each parent mark indents by the width of its markdown marker: `- ` or `1. `. */
const item = (marks: string, text: string): string =>
  [...marks.slice(0, -1)].map((mark) => (mark === "#" ? "   " : "  ")).join("") +
  `${marks.endsWith("#") ? "1." : "-"} ${inline(text)}`;

export function jiraToMarkdown(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];

  /** The lines between `start` and the line `end`, and the index of `end`. An open block runs to the end. */
  const until = (start: number, end: string): [string[], number] => {
    const close = lines.findIndex((line, index) => index > start && line.trim() === end);
    const stop = close === -1 ? lines.length : close;
    return [lines.slice(start + 1, stop), stop];
  };

  // The text indent of the list item that the next line continues. Jira ends an item at a blank line
  // or at another block, so a code block and a text line under an item stay in it.
  let within = "";
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const list = line.match(LIST);
    if (list) {
      // `* {code}` opens the code on the list line, so the item holds only the code.
      const opens = CODE.test(list[2].trim()) || list[2].trim() === "{noformat}";
      out.push(item(list[1], opens ? "" : list[2]));
      within = " ".repeat(/^ *(-|1\.) /.exec(out.at(-1)!)![0].length);
      if (!opens) continue;
      line = list[2];
    }
    const code = line.trim().match(CODE);
    if (code || line.trim() === "{noformat}") {
      const [body, stop] = until(i, code ? "{code}" : "{noformat}");
      const fence = ticks(body.join("\n"), 3);
      out.push(...[fence + (code?.[1] ?? ""), ...body, fence].map((row) => within + row));
      i = stop;
      continue;
    }

    const heading = line.match(HEADING);
    if (line.trim() === "{quote}") {
      const [body, stop] = until(i, "{quote}");
      out.push(...jiraToMarkdown(body.join("\n")).split("\n").map((quoted) => (quoted ? `> ${quoted}` : ">")));
      i = stop;
    } else if (heading) out.push(`${"#".repeat(Number(heading[1]))} ${inline(heading[2])}`);
    else if (line.startsWith("bq. ")) out.push(`> ${inline(line.slice(4))}`);
    // `***`, not `---`: under a text line, `---` would turn that line into a heading.
    else if (/^-{4}\s*$/.test(line)) out.push("***");
    else if (line.trim()) {
      out.push(within + inline(line));
      continue;
    } else out.push("");
    within = "";
  }

  return out.join("\n");
}
