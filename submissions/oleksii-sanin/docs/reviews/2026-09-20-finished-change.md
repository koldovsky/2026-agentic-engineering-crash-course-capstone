# Review — the finished change, everything outside `lib/transform`

- **Date:** 2026-09-20
- **Reviewed:** `4e7434f..HEAD`, at `db15085` in the reviewer's view
- **Reviewer:** the `reviewer` subagent, `.claude/agents/reviewer.md`, session `review-change`
- **Maker:** a different session. The session that wrote this code did not review it.
- **Result:** no correctness or security bug in the route handler. Two low-severity findings. Every
  documented claim verified against the repository.

**This report is incomplete.** I stopped the reviewer when the session ended, and its report arrived
truncated, in the middle of the R4 sentence in section 2. Sections 3, 4 and 5 of the brief never
arrived: the two browser scenarios with no automated test, the ticked tasks with no commit behind
them, and the `AGENTS.md` contradictions. The next session re-runs this review to cover them.

## What it verified, and what I then checked myself

The reviewer reported three untracked files, `lib/transform/zz-probe*.test.ts`, left behind by the
other reviewer's probes. It warned that they match the Vitest include glob, so `pnpm check` would
report 37 tests in 9 files instead of 29 in 6.

I checked after stopping both reviewers. The files are gone, `git status` is clean, and `pnpm check`
exits 0 with 29 tests in 6 files. The warning was correct at the time and no longer applies. It is
worth remembering: a concurrent agent writing into `lib/` changes the number that the pull request
quotes.

## Open findings, none fixed

| # | File | Severity | Finding |
|---|---|---|---|
| A | `app/api/transform/route.ts:12,31` | low | The 100 KB cap measures the whole JSON body, not the `markdown` field. A markdown string just under 100 KB can trip the 413, because the JSON wrapper pushes the total over the cap. The margin is about 20 bytes. The spec scenario says "a markdown string over 100 KB", and the code enforces "a body over 100 KB". Task 4.3 says body, so the code follows the task and the spec sentence is the one that drifted. Fix: reword the scenario in `specs/transform-tool/spec.md`. |
| B | `app/tool.tsx:30-34` | low | `CopyButton` calls `await navigator.clipboard.writeText(text)` with no `try`/`catch`. A refused permission prompt, or a browser without the API, gives an unhandled rejection, and the button stays on "Copy" with no feedback. Fix: wrap the call, keep `copied` false on an error, and tell the reader the copy failed. |

## Claims checked against the repository — all hold

The reviewer ran `pnpm check` and `pnpm agent:log` itself, and cross-checked every commit hash, test
count and exit code in `docs/capstone-spec.md`:

- **R2:** `pnpm check` exits 0, 29 tests in 6 files. Confirmed.
- **R3:** `058e30f` is the red commit and its message states the failure. `3b45c86` is green, touches
  `lib/transform/index.ts` and new test files only, and deletes no assertion. Confirmed.
- **R4:** the quoted blocked action matches `.agent-log/actions.jsonl` exactly — a `PreToolUse` line
  at that timestamp with no matching `PostToolUse` line.
- **R5:** both files in `docs/runs/` match the iteration counts, stop reasons and exit codes quoted.
- **R6:** "not met" was accurate when it ran. `docs/reviews/` did not exist yet.
- **R7:** `c5d01ee` precedes `058e30f` in `git log --reverse`. `637172b` and `882960e` are separate
  commits, as claimed.
- **R8:** "not met, the branch is local only". Confirmed — the branch is ahead of `origin` and
  unpushed.

## The reviewer's own words, as far as they arrived

> No bug makes `app/api/transform/route.ts` give a wrong answer or crash. The size guard runs on
> `content-length` first, then on the measured byte length, before `JSON.parse`, matching
> `design.md`'s decision. No `console.log` or write of the markdown text exists anywhere in the
> handler, so the "server keeps no copy" requirement holds.

## Task 6.5 — 2026-09-27

| # | Outcome | Commit |
|---|---|---|
| A | **Spec edited.** The 413 scenario now says "a request body over 100 KB", which is what task 4.3 and the code say. | `54a1e9f` |
| B | **Fixed, and not tested.** `CopyButton` catches the rejection and shows "Copy failed" for 1.5 seconds. No automated test covers it: the suite runs in the node test environment with no DOM library, and a DOM library is a new dependency, which `AGENTS.md` sends to the human. No browser check ran either, because the Playwright MCP server failed to connect in that session. | `07b5515` |
