## Why

The tool gives four outputs from one markdown source. Two more targets still need a manual
reformat. Jira fields read wiki markup, not markdown, so `**bold**` and `##` show literally.
Google Docs converts markdown only after the user turns on Tools > Preferences > Enable Markdown,
which is off by default.

The input side has the opposite gap. The tool accepts only markdown that the user types or pastes.
A draft in Google Docs, Word, a web page, a `.docx` file or a Jira ticket needs a manual conversion
before the tool can read it.

The human asked for these four features on 2026-09-27.

## What Changes

- A fifth output, `jira`: Jira wiki markup (`h2.`, `*bold*`, `{code:ts}`, `[text|url]`).
- A sixth output, `gdocs`: HTML that pastes into Google Docs with its headings, lists, links and
  code. The Google Docs tab copies it to the clipboard as rich text, not as HTML source.
- The tool page shows six tabs instead of four.
- The page opens a local file into the textarea. A `.md`, `.markdown` or `.txt` file loads as it is.
- The page converts other formats to markdown before the transform:
  - rich text from the clipboard (Google Docs, Word, a web page, Confluence), and an `.html` file;
  - a `.docx` file;
  - Jira wiki markup in the textarea.
- The conversion to markdown runs in the browser. The server gets no new endpoint.

Not in this change: ADF (the JSON format of the Jira Cloud REST API), a `.docx` download, a PDF
input, drag and drop, and GFM tables. The transform parses no GFM today, and this change does not
add it.

## Capabilities

### New Capabilities

- `markdown-import`: other formats to markdown. It covers the file open, the rich-text paste, the
  HTML, `.docx` and Jira conversions, and the rules for what each conversion keeps and drops.

### Modified Capabilities

- `markdown-transform`: the transform returns six outputs, not four. Two new requirements define
  the Jira output and the Google Docs output. `meta` counts the characters of both.
- `transform-tool`: the page shows six tabs. The Google Docs tab copies rich text.

Both capabilities come from `add-markdown-transform`, which is not archived yet. `openspec/specs/`
is empty today. That change must be archived before this one, so that the delta specs here apply to
a base spec.

## Impact

**New code.** `lib/transform/jira.ts`, a new `lib/import/` module for the three conversions, and a
Vitest file beside each module. `lib/transform/index.ts` gets two outputs. `app/tool.tsx` gets two
tabs, a rich-text copy, a file open control and two convert controls.

**No new route.** `app/api/transform/route.ts` stays as it is. The imported markdown goes through
the same 100 KB check as typed markdown.

**New dependencies.** `rehype-parse`, `rehype-remark` and `remark-stringify` convert HTML to
markdown. They belong to the `unified` family that the project already uses. `mammoth` converts a
`.docx` file to HTML. The human approved all four on 2026-09-27, in the same session as this
proposal. `AGENTS.md` requires that approval before an agent adds a dependency.

**No dependency for Jira.** No maintained library parses Jira wiki markup. The Jira to markdown
step is hand-written. It supports the subset that the `jira` output writes, and a round-trip test
proves it.

**Product risk.** `docs/mvp-plan.md` names daily creators as the buyer. Jira and Google Docs are
work tools, not creator channels. The same plan warns that the "markdown converter" search crowd
does not pay. This change moves the tool toward that crowd. The kill line in `docs/mvp-plan.md`
measures return visits, and it applies to these features too.
