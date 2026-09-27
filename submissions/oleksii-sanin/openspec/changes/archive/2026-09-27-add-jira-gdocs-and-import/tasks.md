## 1. Jira output

- [x] 1.1 Write `lib/transform/jira.test.ts` for the nine scenarios of "Jira output is wiki markup". Run it. It must fail.
- [x] 1.2 Create `lib/transform/jira.ts`. Export `jira(tree)`, a walk over the hast tree that `transform` already builds.
- [x] 1.3 Add the `ponytail:` comment at the escape site. Name `^ ~ + - ??` and the literal backslash as the ceiling.
- [x] 1.4 Add `jira` to `TransformResult`, to `EMPTY` and to `meta` in `lib/transform/index.ts`.
- [x] 1.5 Run `pnpm check`. It must exit 0. Commit the Jira output.

## 2. Google Docs output

- [x] 2.1 Write `lib/transform/gdocs.test.ts` for the two scenarios of "Google Docs output pastes as formatted text". Run it. It must fail.
- [x] 2.2 Rename `applyEmailStyles` to `applyStyles(node, map)`. The email output passes `EMAIL_STYLES`. `email.test.ts` must stay green with no edit.
- [x] 2.3 Add a style map with `pre` and `code` only. Build `gdocs` from it. Add `gdocs` to `TransformResult`, to `EMPTY` and to `meta`.
- [x] 2.4 Edit `lib/transform/index.test.ts` for the renamed requirement "One source, all channel outputs": each scenario checks six outputs. Add the scenario "Meta counts the Jira and Google Docs outputs".
- [x] 2.5 Run `pnpm check`. It must exit 0. Commit the Google Docs output.

## 3. Six tabs and the rich-text copy

- [x] 3.1 Add `Jira` and `Google Docs` to `TABS` in `app/tool.tsx`.
- [x] 3.2 Keep the markdown that produced the result beside the result. Do not read the current textarea for the copy.
- [x] 3.3 Give `CopyButton` an optional `html` prop. With it, write one `ClipboardItem` with a `text/html` entry and a `text/plain` entry.
- [x] 3.4 Run `pnpm check`. It must exit 0. Commit the page change.

## 4. Dependencies

- [x] 4.1 Run `pnpm add rehype-parse rehype-remark remark-stringify mammoth`. The human approved these four on 2026-09-27. Add no other package.
- [x] 4.2 Run `pnpm check`. It must exit 0. Commit `package.json` and `pnpm-lock.yaml` alone, with a `build:` message.

## 5. HTML to markdown

- [x] 5.1 Ask the human to copy a heading and a paragraph with one bold word in Google Docs. Read the `text/html` clipboard entry with `osascript`. Save it unchanged to `lib/import/fixtures/gdocs.html`. **Not captured.** Five clipboard reads gave no Google Docs HTML. On 2026-09-27 the human chose a hand-made fixture in the Google Docs clipboard shape. The paste in 9.1 is the only check against real Google Docs.
- [x] 5.2 Write `lib/import/html.test.ts` for the five scenarios of "HTML converts to markdown". The Google Docs scenario reads the fixture. Run it. It must fail. The Google Docs case passed at once, because 5.3 landed before the fixture did. It did not fail first.
- [x] 5.3 Create `lib/import/html.ts`. Export `htmlToMarkdown(html)`: `rehype-parse`, the Google Docs pass from `design.md`, `rehype-remark`, `remark-stringify`.
- [x] 5.4 Add the `ponytail:` comment for the Word list ceiling.
- [x] 5.5 Run `pnpm check`. It must exit 0. Commit the HTML conversion. The conversion is in `5ec12e1`, but this tick landed one commit later, in `67e0461`. That breaks the AGENTS.md rule, and a fix would need a history rewrite.

## 6. Jira to markdown

