# Review — the second round of task 6.5 fixes

- **Date:** 2026-09-27
- **Reviewed:** `git diff f1bff54..08b46ae` — 10 files, 492 lines
- **Reviewer:** the `reviewer` subagent, `.claude/agents/reviewer.md`, session `review-6-5`, second
  request. It also wrote `2026-09-27-task-6-5-fixes.md`, so it checked the fixes for its own findings.
- **Maker:** a different session. The session that wrote these fixes did not review them.
- **Result:** 4 correctness findings, 1 missing test, no rule violation. 12 mutants all fail the suite.

The text below is the reviewer's own, unchanged. The outcome of each finding follows it.

---

Review of git diff f1bff54..08b46ae (second fix round): 4 correctness findings, 1 missing test, no rule violation, no spec drift beyond the correctness findings.

## 1. Correctness

1. lib/transform/ast.ts:37-38 — A URL with a query string still splits in half, in X and in LinkedIn. The cause is sentences(), not words(). Intl.Segmenter puts a sentence boundary after every "?" in a URL, and lowercase does not matter: "see https://example.com/watch?v=abc now" segments as ["see https://example.com/watch?", "v=abc now"]. pack() and fit() then treat the "?" as a sentence end.
   - Bare URL: "word ".repeat(46) + "https://www.youtube.com/watch?v=dQw4w9WgXcQ now." gives x ["<46 words> https://www.youtube.com/watch?\n\n1/2", "v=dQw4w9WgXcQ now.\n\n2/2"].
   - Link target on its own line: "word ".repeat(43) + "ok. Read [the video](https://www.youtube.com/watch?v=dQw4w9WgXcQ) now." gives part 1 ending "\nhttps://www.youtube.com/watch?" and part 2 "v=dQw4w9WgXcQ".
   - LinkedIn: "Sentence here. ".repeat(197) + "Watch https://www.youtube.com/watch?v=dQw4w9WgXcQ now." gives a 2991-character post that ends "Watch https://www.youtube.com/watch?".
   The defect predates the range. But b7d92db says "Keep a bare URL whole", and the new scenario "A URL in a long sentence stays whole" fails for any URL with "?". "A split MUST NOT fall inside a word" fails too. The test at x.test.ts:52 uses a URL with no "?", so it passes. Fix: in sentences(), join a segment that does not end in whitespace to the next one. I tried it on a scratch copy: out.length > 0 && !/\s$/.test(out.at(-1)) → append, in a reduce. All 50 lib tests stay green. All three cases above then keep the URL whole, and the LinkedIn post ends at "Sentence here.". Add a case with a "?" URL beside x.test.ts:52.

2. lib/transform/ast.ts:128-137 — The list walk is one level deep, so a nested list still moves every command below all its steps. That is finding 1 of the last review, one level down. Input: "- Setup\n  1. Install:\n\n     ```\n     npm i\n     ```\n\n  2. Build:\n\n     ```\n     npm run build\n     ```\n". It gives x ["• Setup\n\n\nInstall:\n\n\n\nBuild:\n\n1/3", "```\nnpm i\n```\n\n2/3", "```\nnpm run build\n```\n\n3/3"]. The new scenario "Each list item keeps its code below it" fails for the inner list. Fix: when an li holds a ul or an ol, walk that list the same way. The simplest form is to make the list branch a function that calls itself for a nested list.

3. lib/transform/ast.ts:140-141 — Inside one list item, text below a code block still moves above it, and the ponytail: comment no longer says so. The comment says "Split the quote at each `pre`, as the list walk does", but the list walk splits at each item, not at each pre.
   - "1. Do:\n\n   ```\n   a()\n   ```\n\n   Then:\n\n   ```\n   b()\n   ```\n" gives x ["• Do:\n\nThen:\n\n1/3", "```\na()\n```\n\n2/3", "```\nb()\n```\n\n3/3"]. "Then:" loses its code.
   - "- Run this:\n\n  ```\n  npm i\n  ```\n\n  Then restart.\n" gives "• Run this:\n\nThen restart." above the code.
   The spec sentence "A code block inside a list item SHALL follow the text of that item" permits this output. Fix: either split an item at each pre, or correct the comment so that it names list items as well as quotes.

