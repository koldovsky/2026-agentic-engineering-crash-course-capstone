# Autonomy log — capstone, markdown publisher

English translation of `templates/autonomy-log.md`. The upstream template is in Ukrainian, and it
stays untouched. The examples are deleted, as that template instructs. The rows below are real.

A row for each significant piece of work: **task → trust level → who decided → evidence → why that level.**

Three questions before each row:

1. **How fast do I see the error?** A red test in 20 seconds, or a user complaint in three days.
2. **How cleanly can I revert?** A `git checkout`, or a migration with no way back.
3. **What evidence convinces me?** A green run, a screenshot, a manual check. Name the exact one.

Course levels:

| Level | Name | Who does what |
|---|---|---|
| 1 | Assistant | The agent proposes. The human decides each action. |
| 2 | Assistant to agent | The agent edits files alone. Commands need permission. The human does not watch the process. |
| 3 | Agent | It reaches the goal alone, and it brings evidence. |
| 4 | Agents | Parallel subagents. The human merges the results. |
| 5 | Autonomous agents | The harness runs without a human. The human acts on exception only. |

---

## Entries

| # | Work | Level | Who decided | Evidence | Why this level |
|---|------|-------|-------------|----------|----------------|
| 1 | Product research with the Ideabrowser MCP | 1 · Assistant | The agent pulled 5 of 21 research sections. The human approved the write. | `docs/mvp-plan.md`, commit `591d479`. 21 `mcp__ideabrowser__*` calls in `.agent-log/actions.jsonl`. | The product choice sets everything after it. I wanted to read each source myself. |
| 2 | Agent harness: hooks, allow-list, `reviewer` subagent | 1 · Assistant | The human ran the commit. | Commit `709eb00`. `node scripts/hooks-selftest.mjs` prints 13 `PASS` lines. | Permanent boundary. The harness is always level 1. |
| 3 | `docs/capstone-spec.md`, the acceptance contract | 1 · Assistant | The human asked for the file. The agent wrote it. The human read it before the commit. | Commit `309b9ca`. | One file, and one `git revert` undoes it. |
| 4 | OpenSpec artifacts for `add-markdown-transform` | 1 · Assistant | The human closed two scope decisions first. The agent then wrote four artifacts. | Commit `c5d01ee`. `openspec validate add-markdown-transform --strict` reports valid. | The spec fixes the scope of every line of code that follows it. |
| 5 | The `Read first` section in `AGENTS.md` | 1 · Assistant | The human asked. | `AGENTS.md`, uncommitted at the time of this row. | A rules file. Permanent boundary. |
| 6 | Next.js 16 scaffold, Tailwind v4, Vitest, and the `check` command | 1 · Assistant | The agent asked once with the dependency list from `proposal.md`. The human approved it, then ran the commit. | Commit `8c4804a`. `pnpm check` exits 0. `pnpm hooks:selftest` prints 19 `PASS` lines. | A dependency and a build configuration. The permanent boundary list holds both at level 1. |
| 7 | Tailwind v4 in place of CSS modules | 1 · Assistant | The human reversed the agent mid-task, after the first scaffold had already landed in the working tree. | Commit `8c4804a`. `design.md` now carries the decision. `proposal.md` carries the two new dependencies. `tasks.md` 1.4 carries the step. | Same boundary as row 6. The reversal is the evidence that level 1 earned its cost here. |
| 8 | `lib/transform`: the four outputs, task groups 2 and 3 | 2 · Assistant to agent | The agent wrote the code and the tests with no decision for each file. The human did not watch the steps. | Commits `058e30f` (red), `3b45c86`, `bc9c904`. `pnpm check` exits 0 with 29 cases in 6 files. | The raise condition was already met. A red Vitest run in seconds is the detector, and one `git checkout` is the revert. |
| 9 | The route handler at `app/api/transform/` | 1 · Assistant | Plan mode first, as `AGENTS.md` requires for `app/api/**`. The human rejected the first plan, because it restated the spec instead of adding to it. The second plan held only the part no spec covered. | Commit `07aa629`. The approved plan file. | A public endpoint that accepts text from anyone. It is a trust boundary, so it stays at level 1. |
| 10 | The tool page: `app/page.tsx` and `app/tool.tsx` | 2 · Assistant to agent | The agent built it, then drove the running server over HTTP. | Commit `a4cfc0f`. Page HTTP 200, endpoint HTTP 200, 10 X parts and none over 280 graphemes, for the landing page copy in `docs/mvp-plan.md`. | The page holds no secret. The gap is real and recorded: the agent drove HTTP, not the DOM. |
| 11 | The body size check moved before the body read | 1 · Assistant | A background security review reported the placement. The agent fixed it and added the case that proves the early exit. | Commit `4eebf54`. | Security, and a config-shaped boundary. Level 1 by the list below. |
| 12 | The spec-driven rule in `AGENTS.md` | 1 · Assistant | The human asked for it mid-task, after seeing the agent plan work that the spec already fixed. | Commit `882960e`. | A rules file. Permanent boundary. |
| 13 | `scripts/check-loop.mjs` and the two recorded runs | 2 · Assistant to agent | The agent wrote the script, ran both runs, and reverted the deliberate break. | Commit `899b25c`. `docs/runs/` holds both stop reasons. | A script that repeats one command and changes nothing. |
| 14 | The agent loop, and the fix for review finding 1.3 | 3 · Agent, for one run | The human chose a failure-driven loop over a loop around `/opsx:apply`, and approved the run after the agent said that it edits with no approval for each step. The session agent wrote the red test and the loop change. A headless `claude -p` agent wrote the fix. The session agent read its diff and reproduced the gap it named. | Commits `6f4a787` (red), `a27e75b`, `12e43b2` (green). `docs/runs/2026-09-27-check-loop-agent.txt`: 2 iterations, 1 agent turn, green in 50.9 seconds. `docs/runs/2026-09-27-loop-lock-probe.txt`: the lock refused an edit to a test file. | See the raise of 2026-09-27 below. |
| 15 | Task 6.5: a fix or a recorded reason for each of the 23 findings in `docs/reviews/` | 2 · Assistant to agent | The human chose which change to apply. For each finding, the agent chose between a fix, a spec edit and a recorded reason. The human did not decide each finding. Two choices are the agent's alone, and the human can reverse them: 1.7 stays unfixed, and 4.3 changes the spec, not the code. | Commits `54a1e9f` to `07b5515`. Each new test for a fix ran red before the fix. `docs/runs/2026-09-27-grapheme-mutants.txt`. `pnpm check` exits 0 with 41 tests in 7 files. The outcome tables close both files in `docs/reviews/`. | `lib/` is at level 2 since 2026-09-20. `app/tool.tsx` is at level 2 by row 10. The spec edits follow the `AGENTS.md` rule: when the code and the spec disagree, edit the spec in a commit of its own. |
| 16 | Two more reviews, and the second round of fixes | 2 · Assistant to agent, and 1 for what the reviews found at a boundary | The agent ran two reviewers in parallel: one on its own fixes, one to re-run the truncated review. It fixed what sat in `lib/`, `app/tool.tsx` and the docs. It fixed nothing at a permanent boundary: the route handler, a config file, a dependency, the harness and `AGENTS.md`. Those findings wait for the human. | Commits `f1bff54` to the commit that adds this row. `docs/reviews/2026-09-27-task-6-5-fixes.md` and `docs/reviews/2026-09-27-finished-change-rerun.md` end with an outcome table. | Level 2 covers `lib/` and the page. The list of permanent boundaries below keeps the rest at level 1, and that includes a medium security finding in `app/api/transform/route.ts`. |
| 17 | `add-jira-gdocs-and-import` group 1: the Jira output | 2 · Assistant to agent | The human chose wiki markup over ADF when the change was planned. The agent wrote the walk and the tests with no decision for each file. Two choices are the agent's alone: the escape of `#` and `-` at the start of every text node, not only at the start of a line, and a one-line edit to `app/api/transform/route.test.ts`, which `tasks.md` missed. | Commit `b2d14ba`. The 10 cases in `lib/transform/jira.test.ts` failed before `jira.ts` existed. `pnpm check` exits 0 with 73 tests in 9 files. | `lib/` is at level 2. The route edit adds one key to an expected list in a test. The handler does not change, and `AGENTS.md` sends a one-line diff past plan mode. |
| 18 | Group 2: the Google Docs output | 2 · Assistant to agent | The human chose a rich-text copy over a `.docx` download when the change was planned. The agent renamed `applyEmailStyles` and wrote the tests. | Commit `4428bb5`. Both `gdocs.test.ts` cases failed first. `email.test.ts` passes with no edit. `pnpm check` exits 0 with 76 tests in 10 files. | Same as row 17. |
| 19 | Group 3: six tabs and the rich-text copy | 2 · Assistant to agent | The agent put the `ClipboardItem` write in `copy()` in `lib/clipboard.ts`, not in `CopyButton` as task 3.3 says, so that a Vitest case holds it. | Commits `e3c6488` and `dce02ae`. Both new `clipboard.test.ts` cases failed first. `pnpm check` exits 0 with 78 tests in 10 files. The gap is real: no test runs a real browser clipboard. Task 9.1 is the manual check. | `app/tool.tsx` is at level 2 by row 10. |
| 20 | Group 4: `rehype-parse`, `rehype-remark`, `remark-stringify`, `mammoth` | 1 · Assistant | The human approved the four packages when the change was planned (`proposal.md`). `pnpm add` is on the `ask` list of `.claude/settings.json`, and it ran in this session. The agent added no other package. | Commit `de2b960` holds `package.json`, `pnpm-lock.yaml` and the two ticks only. `pnpm check` exits 0 with 78 tests in 10 files. | A dependency is a permanent boundary. |
| 21 | Group 5: HTML to markdown, 4 of 5 scenarios | 2 · Assistant to agent | Task 5.1 needs a real Google Docs clipboard capture. The agent asked the human four times and read the clipboard five times. Each read found content from the tool page at `localhost:3033` or from another app. The agent refused to save any of it as the fixture. It committed the four other scenarios and moved to groups 6 to 8. | Commit `5ec12e1`. The four cases failed before `html.ts` existed. Tasks 5.1, 5.2 and 5.5 stay open. | `lib/` is at level 2. A fixture that is not a real capture would prove nothing about the Google Docs format. |
| 22 | Group 6: Jira to markdown | 2 · Assistant to agent | The agent ran mutants on its own parser before the commit. Two of three survived the first fixture, so the agent extended the fixture and added one case. The agent chose `***` for a Jira rule, because `---` under a text line is a markdown heading. | Commit `6b92eab`. `docs/runs/2026-09-27-jira-import-mutants.txt`: 5 mutants killed, 1 equivalent mutant stands. `pnpm check` exits 0 with 84 tests in 11 files. | `lib/` is at level 2. A green round trip alone did not prove the parser, and the mutants showed it. |
| 23 | Group 7: `.docx` to markdown | 2 · Assistant to agent | The agent made the fixture with `python-docx` through `uv`, as `design.md` says, and added a guard that proves the fixture holds an image. | Commit `03cc581`. `pnpm check` exits 0 with 102 tests in 14 files. | `lib/` is at level 2. |
| 24 | Group 8: file routing and the three page controls | 2 · Assistant to agent | The agent chose anchored patterns over an object lookup for the extension, because `x.constructor` finds `Object.prototype.constructor`. The page shows each import message in the existing alert. | Commits `9fa22e1` and `ed83bff`. `pnpm check` exits 0 with 102 tests in 14 files. | `lib/` and `app/tool.tsx` are at level 2. |
| 25 | The browser run of the page scenarios | 3 · Agent, for one run | The human asked the agent to run Playwright and to test the page itself. The agent chose a script with Playwright from the npx cache, not a project dependency, against the dev server that the human ran. The run wrote to the macOS clipboard, and the human said to keep none of it. | Commit `5bcd53a`. `docs/runs/2026-09-27-browser-run.txt`: 16 checks pass, 1 scenario not run. The first run failed 3 checks on a script bug, and the file says so. | See the raise of 2026-09-27 for the browser run below. |
| 26 | Fixes for the review of the task 9.4 fixes | 2 · Assistant to agent | The human chose four things: the stale guard moves to `lib/`, the Jira block-text ceiling goes in the spec, each fix gets its own commit, and no reviewer runs on this round. The agent chose to drop `<base>`, to fix finding 5 on the import side, to keep a Jira item open until a blank line, and to name the nested-mark ceiling of finding 7. | Commits `b820a1c` to `e29783c`, and the outcome table in `docs/reviews/2026-09-27-review-fixes.md`. `pnpm check` exits 0 with 147 tests in 14 files. `docs/runs/2026-09-27-browser-run-review-fixes.txt`: 20 passed. | `lib/` is at level 2. No reviewer read these fixes, so the proof is the tests alone. |

