# Review — the finished change, re-run in full

- **Date:** 2026-09-27
- **Reviewed:** `4e7434f..07b5515`, everything outside `lib/transform/`
- **Reviewer:** the `reviewer` subagent, `.claude/agents/reviewer.md`, session `review-change-rerun`
- **Maker:** a different session. The session that wrote this code did not review it.
- **Why a re-run:** `2026-09-20-finished-change.md` arrived truncated. Sections 3, 4 and 5 of its
  brief never arrived. This run covers them, and re-checks sections 1 and 2.
- **Result:** 1 medium finding in the route handler, 4 false ticks and 1 late tick, 13 contradictions
  with `AGENTS.md`, 8 stale claims in `docs/capstone-spec.md`, and 7 of 10 browser scenarios with no
  test.

The text below is the reviewer's own, unchanged. The outcome of each finding follows it.

---

Re-run review of add-markdown-transform at 07b5515 is complete: 1 medium route.ts memory issue, 4 false ticks, 13 AGENTS.md contradictions, 8 stale capstone-spec claims.

Base: /Users/sas/bookmarks/i/it/courses/2026-agentic-engineering-crash-course-capstone/submissions/oleksii-sanin. HEAD moved to f6456e4 during the review. I did not review f6456e4.

Evidence, run on a git-archive copy of 07b5515 in the scratchpad: `pnpm check` exit 0, 41 tests in 7 files. `openspec validate add-markdown-transform --strict` is valid. `openspec verify` gives "unknown command". `hooks-selftest` all PASS. `agent-log-summary`: 405 executed, 15 not executed, 5 failed, 11 sessions.

SECTION 3 — transform-tool scenarios (openspec/changes/add-markdown-transform/specs/transform-tool/spec.md)
Uncovered, ranked:
1. spec.md:59 "The server keeps no copy" — no test. It needs no new dependency. Add a route.test.ts case that spies on console methods, mocks node:fs writes, posts a sentinel string, and asserts that no spy saw it.
2. spec.md:25 "The blog tab copies HTML source" — no test. It needs a DOM (new dev dependency jsdom or happy-dom), `app/**/*.test.tsx` in vitest.config.mts:7, a per-file `@vitest-environment`, and stubs for navigator.clipboard.writeText and fetch. react-dom/client and act are installed, so @testing-library/react is optional. A partial path with no new dependency: move the copy-string choice at tool.tsx:157 into lib/ and test the string in node.
3. spec.md:29 "The X tab copies one part" — no test. It has the same needs as item 2. Reuse the three-part source in lib/transform/index.test.ts.
4. spec.md:8 "Paste gives four tabs" — no test. It needs the same DOM dependency.
5. spec.md:12 "The X tab shows each part apart" — no test. It needs the same DOM dependency.
6. spec.md:16 "An empty textarea shows no error" — the server half is covered by route.test.ts:72. No test checks the page for no role="alert". It needs the same DOM dependency.
7. spec.md:55 "A reload clears the work" — no test. A real reload needs @playwright/test (a new dev dependency and a browser download) against `next build && next start` on a second port, because AGENTS.md:39 forbids a second pnpm dev. A DOM remount passes for any useState("").
Covered: spec.md:38 by route.test.ts:23. spec.md:42 by route.test.ts:32. spec.md:46 by route.test.ts:46 and :58.

