## Context

`add-markdown-transform` built one pure function, `transform(markdown)` in `lib/transform/index.ts`.
It parses the markdown once into a hast tree. Four walks over that tree give the four outputs. A thin
route, `app/api/transform/route.ts`, guards the body (400, 413 at 100 KB) and calls the function. One
client component, `app/tool.tsx`, holds the textarea, the tabs and the copy buttons.

This change adds two outputs to the same function, and a new input path in front of it. The input
path converts other formats to markdown and puts the markdown in the textarea. Everything after the
textarea stays as it is.

The human made three decisions on 2026-09-27, in this session: Jira wiki markup (not ADF), a
rich-text copy for Google Docs (not a `.docx` download, not "drop the feature"), and all three input
formats (rich text and HTML, `.docx`, Jira). That answer also approved four dependencies:
`rehype-parse`, `rehype-remark`, `remark-stringify` and `mammoth`. The agent made every other
decision below, and each one names the alternative it rejected.

## Goals / Non-Goals

**Goals:**

- Two more walks over the existing hast tree. No second parse.
- Every conversion to markdown is a pure function in `lib/import/`, with a Vitest file beside it.
- The server gets no new endpoint, and it never reads a file or a clipboard entry.
- A `.docx` file never reaches the server, so the server never unzips untrusted input.
- The first page load carries no conversion code.

**Non-Goals:**

- ADF output, a `.docx` or PDF download, a PDF input, drag and drop.
- GFM. The transform parses no tables and no strikethrough today. A Jira table or a Word table
  therefore passes through as text.
- A browser test runner. The page scenarios get a recorded manual check (see Risks).

## Decisions

**The Jira output is a hast walk in `lib/transform/jira.ts`.** It reads the tree that `transform`
already builds, like `x.ts` and `linkedin.ts` do. The mapping: `hN.`, `*bold*`, `_italic_`,
`{{code}}`, `{code:lang}` … `{code}`, `[text|url]`, `!url!`, `*`/`#` list prefixes that stack with
depth (`*#`), `{quote}` … `{quote}` with a nested quote joined into the outer one, `----`. Plain text
escapes `{ } [ ] * _ | !` with a backslash, and a `#`, a `-`, a `hN. ` or a `bq. ` at the start of a
line. Alternative: `jira2md`. Its npm record last changed in October
2023, and it brings `marked`, a second markdown parser beside `remark`. Two parsers can disagree on the
same source, and then the Jira tab no longer matches the other five.

**The Google Docs output is the blog tree with a two-entry style map.** `applyEmailStyles` becomes
`applyStyles(node, map)`. The email output passes `EMAIL_STYLES`. The Google Docs output passes a map
with `pre` and `code` only, each a monospace `font-family`. Headings and lists stay unstyled, so that
Google Docs maps `<h2>` to its own Heading 2 style. Alternative: copy the email HTML as rich text. Its
inline font sizes override the Docs heading styles, so the pasted headings stop matching the rest of
a document.

**The rich-text copy writes a `ClipboardItem` with two entries.** `text/html` holds `gdocs`.
`text/plain` holds the markdown that produced the result, not the current textarea, because the
visitor may edit the textarea after the transform. The same paste then works in Google Docs, Word,
Notion and Gmail. Alternative: the native Docs command "Paste from Markdown". It needs a setting that
is off by default, and it works in Google Docs only.

**Every conversion to markdown runs in the browser.** This is the one place where the change departs
from a decision of `add-markdown-transform`. That change kept `unified` out of the client bundle.
Here, the `.docx` conversion must run somewhere, and on the server a `.docx` file is an untrusted zip.
A small zip can expand to gigabytes, and `mammoth` sets no limit. In the browser, that input can hurt
only the tab of the visitor who opened it. The HTML conversion goes to the same place, because the
`.docx` path runs through it. Alternative: a second route. It needs its own body guard and its own
tests, and it still leaves the zip on the server.

**The conversion code loads on demand.** `importFile` in `lib/import/file.ts` and `paste` in
`lib/clipboard.ts` load `lib/import/html.ts` and `lib/import/docx.ts` with `await import(...)`. The
page calls them from its event handlers. The bundler puts each one in its own chunk, so the first page
load stays as it is. `lib/import/jira.ts` and `lib/import/file.ts` have no dependency, so a static
import is enough.

**HTML to markdown uses `rehype-parse`, `rehype-remark` and `remark-stringify`.** They are the reverse
of the pipeline that the transform already uses, and they share its tree types. One small tree pass
runs between the parse and `rehype-remark`:

- It unwraps the `<b id="docs-internal-guid-…" style="font-weight:normal">` element that Google
  Docs puts around the whole clipboard. Without this step, the whole paste becomes bold.
- It turns a `<span>` whose style holds `font-weight:700` into `<strong>`, and `font-style:italic`
  into `<em>`. Google Docs marks emphasis this way, not with `<b>` and `<i>`.
- It drops an `<img>` whose `src` starts with `data:`, or is empty.

Alternative: `turndown`. It is one package instead of three, and it is maintained. It parses with its
own DOM library (`domino`), so the Google Docs pass would be a second tree model beside hast.

**`.docx` to markdown is `mammoth` to HTML, then the HTML path.** `mammoth` maps the Word styles
Heading 1 to 6 to `<h1>` to `<h6>`, and it keeps lists, bold, italic and links. It writes an image as
a `data:` URL, and the HTML path drops that. `lib/import/docx.ts` is therefore about five lines.
Its input type is the `mammoth` input type, passed through: the page passes `{ arrayBuffer }`, and the
Vitest case passes `{ buffer }`. Alternative: `mammoth` has a markdown mode. Its README marks that
mode as deprecated.

