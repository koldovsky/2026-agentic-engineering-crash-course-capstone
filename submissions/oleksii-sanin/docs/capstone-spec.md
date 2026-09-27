# Capstone completion spec

Date: 2026-09-20. Owner: Oleksii Sanin. Status: draft.

This file defines when the capstone is complete. It is the acceptance contract for the submission.

- The product plan is in `docs/mvp-plan.md`. This file does not restate it.
- The course rules are in `../../README.md` and `../../RUBRIC.md`. This file does not restate them.
- This file maps each course rule to one artifact in this repository, and to one command that proves the artifact works.

## Scope

In scope: a thin slice of the week-one product, the agent harness, the proof trail, and the submission.

Out of scope: accounts, a database, publish integrations, a scheduler, payment, and the AI hook generator. `docs/mvp-plan.md` holds the full cut list.

A named practice without a link is out of scope too. It is the one frequent cause of rework.

## Definition of done

The capstone is complete when the eight requirements below pass. Rules:

1. Each requirement names one artifact and one verification step.
2. A requirement passes when a reviewer can open the artifact without a login.
3. A requirement with a claim but no artifact does not pass.

## R1 — The product runs

A thin slice of `docs/mvp-plan.md` works end to end.

- `lib/transform/` holds the transform as a pure function. It imports no React module and no Next module.
- The function returns all four outputs: blog HTML, email HTML, X thread parts, and LinkedIn text.
- One page accepts markdown text. It shows the four outputs.
- One route handler in `app/api/**/route.ts` stays thin. It calls `lib/`.

**Verify:** `pnpm dev`, then paste one real post from `docs/mvp-plan.md` day 5. All four outputs appear.

**Status today:** partly met on 2026-09-27. It read "met" until then.

- `lib/transform/` holds the pure function, with no React import and no Next import. A case in
  `lib/transform/index.test.ts` holds that rule since `396957d`.
- `app/api/transform/route.ts` calls it and holds no transform logic.
- `app/page.tsx` stays a Server Component, and `app/tool.tsx` carries the textarea and the four tabs.
- Against a running `pnpm dev`, the landing page copy of `docs/mvp-plan.md` gives HTTP 200 on the
  page and on the endpoint, 10 X parts, and no part over 280 graphemes.

The verify step above never ran. Nobody pasted a post into the page in a browser. The probe drove
HTTP, not the DOM, and task 5.5 carries the same gap. Six of the ten scenarios in
`specs/transform-tool/spec.md` have no test, because a page test needs a DOM library, which is a new
dependency. `docs/reviews/2026-09-27-finished-change-rerun.md` lists them in section 3.

One medium finding in the route handler is open. A body with no `content-length` header skips the
first size check, and the handler reads it whole before the second. The fix touches `app/api/**`, so
it waits for plan mode and a human decision.

R1 is met when a human pastes the post into the page once, and the route finding is closed.

## R2 — One command verifies the project

- `package.json` defines `check` as typecheck, then lint, then tests.
- Every new behaviour in `lib/` has a Vitest file beside it.
- The X thread splitter has a test for each edge case: a long sentence, a code fence, and a link at the limit.

**Verify:** `pnpm check` exits 0. Quote the output and the test count in the PR.

**Status today:** met. `pnpm check` runs `next typegen`, then `tsc --noEmit`, then `eslint`, then
`vitest run`. At `8f056ad` it exits 0 with 63 tests in 8 files. At the start of 2026-09-27 it held
30 tests in 6 files. Every `lib/` module has a test file beside it: `lib/transform/ast.ts` since
`e011f1f`, and `lib/clipboard.ts` since `ac5f741`. The splitter has a case for each edge case R2
names: a long sentence, a code fence, and a link at the limit.

Two mutants of the grapheme helpers passed the whole suite until `e011f1f`. Both fail it now:
`docs/runs/2026-09-27-grapheme-mutants.txt`.

## R3 — A test was red, then green

This is the strongest verification proof in the rubric.

- One commit adds a failing test. The commit message says the test fails.
- The next commit makes it pass. It changes `lib/`, not the test.