SECTION 4 — ticked tasks (openspec/changes/add-markdown-transform/tasks.md)
1. tasks.md:58 — 6.4 is ticked in 133b896, but that commit saves a truncated report. Sections 3–5 never arrived, and most of the file is the maker's summary. Untick 6.4, or tick it in the commit that saves this re-run.
2. tasks.md:62 — 6.8 is ticked in db15085, which changes tasks.md only. db15085 names 174c6c5 as the work, but 174c6c5 edits AGENTS.md and the task text, not a spec. The spec edit came 7 days later in 54a1e9f. Record 54a1e9f as the work for 6.8.
3. tasks.md:60 — 6.6 is ticked in db15085 (tick only). Rows 8–13 came in one batch (d8dc5d8) after the work. No row exists for the 10 commits from 6b95e82 to 07b5515. Add the rows, or untick 6.6.
4. tasks.md:50 — 5.5 is ticked in a4cfc0f. The log shows pnpm dev at 11:44:37Z, a fetch probe at 11:44:50Z, and the commit at 11:45:35Z. Nobody pasted text into the page, and the a4cfc0f message says so. Untick 5.5 until a browser run is recorded.
5. (lesser) tasks.md:3-12 — 1.1–1.10 are ticked in 637172b, not in the scaffold commit 8c4804a. A sed tick of 1.6–1.8 failed (exit 1) at 11:25:22Z, 10 s before 8c4804a.