**Jira to markdown is a hand-written line parser in `lib/import/jira.ts`.** Block rules run first:
`hN.`, `{code}`, `{noformat}`, `{quote}`, `bq.`, list prefixes, `----`. Inline rules run on the
remaining text, with `{{…}}` taken out first so that no rule touches code. The parser supports the
constructs that `jira.ts` writes, plus `{noformat}` and `bq.`, because people who write Jira by hand
use both. An unknown macro passes through as text. A `ponytail:` comment names the ceiling: tables,
panels, colours, mentions and `\\` line breaks. The round-trip test is the contract. Alternative:
`jira2md` in its Jira-to-markdown direction, with the same objection as above. `j2m` is the other
candidate, and its npm record last changed in June 2022.

**The file routing is a pure function, `importKind(name, size)` in `lib/import/file.ts`.** It returns
`markdown`, `html`, `docx` or an error message. The 1 MB limit lives there. That makes the "oversized
file" and "unsupported file" scenarios Vitest cases, not manual checks. The limit is 1 MB and not
100 KB, because a `.docx` is a compressed file, and its markdown is much smaller than the file. The
transform route still refuses markdown over 100 KB, and the page already shows that error.

**`Paste rich text` is a button, not a paste handler.** The button calls
`navigator.clipboard.read()` and looks for a `text/html` entry. A paste handler on the textarea would
convert every paste that carries HTML, and VS Code puts HTML on the clipboard when it copies plain
markdown. A paste from VS Code would then arrive with every `#` escaped.

**The buttons of the new controls stay in `app/tool.tsx`, and their logic lives in `lib/`.** AGENTS.md
wants a test beside new behaviour. `importFile`, `paste` and the stale guard `sequence` therefore
live in `lib/`, each with Vitest cases. The buttons set the same `markdown` state that the textarea
sets. A second component file would pass that state through props for three buttons. Split the file
when it becomes hard to read, not before. The gate of `Convert Jira text` and the clear of its
message are one line each, and they stay in the component. The browser run in `docs/runs/` checks
them, outside `pnpm check`.

## Risks / Trade-offs

- **The spec deltas need a base spec that does not exist yet.** `openspec/specs/` is empty, because
  `add-markdown-transform` is not archived. `openspec validate --strict` passes today, because it
  does not check a RENAMED or a MODIFIED delta against the base. → Archive `add-markdown-transform`
  first. Its tasks 6.5 and 6.7 are open.
- **The page scenarios have no automated test.** The project has no browser test runner, and the
  Playwright MCP server did not connect in this session. A clipboard check and a paste into Google
  Docs also need a human with a Google account. → The logic behind each control is a `lib/` function
  with a Vitest file. The human runs the page scenarios once, and the result goes to `docs/runs/`.
- **Google Docs may join the lines of a `<pre>` block.** → The manual check pastes a three-line code
  block. If the lines join, the Google Docs walk writes a `<br>` for each line break inside `<pre>`.
- **The Google Docs clipboard format is not documented, and it can change.** → The test fixture is a
  real clipboard capture, saved on the day of the work. The human copies a paragraph in Google Docs.
  The agent reads the `text/html` entry with `osascript` and saves it to
  `lib/import/fixtures/gdocs.html`.
- **Word puts a list on the clipboard as paragraphs with a bullet character.** A rich-text paste from
  Word therefore gives paragraphs, not a markdown list. → A `.docx` file keeps the list, because
  `mammoth` reads the list structure. A `ponytail:` comment in `html.ts` names this ceiling.
- **`mammoth` reads a different input key in Node and in the browser.** Its README lists `{ path }`
  and `{ buffer }` for Node, and `{ arrayBuffer }` for the browser. Its `browser` field swaps
  `lib/unzip.js` to match. The Vitest case runs in Node, so it cannot prove the browser path. → The
  manual check opens a real `.docx` file in the page.
- **The `.docx` fixture needs Word heading styles.** macOS `textutil` writes font sizes, not the
  style named Heading 1, and `mammoth` reads the style name. → Make the fixture with `python-docx`
  through `uv`. Put the command in a comment in `docx.test.ts`.
- **The Jira escape set has a ceiling.** `^`, `~`, `+`, `-` and `??` stay unescaped inside a line, so a
  text such as `a+b+c` can render with an underline in Jira. A literal backslash stays as it is, and
  Jira reads `\\` as a line break. → A `ponytail:` comment at the escape site names both.
- **`ClipboardItem` needs a current browser.** Chrome 76, Safari 13.1 and Firefox 127 support it. →
  No fallback. An older browser gets the error that the copy button already shows.

## Migration Plan

Nothing migrates. The route, the request body and the response keep their shape. The response gains
two keys, `jira` and `gdocs`, and the page is the only client.

Order of work: the two outputs first, then the dependency install in its own commit, then the three
conversions, then the page. A rollback is `git revert` of the change commits. The dependency commit
reverts apart from the logic.

## Open Questions

1. Does the capstone need automated page tests? A yes means `@playwright/test`, which is a new
   dependency and a new human decision.
2. Jira Cloud may convert pasted wiki markup in its new editor. This design does not depend on that.
   The manual check pastes the `jira` output into the Jira instance that the human uses, and records
   the result.
