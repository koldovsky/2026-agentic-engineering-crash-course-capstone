import { type HastNode, textOf } from "./ast";

/**
 * Escape what Jira reads as markup: `{ } [ ] * _ | !` anywhere, and `#`, `-`, `hN. ` or `bq. ` at
 * the start of a line. The start of a text node counts as the start of a line, so a `-` right after
 * bold text is escaped too. Jira shows `\-` as `-`, so that costs nothing. Jira showing `h2\.` as
 * `h2.` is not checked in Jira.
 *
 * ponytail: `^ ~ + - ??` stay unescaped inside a line, so a text such as `a+b+c` can render with
 * an underline in Jira. A literal backslash stays as it is, and Jira reads `\\` as a line break.
 * Add a mark to the set when a user reports a ticket that renders wrong.
 */
const escape = (text: string): string =>
  text
    .replace(/[{}[\]*_|!]/g, "\\$&")
    .replace(/(^|\n)([#-])/g, "$1\\$2")
    .replace(/(^|\n)(h[1-6]|bq)\. /g, "$1$2\\. ");

/**
 * A code block in the code macro. Code is never escaped, because Jira reads no markup inside it.
 *
 * ponytail: the language name passes through as markdown writes it. Jira knows a fixed list of
 * languages, and it can show a warning for another name, such as `ts`. Map the short names when a
 * user reports that warning.
 */
const code = (pre: HastNode): string => {
  const lang = String(pre.children?.[0]?.properties?.className ?? "").match(/language-([^\s,]+)/)?.[1];
  return [lang ? `{code:${lang}}` : "{code}", textOf(pre).replace(/\n$/, ""), "{code}"].join("\n");
};

function inline(node: HastNode): string {
  if (node.type === "text") return escape(node.value ?? "");
  const inner = (node.children ?? []).map(inline).join("");
  switch (node.tagName) {
    case "strong":
      return `*${inner}*`;
    case "em":
      return `_${inner}_`;
    case "code":
      // ponytail: code that holds `}}` closes the macro early, and Jira shows the rest as text. The
      // human chose to name this ceiling on 2026-09-27. Test `\}` inside `{{…}}` in Jira first.
      return `{{${textOf(node)}}}`;
    case "a":
      return `[${inner}|${String(node.properties?.href ?? "")}]`;
    case "img":
      // A `!` in the URL would close the image early. A `|` is safe: remark encodes it already.
      return node.properties?.src ? `!${String(node.properties.src).replace(/!/g, "%21")}!` : "";
    case "pre":
      // A code block inside a list item. The newline text around it is enough: a blank line would
      // end the Jira list.
      return code(node);
    case "blockquote":
      // A quote inside a list item. Jira cannot put a quote in a list, so its text joins the item. The
      // trim drops the newline that made a blank line.
      return inner.trim();
    default:
      return inner;
  }
}

const isList = (node: HastNode): boolean => node.tagName === "ul" || node.tagName === "ol";

/** One line for each item. A nested list adds its own mark to the marks of its parent: `*#`. */
function list(node: HastNode, prefix: string): string {
  const mark = prefix + (node.tagName === "ol" ? "#" : "*");
  return (node.children ?? [])
    .filter((li) => li.tagName === "li")
    .map((li) => {
      const kids = li.children ?? [];
      const text = kids.filter((kid) => !isList(kid)).map(inline).join("").trim();
      return [`${mark} ${text}`, ...kids.filter(isList).map((kid) => list(kid, mark))].join("\n");
    })
    .join("\n");
}

/** One block. Jira cannot nest `{quote}`, so a quote inside a quote joins the outer one. */
function block(node: HastNode, quoted: boolean): string {
  const tag = node.tagName ?? "";
  if (/^h[1-6]$/.test(tag)) return `${tag}. ${inline(node)}`;
  if (tag === "pre") return code(node);
  if (tag === "blockquote") return quoted ? blocks(node, true) : `{quote}\n${blocks(node, true)}\n{quote}`;
  if (isList(node)) return list(node, "");
  if (tag === "hr") return "----";
  return inline(node);
}

/** The block children of `node`, one blank line apart. The newline text between them is dropped. */
const blocks = (node: HastNode, quoted = false): string =>
  (node.children ?? [])
    .filter((child) => child.type === "element")
    .map((child) => block(child, quoted))
    .filter(Boolean)
    .join("\n\n");

/** The Jira output: wiki markup, from the same tree as the other outputs. */
export const jira = (tree: HastNode): string => blocks(tree);