- [x] 6.1 Write `lib/import/fixtures/round-trip.md`. It holds every construct that `lib/transform/jira.ts` writes.
- [x] 6.2 Write `lib/import/jira.test.ts` for the round trip, the `{panel}` scenario and the `h2. Setup` scenario. Run it. It must fail.
- [x] 6.3 Create `lib/import/jira.ts`. Export `jiraToMarkdown(text)`. Run the block rules first. Take `{{…}}` out before the inline rules run.
- [x] 6.4 Add the `ponytail:` comment. Name tables, panels, colours, mentions and `\\` line breaks as the ceiling.
- [x] 6.5 Run `pnpm check`. It must exit 0. Commit the Jira conversion.

## 7. .docx to markdown

- [x] 7.1 Make `lib/import/fixtures/sample.docx` with `python-docx` through `uv`. It holds a Heading 1, a paragraph with one bold word, a bullet list of two items and one small image. Put the command in a comment at the top of `docx.test.ts`.
- [x] 7.2 Write `lib/import/docx.test.ts` for the two scenarios of "A .docx file converts to markdown". Pass `{ buffer }`. Run it. It must fail.
- [x] 7.3 Create `lib/import/docx.ts`. Export `docxToMarkdown(input)`: `mammoth.convertToHtml`, then `htmlToMarkdown`.
- [x] 7.4 Run `pnpm check`. It must exit 0. Commit the `.docx` conversion.

## 8. File routing and the page controls

- [x] 8.1 Write `lib/import/file.test.ts`. Cover each supported extension, `photo.png`, and a file of 2 MB. Run it. It must fail.
- [x] 8.2 Create `lib/import/file.ts`. Export `importKind(name, size)` and the 1 MB limit.
- [x] 8.3 Add an `Open file` control to `app/tool.tsx`. Call `importKind` before the file is read. Load `html.ts` and `docx.ts` with `await import(...)` inside the handler.
- [x] 8.4 Add a `Paste rich text` control. Read the `text/html` entry with `navigator.clipboard.read()`. Show a message when the clipboard holds no rich text. Add no paste handler to the textarea.
- [x] 8.5 Add a `Convert Jira text` control. It replaces the textarea content with its markdown conversion.
- [x] 8.6 Run `pnpm check`. It must exit 0. Commit the page controls.

## 9. Manual check and proof trail

- [x] 9.1 Run `pnpm dev`. The human runs each page scenario of `transform-tool` and `markdown-import` once, including the paste into Google Docs and the paste into Jira. Save each result to `docs/runs/`. Record a failed scenario as failed. On 2026-09-27 the human wrote "all checked" after the second round of review fixes. No file in `docs/runs/` holds the result of that manual run. The saved results are the Playwright runs: `2026-09-27-browser-run.txt`, `2026-09-27-browser-run-fixes.txt` and `2026-09-27-browser-run-review-fixes.txt`.
- [x] 9.2 In the same run, check the network tab. The first load fetches no import chunk. A `.docx` open sends no request.
- [x] 9.3 If Google Docs joins the lines of a `<pre>` block, apply the `<br>` fallback from `design.md`. Add the test first. Not applied. The human checked the paste into Google Docs in 9.1 and reported no joined lines, so the condition did not occur.
- [x] 9.4 Run the `reviewer` subagent on the diff of this change. Save the output to `docs/reviews/`. Fix each finding, or record why it stands unfixed. Two reviews: `docs/reviews/2026-09-27-add-jira-gdocs-and-import.md` and `docs/reviews/2026-09-27-review-fixes.md`. Each file ends with a table of the outcome of each finding. The fixes of the second review, `b820a1c` to `e29783c`, had no reviewer, by the choice of the human.
- [x] 9.5 Add a row to `docs/autonomy-log.md` for each group, as it happens. Record who decided. Rows 17 to 26. The first round of review fixes, `fc1da50` to `08ecb9d`, has no row of its own.
- [x] 9.6 Run `openspec validate add-jira-gdocs-and-import --strict`. Edit the spec where the code differs from it. Commit that edit apart.
- [x] 9.7 Archive `add-markdown-transform` first. Its tasks 6.5 and 6.7 are open. Then archive this change. Tasks 6.5 and 6.7 closed before this. The same commit as this tick archives both changes, in that order.