---

## Level changes

**The most valuable row in the log.** Without one explicit change and its reason, the log shows only
that I kept a log.

### Raise

**2026-09-20, level 1 to level 2, for `lib/` edits only.** This section used to hold one condition,
written before the code existed: the level moves to 2 for `lib/` edits when `pnpm check` exists and
stays green. Commit `8c4804a` meets that condition. `pnpm check` exists and it exits 0. The detector
is a red Vitest run in seconds. The revert is one `git checkout` of a file that nothing imports yet.

The raise is narrow on purpose. It covers `lib/transform/` and the test files beside it. The agent
edits those files without a decision for each file. It still reports the command output and the exit
code.

Everything in **Permanent boundaries** below stays at level 1, and that includes the route handler at
`app/api/**`, which `AGENTS.md` sends through plan mode first.

**2026-09-27, level 2 to level 3, for one loop run on `lib/` only.** `scripts/check-loop.mjs` gives
a headless agent the failure output, and it accepts the agent's edits with no human prompt. Three
facts made that acceptable:

- The loop is its own detector. It runs `pnpm check` after each agent turn.
- The agent cannot edit a test file or `app/api/**`. A probe proved the test-file lock before the
  run, in `docs/runs/2026-09-27-loop-lock-probe.txt`. The review re-run of 2026-09-27 found that no
  probe tested the `app/api/**` lock, and that the loop does not lock the config files.
