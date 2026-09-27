# Review — add-jira-gdocs-and-import

- **Date:** 2026-09-27
- **Reviewed:** `git diff 77d1579..5bcd53a -- lib app package.json` — commits `b2d14ba` to `5bcd53a`
- **Reviewer:** the `reviewer` subagent, `.claude/agents/reviewer.md`, started by the session that
  wrote the change (task 9.4). It had no part in the code.
- **Maker:** the session that ran `/opsx:apply add-jira-gdocs-and-import`.
- **Result:** 20 correctness findings, 3 missing tests, 1 rule violation, 4 spec drift findings.

The text below is the reviewer's own, unchanged. The outcome of each finding follows it.

---

Review of `add-jira-gdocs-and-import`: lib/, app/ and package.json from 77d1579 to 5bcd53a. I found 20 correctness problems, 3 missing tests, 1 rule break and 4 spec gaps. The worst is that any table or strikethrough makes the whole HTML and .docx import throw.

`pnpm check` exited 0 (14 files, 102 tests). All paths below are under /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin. I got every input → output pair by running the real modules in throwaway jiti probes. I have deleted the probes, the two test .docx files and the `node_modules/.cache/jiti` folder they created. `git status` shows only the `.agent-log/actions.jsonl` change that was there before I started.

## 1. Correctness (most severe first)

1. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/import/html.ts:46 — rehype-remark turns tables and strikethrough into GFM nodes, and remark-stringify has no handler for them, so the call throws.
   - `htmlToMarkdown("<table><tr><td>a</td></tr></table>")` throws "Cannot handle unknown node `table`". `<s>`, `<del>` and `<strike>` throw "unknown node `delete`".
   - The same happens for a .docx with a table or a struck-through run. mammoth writes `<s>` for strikethrough (document-to-html.js:143). I built both files with python-docx and both threw.
   - The page then shows "The page could not convert draft.docx." Tables are common in Google Docs, Word and Confluence pastes.
   - Fix: pass `handlers` to rehypeRemark (or add a tree step) so a table becomes its cell text as paragraphs and `s`/`del`/`strike` become their children.
2. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/import/jira.ts:26-27 — the bold rule runs over the link URLs that the line before it writes.
   - `jiraToMarkdown("[a|https://x.com/*foo*/bar*]")` → `[a](https://x.com/**foo**/bar*)`.
   - Round trip of the markdown `[a](https://x.com/*foo*)` gives href `https://x.com/**foo**`.
   - Fix: `keep()` the whole converted link before the bold rule runs.
3. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/import/jira.ts:20-28 — plain text is not escaped for markdown, so `<…>` becomes raw HTML, which the transform drops.
   - `jiraToMarkdown("returns List<String>")` → blog `returns List`.
   - Round trip of the markdown `a \<b\> c` → blog `<p>a  c</p>`.
   - The Jira text "Use \`tick\` here" becomes a code span.
   - Fix: backslash-escape `<` and backticks in text that is not kept.
4. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/import/html.ts:29-40 — `javascript:` and `data:` URLs in untrusted clipboard or file HTML survive into the outputs.
   - `<a href="javascript:alert(1)">click</a>` → `[click](javascript:alert\(1\))` → the blog, email and gdocs HTML hold `<a href="javascript:alert(1)">`.
   - The gdocs HTML is written to the clipboard as rich text.
   - Fix: in `clean()`, drop an `href`/`src` that is not http(s), mailto, `#` or relative.
5. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/import/html.ts:30 — the data: check is case-sensitive, and the spec says such an image MUST be dropped.
   - `<img src="DATA:image/png;base64,AAAA" alt="x">` → `![x](DATA:image/png;base64,AAAA)`.
   - Fix: `/^(data:|$)/i`.
6. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/app/tool.tsx:71-102 — nothing guards an import that is still running.
   - Open a large .docx, then use Paste rich text (or keep typing). The docx result lands last and overwrites the textarea, and the later paste or typing is lost.
   - Fix: keep a request counter in a ref and ignore stale results, or disable the controls while an import runs.
7. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/import/jira.ts:52 — the fence is always three backticks, so a code body that holds ``` breaks it.
   - Markdown source: a four-backtick fence around "```\ninner\n```".
   - Jira output: `{code}\n```\ninner\n```\n{code}`.
   - Converted back: two empty `<pre>` blocks and a paragraph "inner".
   - Fix: use a fence one backtick longer than the longest run in the body.
8. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/import/jira.ts:24 — `{{…}}` becomes a single-backtick span.
   - `{{a ` b}}` → `` `a ` b` `` → `<code>a </code> b``.
   - `{{a}}{{b}}` → `` `a``b` `` → one span `a``b`.
   - Round trip of the markdown ``` `` a ` b `` ``` fails.
   - Fix: pick a backtick run longer than any inside the code, and pad with spaces where needed.
9. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/transform/jira.ts:12-13 — `hN. ` and `bq. ` at a line start are not escaped.
   - The paragraph `h2. looks like a heading` → Jira output `h2. looks like a heading`. Jira shows a heading, and `jiraToMarkdown` returns `## looks like a heading`.
   - The ponytail comment does not name this gap.
   - Fix: `.replace(/(^|\n)(h[1-6]|bq)\. /g, "$1$2\\. ")`.
10. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/transform/jira.ts:66 — a nested quote gives nested `{quote}`, which Jira cannot nest.
    - `> nested\n>> deeper` → `{quote}\nnested\n\n{quote}\ndeeper\n{quote}\n{quote}`.
    - Converted back: blog has quote "nested", then the paragraph "deeper" outside it, then an empty `<blockquote>`.
    - Fix: flatten an inner blockquote into the outer `{quote}`.
11. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/transform/jira.ts:41 — a code block in a list item gets a blank line before it.
    - `- a\n  ```js\n  x\n  ```\n- b` → `* a\n\n{code:js}\nx\n{code}\n* b`.
    - The blank line ends the list. The round trip gives list "a", then a top-level code block, then a new list "b".
    - Fix: join the item parts with a single `\n`.
12. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/transform/jira.ts:42 — images are silently dropped.
    - `Text with ![i](https://x.com/i.png) image` → `Text with  image`.
    - `![alt](https://x.com/i.png)` alone → Jira output `""`.
    - Fix: add `case "img"` → `!${src}!`, or name the ceiling in a ponytail comment.
13. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/transform/jira.ts:36 — inline code that holds `}}` closes the macro early.
    - `` `a}}b` `` → `{{a}}b}}`. Jira and `jiraToMarkdown` both read code `a` followed by the text `b}}`.
    - Fix: fall back to `{noformat}` or escape `}` for such spans. Which one Jira accepts is not verified.
14. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/import/html.ts:29 — an `<a>` with no href becomes an empty link. mammoth writes one for every Word bookmark (document-to-html.js:393), for example `_Toc` bookmarks on headings.
    - `<h1><a id="_Toc1"></a>Title</h1>` → `# []()Title` → Jira output `h1. [|]Title`.
    - `<video src="a.mp4">` → `[](a.mp4)`.
    - Fix: in `clean()`, unwrap an `a` that has no href and drop media elements.
15. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/import/html.ts:37-38,47 — the textarea shows character references instead of readable text.
    - `<p>x<em>y</em>z</p>` → `&#x78;_&#x79;_&#x7A;`, caused by `emphasis: "_"` inside a word.
    - `one <span style="font-weight:700">bold </span>word`, the Google Docs shape, → `one **bold&#x20;**&#x77;ord`.
    - Fix: `emphasis: "*"`, and move leading and trailing spaces outside the strong/em wrapper in `clean()`.
16. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/app/tool.tsx:73 — a conversion that returns `""` still replaces the textarea, and the draft is lost.
    - Example: clipboard HTML that holds only `<img src="data:…">`, or `<math>`.
    - Fix: treat `""` like "no rich text", show a message and keep the textarea.
17. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/app/tool.tsx:178 — Convert Jira text is not idempotent, and the button stays enabled.
    - A second click turns `**bold**` into `***bold***`.
    - React sets the value, so browser undo cannot restore the text.
    - Fix: keep the previous text for one undo, or disable the button until the textarea changes.
18. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/app/tool.tsx:178 — the handler does not clear the error.
    - After "The clipboard holds no rich text…", a successful Convert Jira text leaves that alert on screen.
    - Fix: `setError("")` in the handler.
19. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/import/jira.ts:24,26 — the `{{…}}` and link regexes are quadratic on one line.
    - 40,000 `[` → 4.1 s; 40,000 `{` → 1.1 s. A line near the 1 MB file limit would freeze the tab.
    - Fix: exclude `[` from `[^|\]]*`, and scan `{{` with `indexOf`.
20. /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/import/jira.ts:14,22 — the placeholders are invisible U+E000/U+E001 characters in the source, so line 14 reads as `/(\d+)/g`.
    - Input that already holds `` `0` `` with no code span → `text undefined here`.
    - Fix: write them as ``/`` escapes, and restore only an index below `kept.length`.

## 2. Missing tests

- /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/import/html.test.ts — no case with `<table>` or `<s>`/`<del>`; one would have caught finding 1. Add both, and assert the call does not throw.
- /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/transform/jira.test.ts:1 — the `case "pre"` branch (code block inside a list item, jira.ts:39-41) has no test, and it is wrong (finding 11). Add a case.
- /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/lib/import/jira.test.ts:1 — nothing tests the macro parameters in the `CODE` regex (`{code:java|title=A.java}`, `{code:title=A.java}`). The round-trip fixture has no URL with `*`, no `<`, no ``` inside code, no backtick inside inline code, no nested quote and no code in a list. Add these to `fixtures/round-trip.md`.

## 3. Rule violation

- /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/app/tool.tsx:80-102,178 — AGENTS.md: "New behaviour has a test beside the code (`*.test.ts` / `*.test.tsx`)."
  - Open file, Paste rich text, Convert Jira text and the rich copy have no test beside them.
  - The only check is `docs/runs/2026-09-27-browser-run.mjs`. It is outside `pnpm check`, and it depends on an npx cache path.
  - design.md accepts this trade-off, but AGENTS.md was not changed. Either amend the rule or move the logic of the three handlers into a tested `lib/` function.

## 4. Spec drift

- /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/openspec/changes/add-jira-gdocs-and-import/design.md:31-32 — it says "A Jira table or a Word table therefore passes through as text". The code throws instead (finding 1). Fix the code, or edit the design in a separate commit.
- /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/openspec/changes/add-jira-gdocs-and-import/specs/markdown-import/spec.md:86-87 — "MUST support every construct that the `jira` output of the transform writes". Findings 2, 3, 7, 8, 10 and 11 are outputs of the transform that do not round-trip. The round-trip test passes only because the fixture avoids them.
- /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/openspec/changes/add-jira-gdocs-and-import/specs/markdown-transform/spec.md:50 — "A character that wiki markup reads as markup MUST be escaped". `hN. ` and `bq. ` are not escaped, and the ceiling comment does not name them (finding 9).
- /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin/openspec/changes/add-jira-gdocs-and-import/specs/markdown-import/spec.md:25-27 — "An image with a `data:` URL MUST be dropped". An uppercase `DATA:` survives (finding 5).

## What I could not review

- **Jira rendering:** I had no Jira instance. The claims about how Jira renders unescaped `h2.`, nested `{quote}`, `}}` inside `{{…}}` and the blank line inside a list come from Jira's markup rules, not from a run. The import side of findings 10, 11 and 13 I did verify by running the code. I also suspect intraword marks (`**a**b` → `*a*b`, and CJK text) do not render as bold in Jira; I could not check that, so it is not a finding.
- **Real Google Docs clipboard:** the fixture is missing (known item), so I tested only hand-made HTML in the Google Docs shape.
- **mammoth in the browser (`{ arrayBuffer }`):** I did not run the page. For that path I relied on `docs/runs/2026-09-27-browser-run.txt`, and I did not review `docs/runs/2026-09-27-browser-run.mjs`.
- **HEAD moved:** it moved to b49ed24 during the review. That commit touches only docs/autonomy-log.md, which is out of scope.

---

## Outcome of each finding

Written by the session that fixed the findings, on 2026-09-27. Each fix got a test that failed
first, except where the row says otherwise. The human made three decisions: finding 13 stays as a
named ceiling, the rule violation is fixed by a move to `lib/`, and the Google Docs fixture is
hand-made. The agent made every other choice below.

| # | Outcome | Commit | Proof |
|---|---------|--------|-------|
| 1 | Fixed. A table becomes the text of its cells, and a strike becomes plain text. | `cfa5bb1` | `html.test.ts`: "turns a table and struck-through text into plain text" |
| 2 | Fixed. The URL is kept before the bold rule runs. | `66d14b5` | `import/jira.test.ts`: "keeps the stars of a link URL". The round-trip fixture holds such a link. |
| 3 | Fixed. `<` and a backtick get a backslash. | `66d14b5` | "keeps angle brackets and backticks as text", and the fixture |
| 4 | Fixed. Only `http:`, `https:`, `mailto:` and relative URLs stay. Control characters and spaces are skipped before the check. | `cfa5bb1` | "keeps the text and drops the link of …": 5 cases, one with a tab inside `javascript:` |
| 5 | Fixed by the rule of finding 4, which ignores letter case. | `cfa5bb1` | "drops an unsafe image, audio, video, a frame and a form field" |
| 6 | Fixed. A counter in a ref numbers each import and edit. | `08ecb9d` | Browser run check "Finding 6" in `docs/runs/2026-09-27-browser-run-fixes.txt`. With the guard removed, that check failed. No Vitest case: the guard is component state. |
| 7 | Fixed. The fence is one backtick longer than the longest run inside, and 3 at least. | `66d14b5` | "gives code that holds backticks a longer fence", and the fixture |
| 8 | Fixed in part. A span with a backtick inside gets a longer mark and padding. `{{a}}{{b}}` still gives one span: a `ponytail:` comment names it, because the transform never writes it. | `66d14b5` | Same test, and the fixture |
| 9 | Fixed. `hN. ` and `bq. ` at a line start get `\.`. How Jira shows `h2\.` is not checked in Jira. | `51a5e2e` | `transform/jira.test.ts`: "escapes a heading mark and a quote mark at the start of a line", and the fixture |
| 10 | Fixed. An inner quote joins the outer `{quote}`. The nesting is lost, because Jira cannot nest `{quote}`. | `51a5e2e` | "joins a nested block quote into the outer quote" |
| 11 | Fixed on both sides. The Jira output has no blank line before the code, and the import indents the code under the item. | `51a5e2e`, `66d14b5` | "keeps a code block in a list item with no blank line before it", "keeps a code block under the list item before it", and the fixture |
| 12 | Fixed. The Jira output writes `!src!`, and the import reads it. The alt text is lost. | `51a5e2e`, `66d14b5` | "uses the bang form for an image", "reads an image", and the fixture |
| 13 | Stands. The human chose a named ceiling. A `ponytail:` comment in `lib/transform/jira.ts` names it. Test `\}` inside `{{…}}` in Jira during task 9.1. | `51a5e2e` | None. The Jira behaviour is not known. |
| 14 | Fixed by the rule of finding 4: an `<a>` with no href keeps its text. Media, frames and form fields are dropped. | `cfa5bb1` | The `<a id="_Toc1">` case, and the media case |
| 15 | Fixed. The emphasis mark is `*`, and the spaces at the edge of a mark move outside it. An empty mark keeps only its spaces. | `cfa5bb1` | "writes marks that stay readable inside a word and next to a space" |
| 16 | Fixed. An import with no text gives a message, and the textarea keeps its draft. | `a7bfb99` | `file.test.ts` and `clipboard.test.ts`: "gives a message, not an empty text, …", and the browser run check "Finding 16" |
| 17 | Fixed. The control stays off until the textarea changes. | `08ecb9d` | Browser run check "Finding 17". No Vitest case. |
| 18 | Fixed. The handler clears the message. | `08ecb9d` | Browser run check "Finding 18". No Vitest case. |
| 19 | Fixed. A scan replaces the `{{…}}` regex, and the link regex does not cross a `[`. | `66d14b5` | "reads a long line of … in linear time": 100,000 characters take 0 to 1 ms. Before the fix they took 2 s, 3.8 s and 17 s. |
| 20 | Fixed. The placeholders are `` escapes, and the input loses its own copies first. | `66d14b5` | "keeps text that looks like a placeholder" |
| Missing tests | Added: `<table>` and `<s>`, the `pre` case, the `{code}` parameters, and each listed construct in `round-trip.md`. | `cfa5bb1`, `51a5e2e`, `66d14b5` | The round-trip test now fails if the Jira output stops writing one of them. |
| Rule violation | Fixed as the human chose: the logic of Open file and Paste rich text moved to `importFile` and `paste` in `lib/`, with Vitest cases. The component guards of findings 6, 17 and 18 have no Vitest case. The browser run checks them, outside `pnpm check`. Convert Jira text calls `jiraToMarkdown`, which has its own tests. | `a7bfb99`, `08ecb9d` | 9 new cases in `file.test.ts` and `clipboard.test.ts` |
| Spec drift | All four fixed. The code now does what `design.md` says for tables. The round-trip fixture holds findings 2, 3, 7, 8, 11 and 12. The escape covers `hN. ` and `bq. `. `DATA:` is dropped. | `fc1da50` holds the spec edit | `openspec validate add-jira-gdocs-and-import --strict`: valid |

`pnpm check` at `08ecb9d`: 14 files, 135 tests, exit 0.