4. lib/transform/x.ts:63 — A CRLF code line of exactly one piece in length leaves its "\r" as a piece of its own. That "\r" then starts the next part as a blank line. Input: "```\r\n" + "y".repeat(267) + "\r\nshort\r\n```\r\n" gives part 2 "```\n\r\nshort\n```\n\n2/2". It is rare: the input must be CRLF, and a line must be an exact multiple of 267 graphemes. The browser textarea sends LF. f1bff54 has the same output. Fix: text.split(/\r?\n/).

## 2. Missing test

5. lib/transform/linkedin.test.ts and lib/transform/x.test.ts — No test holds the new spec sentence "A bare URL in the prose stays where it is" (X and LinkedIn, from 8e1d8ae). The test at x.test.ts:52 counts the parts that hold the URL. It would still pass if the code also copied the URL to a line of its own in the same part. Fix: assert that transform("Visit https://example.com/a today.\n").linkedin is exactly "Visit https://example.com/a today.", and do the same for the X body.

## 3. Rule violation

None found. 8e1d8ae edits the spec and nothing else. Each fix commit holds one logical change. lib/clipboard.ts has a test beside it. Row 15 of docs/autonomy-log.md covers task 6.5 as a whole.

## The checks you asked for

- Red before green: I ran the tests of each fix commit against its parent's code. All claims hold: 4 fail in b1a1d86, 2 in dc979d3, 2 in d659f74, and 1 in b7d92db. The clipboard file fails to load before ac5f741. The quote case passes before dc979d3, as its message says. The %FF case passes before d659f74, but a mutant without the catch fails it, so it holds the catch.
- Mutants: 12 mutants on 08b46ae, and every one fails at least one test. They include the three survivors of the last review (code-point fit, fill-first splitLines, quote code dropped). The others: flush with no trim, a truthy current, no bullet strip, no decodeURI compare, no catch, Intl words(), the empty-bullet filter, and no pairing.
- List walk, other inputs: a loose list pairs correctly. Links in items before and after the code keep every URL. An item that holds only code prints no bullet.
- words(): tabs split correctly. The CJK cut falls between graphemes, as the ponytail: comment and the new spec sentence say. A fuzz of 400 long sentences (words, tabs, URLs with no "?", a 300-character word) found no part over 280, no lost text and no cut URL.
- splitLines(): a block of only blank lines, or only whitespace lines, gives no X part. The tail of a long line joins the next short line. An empty line at a piece boundary starts the next piece with a blank line, which the source holds. A fuzz of 400 code blocks found no part over 280, no part without fences or content, and no lost text.
- Suite: 56 tests in 8 files pass at 08b46ae (lib and app, scratch copy). eslint lib app exits 0. openspec validate add-markdown-transform --strict passes. tsc reports only LayoutProps in app/layout.tsx, which needs next typegen.
- Spec sentences from 8e1d8ae: each has a test except the bare-URL sentence (finding 5). The scenario "A URL in a long sentence stays whole" has a test, but finding 1 shows that the test is too narrow.

Reviewed: 10 files, 492 lines of diff (git diff f1bff54..08b46ae): lib/transform/{ast,x,linkedin}.ts, their tests, lib/clipboard.ts with its test, app/tool.tsx, the spec, and the 1.7 row of the 2026-09-20 review. Not reviewed: the key={tab} change and the copy status in a browser, because the brief forbids pnpm dev and the suite has no DOM. I read that code only. Commits after 08b46ae (892231d, 98adfcb, 82e2943) are outside the range, and I did not read them. No tracked file changed. Vite again wrote and removed a temporary config in node_modules/.vite-temp, which is empty now.

---

## Outcome — 2026-09-27

| Finding | Outcome | Commit |
|---|---|---|
| 1 | **Fixed.** `sentences()` joins a piece that ends with no space to the next one. A full-width `。`, `！` or `？` still ends a sentence, and a case in `ast.test.ts` holds that. The three URL cases failed before the fix. | `b8f0157` |
| 2 | **Stands.** A nested list still moves every command below all its steps. The spec permits the output. The fix is a walk that splits at each `pre` and calls itself for a nested list: a rewrite of `toBlocks`. Each of the last two rounds of `toBlocks` changes brought new defects, so the rewrite waits for a decision. The `ponytail:` comment names the ceiling. | `8f056ad` |
| 3 | **Stands**, for the same reason as 2. The comment no longer claims that the list walk splits at each `pre`. | `8f056ad` |
| 4 | **Fixed.** `splitLines` splits on `\r\n` or `\n`. The new case failed before the fix. | `1120a7a` |
| 5 | **Fixed.** A case asserts both outputs exactly for a bare URL in the prose. | `2c9f7c2` |