- The agent did not commit. The revert is one `git checkout` of `lib/transform/x.ts`.

The raise covers that one run. The session agent read the diff before the commit. The agent in the
loop named a gap that its own fix left open, and the gap reproduced: a code line that fills two parts
exactly still leaves the closing fence in a part of its own. A green loop is not a complete fix.

**2026-09-27, level 2 to level 3, for one browser run.** The human wrote "run playwrigh and test all
this by yourself". The agent wrote the script, ran it twice, fixed its own locator bug, and saved the
result. Three facts made that acceptable:

- The run edits no project file. It reads the page, and it writes only to `docs/runs/`.
- The detector is the run itself: each check fails with the value it saw.
- The one side effect is the macOS clipboard, and the human accepted it.

The raise covers that run. It does not cover the two pastes that need a Google account and a Jira
account. Those stay with the human.

### Lower

None yet. The first candidate is the `.env.local` file for the email capture. A hook blocks it, and
the key must never reach the log, so that step is human work from the start.

### An escalation I chose not to make

The agent produced four valid artifacts in a row with no correction. That tempts a move to level 3.
I did not move. A good hour is not evidence that the agent behaves correctly in this repository
without supervision.

---

## Permanent boundaries

Whatever level the rest of the work runs at, these stay at level 1:

- a change to the harness itself: `.claude/settings.json`, hooks, rules files;
- a change to a dependency or to the build configuration;
- anything that touches `.env*`, a key or a secret;
- anything that reaches production or changes data.