**Verify:** `git log --oneline` shows the two commits in that order. The PR links both.

**Status today:** met. `058e30f` adds the failing test, and its first line says that the test fails.
`3b45c86` makes it pass. It changes `lib/transform/index.ts`, and it deletes no assertion.

## R4 — Context engineering acted, not just existed

- `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json` and `.claude/hooks/` stay committed.
- `.agent-log/actions.jsonl` records what the agent proposed and what actually ran.
- At least one blocked action stays in the log. A blocked action is a `PreToolUse` line with no matching `Post` line.
- The PR quotes one blocked action and says which rule blocked it.

**Verify:** `pnpm agent:log`. The report lists the blocked actions.

**Status today:** met. `pnpm agent:log` reports 619 executed, 17 proposed but not executed, and 8
failed, over 11 sessions. That is the working log at 17:29 on 2026-09-27. Each session adds lines, so
the numbers are a snapshot.

`CLAUDE.md` no longer exists in this directory. Commit `d5aa6b0` merged it into `AGENTS.md`. The
other three items stay committed.

The blocked action to quote in the PR: at 11:20:30 the agent proposed
`rm -rf scaffold` in its own scratch directory. The `deny` list in `.claude/settings.json` stopped
it, and `AGENTS.md` states the same rule in words. The agent dropped the `rm -rf` and ran the rest
of the command, because the directory did not exist yet.

## R5 — A loop ran to green

- One script repeats `pnpm check` until the exit code is 0, or until it reaches a retry cap.
- The output of one real run is saved under `docs/runs/`.
- The saved run shows the iteration count and the stop reason.

**Verify:** run the script once. Commit its output. Do not describe the loop in words only.

**Status today:** met on 2026-09-27. It was marked met on 2026-09-20 in error.

The first version of `scripts/check-loop.mjs` repeated `pnpm check` and called no agent, so nothing
changed between two iterations. The rubric asks for a loop that drives the agent to green. Commit
`a27e75b` makes the script run `claude -p` with the failure output after each red check. The agent
may not edit a test file or `app/api/**`.

- `2026-09-27-check-loop-agent.txt`: the run that counts. Red on the test from `6f4a787`, one agent
  turn, green on iteration 2, 50.9 seconds. The agent changed `lib/transform/x.ts` only.
- `2026-09-27-loop-lock-probe.txt`: a headless agent refused on an edit to a test file. The probe
  tested that lock only. No probe tested the `app/api/**` lock. The loop also does not lock the
  config files that `AGENTS.md` sends to the human, such as `vitest.config.mts`. That finding is
  open: `docs/reviews/2026-09-27-finished-change-rerun.md`, section 5, item 1.
- `2026-09-20-check-loop-green.txt` and `2026-09-20-check-loop-red.txt`: the first version, with no
  agent. The red run shows two identical red iterations, which is the defect.

## R6 — maker is not checker

- The `reviewer` subagent in `.claude/agents/reviewer.md` reads the diff. The session that wrote the code never reviews it.
- Each review output is saved under `docs/reviews/` with a date and the reviewed commit.
- An empty review counts. Record it as an empty review, and say so.

**Verify:** `docs/reviews/` holds at least two files. At least one names a real finding.

**Status today:** met on 2026-09-27. `docs/reviews/` holds five files, and each names real findings.
A session other than the maker wrote each one.

- `2026-09-20-lib-transform-groups-2-3.md`: 7 correctness findings, 6 coverage gaps, 4 weak tests, 2
  spec drifts, and 2 contradictions with `AGENTS.md` and `design.md`. It carries a table of the
  findings I reproduced myself. One row of that table was wrong, and the file records the correction.
- `2026-09-20-finished-change.md`: no bug in the route handler, and 2 low-severity findings. It
  arrived truncated, because the session ended while the reviewer was still writing.
- `2026-09-27-finished-change-rerun.md`: the full re-run of the truncated review. 1 medium finding
  in the route handler, 4 false ticks, 13 contradictions with `AGENTS.md`, and 8 stale claims in
  this file.
