/**
 * HTML to markdown: the reverse of the pipeline that the transform uses, with one tree pass for
 * Google Docs in the middle. `importFile` and `paste` load this module on demand, so the first page
 * load carries none of it.
 *
 * ponytail: Word puts a list on the clipboard as paragraphs that start with a bullet character, so
 * a rich-text paste from Word gives paragraphs, not a markdown list. A `.docx` file keeps the list,
 * because `mammoth` reads the list structure. Map the Word list paragraphs (`mso-list` in the style)
 * if users paste lists from Word.
 */

import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

import type { HastNode } from "@/lib/transform/ast";

const wrap = (tagName: string, child: HastNode): HastNode => ({ type: "element", tagName, properties: {}, children: [child] });
const text = (value: string): HastNode => ({ type: "text", value });

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * A URL that the import keeps: `http:`, `https:`, `mailto:` or relative. The HTML is untrusted, and a
 * `javascript:` link would reach the blog, email and Google Docs outputs. A browser skips a tab or a
 * line end inside a URL, so the check skips every control character and space first.
 */
const safe = (url: unknown): boolean => {
  const value = String(url ?? "").replace(/[\0- ]/g, "");
  return value !== "" && (!SCHEME.test(value) || /^(https?|mailto):/i.test(value));
};

/**
 * Move the spaces at the edges of a mark or a link outside it. Markdown does not read `**bold **word`
 * as bold, and `remark-stringify` then writes the space as `&#x20;`. The pass runs from the leaves up,
 * so a space inside `<b><a>link </a></b>` moves out of both.
 *
 * ponytail: a mark that starts or ends with another mark or a link, next to a letter, still prints
 * that letter as a character reference: `x<b><i>y</i></b>z` gives `&#x78;**_y_**&#x7A;`.
 * `remark-stringify` does this to keep the emphasis, and the markdown renders right. Only the text
 * in the textarea is hard to read. Post-process the references if users paste mid-word styles.
 */
function edges(mark: HastNode): HastNode[] {
  const first = mark.children?.[0];
  const lead = first?.type === "text" ? /^\s*/.exec(first.value ?? "")![0] : "";
  if (lead) first!.value = first!.value!.slice(lead.length);
  const last = mark.children?.at(-1);
  const tail = last?.type === "text" ? (last.value ?? "") : "";
  // Not `/\s*$/`: it is quadratic on a long run of spaces with a letter after it.
  const trail = tail.slice(tail.trimEnd().length);
  if (trail) last!.value = last!.value!.slice(0, -trail.length);
  // A mark with no text left prints as `****`, so only its spaces stay.
  if (mark.children?.every((kid) => kid.type === "text" && !kid.value)) return lead + trail ? [text(lead + trail)] : [];
  return [...(lead ? [text(lead)] : []), mark, ...(trail ? [text(trail)] : [])];
}

/**
 * The Google Docs pass, and the rules for untrusted HTML.
 *
 * - Google Docs puts the whole clipboard in `<b id="docs-internal-guid-…">` with a normal weight.
 *   Without the unwrap, the whole paste becomes bold.
 * - Google Docs marks emphasis with a style on a `<span>`, not with `<b>` and `<i>`.
 * - An image with a `data:` URL can hold more than the 100 KB that the transform accepts, and
 *   `safe()` drops it.
 * - `rehype-remark` turns media, frames and form fields into links, so they go. A `<base>` goes too:
 *   `rehype-remark` resolves each URL against it, after `safe()` checks the raw URL.
 * - The transform parses no GFM. A table becomes the text of its cells, and struck-through text
 *   stays text. `remark-stringify` throws on the GFM nodes otherwise.
 */
function clean(node: HastNode): HastNode[] {
  const tag = node.tagName ?? "";
  if (/^(audio|video|iframe|input|select|textarea|button|base)$/.test(tag)) return [];
  if (tag === "img" && !safe(node.properties?.src)) return [];
  if (node.children) node.children = node.children.flatMap(clean);
  if (tag === "a" && !safe(node.properties?.href)) return node.children ?? [];
  if (/^(s|del|strike)$/.test(tag)) return node.children ?? [];
  if (/^(table|caption|thead|tbody|tfoot|tr|th|td)$/.test(tag)) return [{ ...node, tagName: "div" }];
  if (tag === "b" && String(node.properties?.id ?? "").startsWith("docs-internal-guid")) {
    return node.children ?? [];
  }
  if (/^(a|b|strong|i|em)$/.test(tag)) return edges(node);
  if (tag === "span") {
    const style = String(node.properties?.style ?? "");
    const italic = /font-style:\s*italic/.test(style) ? wrap("em", node) : node;
    const marked = /font-weight:\s*(bold|[6-9]00)/.test(style) ? wrap("strong", italic) : italic;
    return marked === node ? [node] : edges(node).map((kid) => (kid === node ? marked : kid));
  }
  return [node];
}

const processor = unified()
  .use(rehypeParse, { fragment: true })
  .use(() => (tree) => void clean(tree as unknown as HastNode))
  .use(rehypeRemark)
  .use(remarkStringify, { bullet: "-", emphasis: "*", rule: "-" });

export const htmlToMarkdown = (html: string): string => String(processor.processSync(html));