---

## What the agent proposed, and what did not run

Numbers, not memory. Output of `node scripts/agent-log-summary.mjs` over `.agent-log/actions.jsonl`,
on 2026-09-20. The per-tool table holds 21 rows, so only the headline and the blocked list are here.

```
Agent actions: 252 executed, 14 proposed but not executed, 3 failed — 6 session(s), 2026-09-20T07:26:44.555Z .. 2026-09-20T12:02:39.689Z

Proposed but not executed (blocked by a hook, a rule or you), the five from the build session:
  2026-09-20T11:20:30.318Z  Bash  ... && rm -rf scaffold
  2026-09-20T11:21:50.391Z  Bash  pnpm add unified remark-parse remark-rehype rehype-stringify
  2026-09-20T11:37:43.140Z  ExitPlanMode
  2026-09-20T11:39:56.737Z  ExitPlanMode
  2026-09-20T11:44:46.973Z  Bash  curl ... http://localhost:3000/
```

Two cases where the agent proposed something wrong, and I stopped it:

> **10:32, the change with the wrong name.** The agent proposed `Write` into
> `openspec/changes/scaffold-grouproll-week-one/proposal.md`. GroupRoll is not this product. The name
> came from an earlier idea that the research had already replaced. The write never ran. I deleted
> the folder. The change is now `add-markdown-transform`.

