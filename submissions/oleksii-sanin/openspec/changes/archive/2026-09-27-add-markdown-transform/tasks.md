## 1. Scaffold and the check command

- [x] 1.1 Ask the human once for the dependency list in `proposal.md`. `AGENTS.md` requires it. Do not install before the answer.
- [x] 1.2 Run `create-next-app` in a temporary directory. Use TypeScript, ESLint, the App Router, no `src/` directory, and the import alias `@/*`.
- [x] 1.3 Copy `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs` and `app/` into this directory. Do not overwrite `AGENTS.md`, `CLAUDE.md`, `.claude/`, `docs/` or `openspec/`.
- [x] 1.4 Run `create-next-app` a second time with `--tailwind`. Copy its `app/` and its `postcss.config.mjs` in. Delete `app/page.module.css`. The human chose Tailwind over CSS modules on 2026-09-20, after the first scaffold landed.
- [x] 1.5 Run `git status`. Confirm that the scaffold added no file inside `.claude/` and no file inside `.agent-log/`.
- [x] 1.6 Add Vitest and `vitest.config.mts`. Set the test environment to `node`.
- [x] 1.7 Add the `check` script to `package.json`: typecheck, then lint, then `vitest run`. Add `agent:log` and `hooks:selftest` to the same file.
- [x] 1.8 Run `pnpm check`. It must exit 0 on the empty project. Quote the output.
- [x] 1.9 Run `pnpm hooks:selftest`. All checks must print `PASS`.
- [x] 1.10 Commit the scaffold alone. The message uses `build:` or `chore:`. No `lib/` code is in this commit.

## 2. Blog and email outputs

- [x] 2.1 Create `lib/transform/index.ts` with the function signature and the result type from `specs/markdown-transform/spec.md`. Return empty outputs.
- [x] 2.2 Write `lib/transform/index.test.ts` for the three scenarios of "One source, four outputs". Run it. It must fail.
- [x] 2.3 Commit the failing test. The message says that the test fails. This commit is the red half of R3 in `docs/capstone-spec.md`.
- [x] 2.4 Parse the markdown with `remark-parse`. Build the blog HTML with `remark-rehype` and `rehype-stringify`.
- [x] 2.5 Write `lib/transform/blog.test.ts` for the code fence scenario and the link scenario.
- [x] 2.6 Build the email HTML. Apply a style map during the tree walk. Do not add a fourth dependency.
- [x] 2.7 Write `lib/transform/email.test.ts` for the heading scenario and the code block scenario.
- [x] 2.8 Run `pnpm check`. It must exit 0. Commit the green half of R3.

## 3. X thread and LinkedIn outputs

- [x] 3.1 Write `lib/transform/x.test.ts` first, for all five scenarios in the spec. Include the emoji case and the code fence case.
- [x] 3.2 Split the thread with `Intl.Segmenter`. Group the AST blocks. Split at a sentence boundary under 280 graphemes.
- [x] 3.3 Add the `n/total` counter to each part.
- [x] 3.4 Add the `ponytail:` comment at the split site. Name the grapheme ceiling and name `twitter-text` as the upgrade path.
- [x] 3.5 Write `lib/transform/linkedin.test.ts` for the three LinkedIn scenarios.
- [x] 3.6 Build the LinkedIn text. Remove the emphasis marks. Move each URL to its own line. Cut at the last sentence under 3000 characters.
- [x] 3.7 Add the `meta` object. Count the X parts and the characters of each output.
- [x] 3.8 Run `pnpm check`. Commit `lib/transform` complete.

## 4. Route handler

- [x] 4.1 Start in plan mode. `AGENTS.md` requires it for `app/api/**`. That rule sat in `CLAUDE.md` until `d5aa6b0` merged the two files.
- [x] 4.2 Create `app/api/transform/route.ts`. Read `markdown` from the body. Call `lib/transform`. Hold no transform logic.
- [x] 4.3 Reject a body with no `markdown` field with a 400. Reject a body over 100 KB with a 413.
- [x] 4.4 Write the route test for the three scenarios in `specs/transform-tool/spec.md`.
- [x] 4.5 Run `pnpm check`. Commit the route handler.

## 5. Tool page

- [x] 5.1 Build the page with a textarea and four tabs. Mark the interactive part `'use client'`. Server Components stay the default.
- [x] 5.2 Show each X part as its own block with its counter.
- [x] 5.3 Add a copy button per tab, and one per X part. Copy the raw output, not the rendered HTML.
- [x] 5.4 Handle the empty textarea. Show empty outputs, not an error.
- [x] 5.5 Run `pnpm dev`. Paste one real post from `docs/mvp-plan.md`. Fix what breaks.
- [x] 5.6 Run `pnpm check`. Commit the page.

## 6. Proof trail

- [x] 6.1 Write the loop script. It repeats `pnpm check` until exit code 0, or until it reaches a retry cap.
- [x] 6.2 Save the output of one real run to `docs/runs/`. The file shows the iteration count and the stop reason.
- [x] 6.3 Run the `reviewer` subagent on the diff of groups 2 and 3. Save the output to `docs/reviews/`.
- [x] 6.4 Run the `reviewer` subagent once on the finished change. Save that output too. Record an empty review as an empty review. The first report, `docs/reviews/2026-09-20-finished-change.md`, arrived truncated, so this tick in `133b896` came early. The full re-run is `docs/reviews/2026-09-27-finished-change-rerun.md`.
- [x] 6.5 Fix what the reviewer found, or record why a finding stands unfixed.
- [x] 6.6 Add a row to `docs/autonomy-log.md` for each significant piece of work, as it happens. Record every level change with its reason.
- [x] 6.7 Update the status lines in `docs/capstone-spec.md` for R1 to R7.
- [x] 6.8 Run `openspec validate add-markdown-transform --strict`. The CLI has no `verify` command, which this task named until now. Edit the spec where reality did not match it. Commit that edit apart. The tick in `db15085` came before any spec edit. The spec edits are `54a1e9f` and `8e1d8ae`, on 2026-09-27.
- [x] 6.9 Make the loop call the agent. After a red check, `scripts/check-loop.mjs` runs `claude -p` with the failure output, then checks again. The agent may not edit a test file or `app/api/**`. The script from 6.1 repeated the check and changed nothing between iterations, so it was a retry, not an agent loop. On 2026-09-27 the human asked whether loops were covered. The agent first said yes, then read the script against the rubric wording and found the gap.
- [x] 6.10 Write a failing test for review finding 1.3, the X part that holds only a fence marker. Commit it red. Then run the loop from 6.9 and let the agent fix `lib/`. Save that run to `docs/runs/`.