SECTION 5 — AGENTS.md vs the repository
1. scripts/check-loop.mjs:25 — AGENTS.md:66-67 says "Ask before: you add a dependency, or you edit next.config.ts, tsconfig.json, eslint.config.mjs, .claude/settings.json or CI". The loop runs acceptEdits (line 63) and locks only tests and app/api/**. The headless agent can edit vitest.config.mts, eslint.config.mjs, tsconfig.json or package.json with no human decision, for example to exclude the red test. Add Edit locks for those files.
2. AGENTS.md:5-6 — the rule says "Trust level 1 ... Wait for a human decision before you change more than one file". autonomy-log.md:54-61 raises lib/ to level 2 and one loop run to level 3. Rows 10 and 13 (lines 39, 42) run app/tool.tsx, app/page.tsx, scripts/ and package.json at level 2, outside the lib/ raise. Session 616876f1 ran in `auto` mode. Update AGENTS.md:5, or move rows 10 and 13 to level 1.
3. AGENTS.md:25 — the rule says "A scenario in specs/ with no test is not done". Six of 10 transform-tool scenarios have no test, but tasks 5.1–5.4 are ticked and R1 reads met.
4. vitest.config.mts:7 — AGENTS.md:45 says "(*.test.ts / *.test.tsx)", but the include glob has no .test.tsx, so such a test never runs. 07b5515 adds tool.tsx behaviour with no test.
5. AGENTS.md:34 — the rule says "adds a row to docs/autonomy-log.md, as it happens". The last row is 14 (2b395f0). No row exists for 6b95e82..07b5515, and 6b95e82 is a whole new OpenSpec change.
6. AGENTS.md:68 — the rule says "touch .env* (a hook blocks it anyway)". The hook matcher is Read|Edit|Write|NotebookEdit (.claude/settings.json:37), and the deny list holds Read and Edit rules only. Bash `cat .env.local` meets no hook. .mcp.json:22-23 passes .env.local to Playwright MCP.
7. AGENTS.md:74 — the rule says "Start in plan mode for anything that touches app/api/** or a config file". 8c4804a (11:25:32Z) adds 5 config files, and the first EnterPlanMode of session 616876f1 comes later, at 11:36:45Z. 4eebf54 changes 18 lines of route.ts with no new plan after 11:41:17Z.
8. .mcp.json:18 — the rule says "pnpm only — never npm or yarn", but Playwright MCP starts via npx. The log shows `npx openspec --version` at 10:50:59Z and `npx vitest run` at 12:05:40Z and 12:09:53Z.
9. AGENTS.md:3 — the sentence "The app is not scaffolded yet." is stale since 8c4804a.
10. proposal.md:45-47 — the proposal says AGENTS.md needs a decision for postcss.config.mjs and vitest.config.ts, but AGENTS.md:66-67 names neither. The file is vitest.config.mts, and proposal.md:46 and tasks.md:8 still say .ts. AGENTS.md:29-30 says "Never leave the two disagreeing".
11. AGENTS.md:62 — the rule says "One logical change per commit". 133b896 mixes a review, an R6 status, a tick and log lines. 637172b mixes a spec edit and 10 ticks.
12. AGENTS.md:66 — `pnpm add -D @types/node@^24` ran at 11:23:52Z in auto mode. It is not in the approved list at proposal.md:49-52, and no record shows a human decision.
13. AGENTS.md:10 — the rule says "each with a command", but R5, R6 and R8 name an artifact (capstone-spec.md:179-182).

RE-CHECK 1 — app/api/transform/route.ts (no change after 4eebf54)
1. route.ts:23-26 (medium) — a body with no content-length (chunked) skips the first guard, and request.text() reads it all. Probe: a 32 MB stream gave 413 only after 33,554,432 bytes were read. Next 16 limits the body only when proxy.ts exists. The comment at :20-22 is false for this case. Read request.body with a reader, count the bytes, and cancel at MAX_BODY_BYTES. Add a stream-body test.
2. app/tool.tsx:156-159 (low, 07b5515, outside route.ts) — the tab-header CopyButton has no key, so after a tab change it keeps "Copied"/"Copy failed" for up to 1.5 s. Add key={tab}.

RE-CHECK 2 — docs/capstone-spec.md stale claims, true values at 07b5515
1. :56 R2 "30 cases in 6 files" — the true value is 41 tests in 7 files.
2. :81-82 R4 "252 / 14 / 3 / 6 sessions" — the true value is 405 executed, 15 not executed, 5 failed, 11 sessions (committed log). About 170 uncommitted log lines will change it again.
3. :130-131 R6 "only 1.3 partly fixed, every other finding still open" — by commit message: 1.1 95e86ce. 1.2 ca36ae6. 1.3 edge and 1.4 3680dad. 1.5 and 2.4 3d1928a. 1.6 b470f07. 1.7 kept on purpose in 95e86ce. 2.5 95e86ce. 2.6 2a64a11/54347a6. 2.1, 3.1 and 4.1 e011f1f. 2.2, 2.3, 3.2, 3.3 and 4.2 396957d. 4.3, 4.4 and A 54a1e9f. B 07b5515. 3.4 is kept. 6.5 is still unticked. The same stale text is in docs/reviews/2026-09-20-lib-transform-groups-2-3.md:247 and in docs/reviews/2026-09-20-finished-change.md:26 ("none fixed"). I did not verify the lib fixes.
4. :120-121 — the claim is "6 correctness bugs … 4 spec drifts". The review body holds 7 items in section 1, and its section 4 holds 2 drifts (4.3, 4.4) plus 2 AGENTS.md/design.md contradictions (4.1, 4.2).
5. :159-160 R8 "branch exists on origin" — this is true, but origin/oleksii-sanin is 133b896 (per ls-remote). The 17 commits from 460c5d6 to 07b5515 are unpushed.
6. :74 R4 "CLAUDE.md stays committed" — d5aa6b0 deleted submissions/oleksii-sanin/CLAUDE.md. tasks.md:38 still names CLAUDE.md as the source of the plan-mode rule, which is AGENTS.md:74.
7. :142 R7 "first code commit 058e30f" — the first code commit is 8c4804a, and 058e30f is the first lib/ commit. Both come after c5d01ee, so R7 holds.
8. :101-102 and autonomy-log.md:71-72 — the claims are "may not edit … app/api/**" and "a probe proved the lock". The probe tested the test-file lock only.
Holds: R1 (10 X parts, max 276 graphemes, for mvp-plan.md lines 105-154). R3. The R4 blocked action at 11:20:30Z. The R5 run files. R6 "two files". R7 order, 637172b and 882960e.

Reviewed: 07b5515 (4e7434f..07b5515) outside lib/transform/, the OpenSpec change, the docs, the configs, scripts/, the git history and the committed agent log.
Not reviewed:
- lib/transform correctness. This is out of scope, and my fix list comes from commit messages only.
- The page in a browser. The brief forbids pnpm dev.
- Whether pnpm check ran before bc9c904 and a4cfc0f. The log truncates cmd, but the 4.3 s durations fit a chained check.
- f6456e4.
- The uncommitted log lines.
No file in the repository was created, edited or deleted.

---

## Outcome — 2026-09-27

Many findings touch a permanent boundary in `docs/autonomy-log.md`: `app/api/**`, a config file, a
dependency, the harness, or `AGENTS.md`. The agent does not change those at level 2. Each such
finding stands open, with the decision it waits for.

| Finding | Outcome | Commit |
|---|---|---|
| S3.1 "The server keeps no copy" has no test | **Open, needs a decision.** The case goes in `app/api/transform/route.test.ts`, and `AGENTS.md` sends each change under `app/api/**` through plan mode. | — |
| S3.2 to S3.6, the page scenarios | **Open, needs a decision.** A page test needs a DOM library and a `.test.tsx` include in `vitest.config.mts`: a new dependency and a config edit. `ac5f741` moves the copy outcome into `lib/clipboard.ts` with a node test. That holds the logic of a copy, not the render. | `ac5f741` |
| S3.7 "A reload clears the work" | **Open, needs a decision.** It needs `@playwright/test` and a browser download. | — |
| S4.1 Task 6.4, ticked on a truncated review | **Recorded.** The task now names the full re-run, this file. | `892231d` |
| S4.2 Task 6.8, ticked before any spec edit | **Recorded.** The task now names the spec edits `54a1e9f` and `8e1d8ae`. | `892231d` |
| S4.3 Task 6.6, no rows after row 14 | **Partly fixed.** Rows 15 and 16 cover the task 6.5 work. No row covers `6b95e82`, the proposal of `add-jira-gdocs-and-import`. Another session wrote it, and that session or the human adds the row. | `f6456e4` |
| S4.4 Task 5.5, ticked with no paste in a browser | **Open, needs a decision.** Untick 5.5, or a human pastes a post into the page and records it. R1 in `docs/capstone-spec.md` now reads partly met for the same reason. | — |
| S4.5 Tasks 1.1 to 1.10, ticked after the scaffold commit | **Stands.** History. A rewrite costs more than the record. | — |
| S5.1 The loop locks no config file | **Open, needs a decision.** `scripts/check-loop.mjs` is the guard of an autonomous loop. | — |
| S5.2 The trust level line in `AGENTS.md` | **Open, needs a decision.** `AGENTS.md` is a rules file. | — |
| S5.3 Six scenarios with no test | **Open**, with S3. | — |
| S5.4 No `.test.tsx` in the Vitest include | **Open**, with S3: a config edit. | — |
| S5.5 No autonomy row after row 14 | See S4.3. | `f6456e4` |
| S5.6 A Bash read of `.env*` meets no hook | **Open, needs a decision.** The fix goes in `.claude/settings.json` or a hook, which is the harness. It is a security finding. | — |
| S5.7 Plan mode came after the config files | **Stands.** History. | — |
| S5.8 `npx` in `.mcp.json` and in the log | **Open** for `.mcp.json`, a config file. **Stands** for the three runs in the log, which are history. | — |
| S5.9 "The app is not scaffolded yet." | **Open, needs a decision.** `AGENTS.md` is a rules file. | — |
| S5.10 `vitest.config.ts` and the config list | **Partly fixed.** `proposal.md` and `tasks.md` now say `vitest.config.mts`. Which config files need a human decision is open: `proposal.md` names five, and `AGENTS.md` names three. | `892231d` |
| S5.11 Commits with more than one change | **Stands.** History. | — |
| S5.12 `@types/node` with no recorded approval | **Open, needs a decision.** The human confirms or rejects the dependency after the fact. | — |
| S5.13 R5, R6 and R8 name an artifact, not a command | **Open, needs a decision.** The fix is one word in `AGENTS.md`, a rules file. | — |
| R1.1 A chunked body is read whole before the size check | **Open, needs a decision. Medium.** The fix touches `app/api/**`, which needs plan mode and a human decision. | — |
| R1.2 The tab copy button keeps its state | **Fixed, and not tested.** The render needs a DOM library. | `be5e38d` |
| R2.1 to R2.8, stale claims in `docs/capstone-spec.md` | **Fixed.** The fix of R2.8 in `docs/autonomy-log.md` lands in the same commit as this table. | `98adfcb` |