> **11:20, `rm -rf` in a scratch directory.** The agent proposed
> `cd <scratch> && rm -rf scaffold && pnpm create next-app`. The `deny` list in
> `.claude/settings.json` stopped the whole command. The directory did not exist yet, so the
> `rm -rf` was pointless as well as forbidden. The agent dropped it and ran the rest. This is the
> blocked action that the pull request quotes for R4.

> **11:44 and 11:44, two `curl` commands.** I refused both. The agent then wrote a small node
> script that used `fetch`, which is the same check without a new tool. Nothing was lost.

> **A test suite that passed against broken code.** The agent lowered the LinkedIn limit from 3000
> to 300 on purpose, to record a red run for the loop script. `pnpm check` stayed green. Two cases
> asserted only an upper bound, so a limit of 300, or of 10, satisfied them. The agent found this by
> accident, reported it, and fixed both cases in commit `2a64a11` before it recorded the red run.
> The lesson holds for the whole suite: an upper bound alone proves very little.

> **A reviewer subagent that reported nothing.** The first `reviewer` run on the `lib/transform`
> diff went idle after about ten minutes and produced no output. A direct request for its findings
> got no answer either. The agent did not treat silence as an empty review. It started two fresh
> reviewers instead, and this row stays in the log, because a review that never arrived is not a
> review that found nothing.

> **Later that day, an invented requirement.** The agent recommended a file `docs/decisions.md` and
> presented it as a rubric requirement. It had invented that filename itself, one turn earlier, in
> `docs/capstone-spec.md`. I asked where the name came from. The agent traced it, admitted the
> invention, and pointed at `templates/autonomy-log.md` instead. This file is the result. Nothing in
> the course names `docs/decisions.md`.

> **2026-09-27, a loop called met with no check.** I asked whether the capstone was done. The agent
> reported loops as met. It took the status line in `docs/capstone-spec.md` on trust, and it did not
> read the script. I then asked about loops directly. The agent read `scripts/check-loop.mjs`
> against the rubric wording, "ганяє агента до зеленого", and found that the script called no agent.
> Its own header said "The loop fixes nothing." Tasks 6.9 and 6.10 exist because of this question.

> **2026-09-27, a reproduction that misread its own result.** On 2026-09-20 the table of reproduced
> findings said that the input for 1.1 never reached the LinkedIn hard cut. A replay on 2026-09-27
> showed the opposite. The sentence loop kept nothing, and the hard cut ran. The cut fell on a space,
> because the input was one character short of the defect. The finding was real, and a different
> input reaches it. The review file now carries the correction.

> **2026-09-27, five regressions in a round of fixes.** The agent fixed the 23 review findings with a
> red test first for each one, and `pnpm check` stayed green. A reviewer on those commits then found
> 13 more findings. Five were regressions that the fixes introduced. The fix for 1.5 moved every
> command of a list below the last step. The re-fenced code split dropped a leading blank line and
> could add one. Each test proved its own finding fixed, and none looked at the cases next to it. The
> agent also claimed in a code comment that the LinkedIn cut was safe under "any count". The reviewer
> showed a count where it is not. A green suite after a fix is not a review of the fix.