- `2026-09-27-task-6-5-fixes.md`: the review of the fixes for the first two files. 13 findings, and
  5 of them are regressions that those fixes introduced.
- `2026-09-27-task-6-5-fixes-round-2.md`: the same reviewer on the fixes for its own findings. 4
  correctness findings and 1 missing test. All 12 of its mutants fail the suite.

A third round, on `ca8505d..8f056ad`, was requested and then stopped when the session ended. It sent
no result, so those four commits have no review.

Each file ends with the outcome of each finding: a fix with its commit, or the reason it stands.
Findings that need a human decision under `AGENTS.md` stand open and say so.

## R7 — The spec came before the code

- The week-one work goes through one OpenSpec change under `openspec/changes/`.
- The change artifacts are committed before the first code commit.
- Where reality did not match the spec, the spec is edited, and the edit is a separate commit.

**Verify:** `git log --oneline --reverse` shows the spec commit before the first `lib/` commit.

**Status today:** met. Commit `c5d01ee` holds the four artifacts of
`openspec/changes/add-markdown-transform/`. The first commit with code, the scaffold `8c4804a`, comes
after it. So does the first `lib/` commit, `058e30f`.

The first spec edit is `637172b`. The artifacts said plain elements and minimal CSS. The human
chose Tailwind v4 mid-task, so `design.md` and `proposal.md` changed apart from the code. That
commit also ticks ten tasks, so it is not a pure spec edit. `AGENTS.md` now carries the rule itself,
in commit `882960e`.

Two later spec edits follow the review findings, each in a commit of its own: `54a1e9f` and
`8e1d8ae`, on 2026-09-27.

## R8 — The submission is honest and complete

- The branch `oleksii-sanin` is pushed to `origin`.
- A pull request to upstream uses `.github/PULL_REQUEST_TEMPLATE.md`. It stays open.
- Every checked practice in the template carries a permalink to a file, a commit, a test or a run.
- A 1 to 2 minute video shows the product, and says how the work was built with an agent.
- One section states which decisions were mine, and which were the agent's.
- `docs/autonomy-log.md` records the work as it happens. It names at least one agent error and one reverted step.

**Verify:** open the PR in a private browser window. Every link resolves without a login.

**Status today:** not met. The branch exists on `origin`, but `origin/oleksii-sanin` is at
`133b896`. The commits after it are local only. The pull request and the video do not exist yet.

## Traps

The rubric returns work for four reasons. Each one has a countermeasure here.

1. **A practice without proof.** Countermeasure: R1 to R7 each name a file path.
2. **A record written after the fact.** Countermeasure: `docs/autonomy-log.md` grows during the work, not before the submission.
3. **A story where nothing failed.** Countermeasure: R8 requires one agent error and one reverted step.
4. **A video longer than 2 minutes.** Countermeasure: record the video last, from a script.

## Verification summary

| # | Requirement | Command or artifact |
| --- | --- | --- |
| R1 | The product runs | `pnpm dev` |
| R2 | One command verifies | `pnpm check` |
| R3 | Red, then green | `git log --oneline` |
| R4 | Context engineering acted | `pnpm agent:log` |
| R5 | A loop ran to green | `docs/runs/` |
| R6 | maker is not checker | `docs/reviews/` |
| R7 | The spec came first | `openspec/changes/`, commit order |
| R8 | The submission is complete | the open pull request |

## Open decisions

These belong to the human. Work does not start on them until they are closed.

1. ~~Does the thin slice ship the landing page first, as day 1 of `docs/mvp-plan.md` says? Or does
   `lib/transform` come first?~~ Closed on 2026-09-20: `lib/transform` first. The landing page and
   the email capture become a second change.
2. ~~Does the X thread splitter ship with the grapheme count ceiling, or with `twitter-text`?~~
   Closed on 2026-09-20: the grapheme ceiling, with a `ponytail:` comment at the split site that
   names `twitter-text` as the upgrade path.
3. Is the demo video recorded against local `pnpm dev`, or against a Vercel deployment?
