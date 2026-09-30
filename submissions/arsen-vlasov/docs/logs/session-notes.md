# Session notes

The newest block is on top. Write one block for each real work session. Each block has three fixed lines:

- **Done** — only with proof (self-test green, `npm run check` green, the spec really runs).
- **Not working / postponed** — what got stuck, and why.
- **Start from** — a specific file:line or command. If you have nothing to write here, the session is not closed.

Write the block BEFORE `/compact` or `/clear`. When you open a new session, read the top block and continue from it.

---

## 2026-09-30 (3) — chore/capstone-harness (capstone: phase 8, packaging)

- **Done:**
  - `scripts/capstone/export.mjs` with a leak gate, and `docs/capstone/README.md` (practice → evidence).
    Commits `1b0dbc7` → `a2ea93c`. The first real export stopped on 2 leaks and wrote nothing.
  - The human approved the fork and the push. The fork is
    `ArsenVlasov/2026-agentic-engineering-crash-course-capstone`, branch `arsen-vlasov`, commit
    `20b5f8d`. It holds the export of `99283f0`: 151 files, 0 leaks, 140 replacements.
  - The pull request draft is in the fork folder: `.pr-body-draft.md`. Git ignores it through
    `.git/info/exclude`. 22 of 22 links open on GitHub.
  - Proof: `npm run check` exit 0 (`harness:test` 87/87).
- **Not working / postponed:**
  - The pull request is not open. The human writes the name, the video link and the section
    «що вирішував я» first.
  - The fork has the export of `99283f0`. Newer commits are not in it. Export again before the pull request.
  - The `.gitignore` gaps are closed (`8dc0bac`). The human moved the capstone plan to `completed/` and
    removed `scripts/capstone/`, `docs/capstone/` and the two control inputs of `docs/reviews/`.
  - Postponed by the human: the merge of two rules, two MCP servers, the `power_*.sh` scripts.
  - The merge into `main`, the Jenkins step of phase 7 and the PRJ-TC-84 review are still open.
- **Start from:** ask the human if the pull request text is ready. Then:
  1. Get the export tool back from history, as files that git does not track:
     `git restore --source=8dc0bac --worktree -- scripts/capstone docs/capstone`.
  2. In the fork, remove `submissions/arsen-vlasov/`. The export does not remove old files.
  3. Run `node scripts/capstone/export.mjs --out ../2026-agentic-engineering-crash-course-capstone`.
  4. Remove the two restored folders here. Commit and push in the fork after a yes.
  5. Open the pull request with the text of the human, after a yes.
- **Traps for the next agent:**
  - The export needs a clean tree of tracked files and reads only committed files.
  - The guard blocks a command that names an env file or a static user file, also for `git check-ignore`.
  - In zsh, `path` is a special variable. A loop variable with this name breaks `PATH`.
  - The STE synonym rule allows one word per action in a file, also inside link paths. So the
    capstone README links to folders, not to the files with the skill name in the path.

---

## 2026-09-30 (2) — chore/capstone-harness (capstone: phase 6, the loop)

- **Done:**
  - Phase 6 is done. The human asked for it, chose `opus` for the inner agent, and allowed the
    `loop:stabilize` script. Status: `docs/exec-plans/active/capstone-plan.md`.
  - OpenSpec `add-stabilize-loop`: spec `e1a9540` → 27 red tests `51ace4a` → green `e292bc1`. It is
    archived. The current spec is `openspec/specs/stabilize-loop/spec.md`.
  - The flaky tests come from `lms-stage-regression-tests` builds 414–416, through `jenkins-report.mjs`.
  - Loop 1, `activity-calendar.spec.ts`: `NOT_REPRODUCED`, 5 of 5, 0 USD.
  - Loop 2, `block-availability.spec.ts` tests 11 and 14: `GREEN` after 2 attempts, 2.96 USD, 16.7 min.
    The fix was in the shared `utils/helpers/api-helper.ts`.
  - The checker (`sonnet`, read-only) gave CHANGES. A stage run of all 7 callers found 5 tests that
    the fix broke. See `docs/reviews/2026-09-30-loop2-helper-review.md`.
  - The human discarded the fix and stopped the fix loop for these tests. The agent ran `git checkout`
    on the helper. The diff stays in the loop 2 report.
  - Proof: `npm run check` exit 0 (`harness:test` 80/80, `spec/stabilize-loop` valid).
- **Not working / postponed:**
  - Phase 8 (packaging) is not started. The deadline is 2026-10-04.
  - The merge into `main` and the Jenkins step of phase 7 wait for the human.
  - The flaky tests stay as they are: tech-debt rows 14, 15 and 16.
  - The PRJ-TC-84 review verdict CHANGES is still not fixed.
- **Start from:** ask the human which task comes first. The open tasks are the same as in the block
  below: 1 merge, 2 Jenkins after the merge, 3 phase 8. For phase 8, the README can now claim the loop
  practice. The evidence is `docs/loops/index.md`, the two reports and the loop 2 review. `gh` is
  already installed and signed in as `ArsenVlasov`.
- **Traps for the next agent:**
  - The loop starts only on a clean tree of tracked files. Do not edit tracked files while a loop runs.
    Its restore step can undo them.
  - `GREEN` covers only the loop target. After a fix in a shared file, run each spec that calls it.
  - With `opus`, one attempt costs about 1.5 USD. The budget of 3 USD allows 2 attempts, not 3.
  - The traps in the block below are still true.

---

## 2026-09-30 — chore/capstone-harness (capstone: harness v2)

- **Done:**
  - Branch `chore/capstone-harness`, 35 commits on top of `main`, last `0fe4e06` plus this block. Not pushed.
  - Capstone phases 0–5 and 7 are done. Phase 6 (loop) is skipped by the human's decision.
    Status table: `docs/exec-plans/active/capstone-plan.md`, section "Status on 2026-09-30".
  - Harness v2:
    - rules live in `.claude/rules/`, and `.cursor/` is local (`npm run cursor:sync`)
    - the docs are split behind `docs/index.md`, and `ARCHITECTURE.md` and `docs/core-beliefs.md` exist
    - all harness and doc text is English and passes ASD-STE100
    - `docs:lint` and `docs:ste` run in `npm run check`
  - Hooks: `post-edit-check` (exit 2 on findings), `session-start`, git pre-commit (`npm run hooks:install`
    is done on this clone), and the guard gaps are closed.
  - PRJ-TC-69: `mentor-stats-calculation.spec.ts`, 3 tests. PRJ-6789 is not a bug: the human clarified that
    10 characters or more count (`18b4f2c`).
  - Proof: `npm run check` exit 0 (docs gates on 92 files, `harness:test` 53/53), `hooks:selftest` all passed.
- **Not working / postponed:**
  - Phase 8 (packaging) is not started. The deadline is 2026-10-04.
  - The Jenkins step of phase 7 waits for the merge into `main`. Jenkins builds only `main`.
  - Known debt: `docs/exec-plans/tech-debt-tracker.md` (13 rows).
  - The PRJ-TC-84 review verdict CHANGES (the period is not checked) is not fixed. See
    `docs/reviews/2026-09-29-mentor-stats-filters-review.md`.
- **Start from:** ask the human which task comes first. The open tasks, in order:
  1. **Merge.** The human decides. Then push `chore/capstone-harness` to `origin` (GitLab) and open a
     merge request into `main`.
  2. **Jenkins after the merge.** It needs the VPN. The variables are in `config/.env`. Run
     `node scripts/ci/jenkins-report.mjs admin-stage-regression-tests last`. The result must list
     3 more executed tests from `mentor-stats-calculation.spec.ts`. Record it in
     `docs/reviews/2026-09-29-phase7-gd-tc-69.md`, section 7.
  3. **Phase 8, packaging** (plan: `docs/exec-plans/active/capstone-plan.md`, "Phase 8"):
     1. The human installs `gh` and signs in (`brew install gh`, `gh auth login`).
     2. Fork `koldovsky/2026-agentic-engineering-crash-course-capstone`. Make the branch `arsen-vlasov`.
     3. Write an export script. It copies the harness into `submissions/arsen-vlasov/`: `.claude/`,
        `docs/`, `openspec/`, `scripts/`, `ci/`, `AGENTS.md`, `ARCHITECTURE.md`, `CLAUDE.md`, and one
        spec with its POM. It replaces company names, domains, e-mails and ids. A grep check fails on
        `acme`, `example.com`, `jira.example.com` and on tokens.
     4. Write `README.md`: a table "practice → evidence file or commit". The practices are context
        engineering, verification, maker ≠ checker, SDD (OpenSpec), the autonomy log and the hooks.
        Do not claim the loop practice.
     5. The human records a video of 1–2 minutes and writes the PR section "what I decided, what the
        agent did". The material is in `docs/logs/autonomy-log.md`.
     6. Open the PR with the course template. Do not merge it.
- **Traps for the next agent:**
  - The guard matches command text. A Bash command that names an env file, the journal path or
    `--no-verify` is blocked, even inside a commit message. Use `Edit`/`Write` for such files, and do
    not write those literals in a commit message.
  - After `Edit`/`Write` of a doc, the hook returns STE findings. Write short sentences (25 words or
    fewer), no semicolons, no phrasal verbs, and quote UI strings in «…» or backticks.
  - Add every new doc to `docs/index.md` or to its folder index, or `docs:lint` fails (orphan).
  - Baselines only go down. The pre-commit hook blocks growth.
  - After a rule edit, run `npm run cursor:sync`.
  - AIO `caseId` in a URL is not the key number. Read the key from a Chrome screenshot, or ask.

## 2026-09-15 — test/PRJ-6708_Create-methodist-role-verification-autotest

- **Done:** context-engineering audit, Phase 1-2. Hook adapters `guard-secrets` (Claude + Cursor) around `scripts/harness/guard-policy.mjs`. Journal `log-action` in `.agent-log/actions.jsonl`. The policy is wider now: `RAW_JOURNAL` blocks reads of the raw journal. `actionStrings` looks only at `file_path` for Edit/Write, so that it does not block edits of docs that mention protected paths. `npm run hooks:selftest` — 33/33, `npm run check` — 0 errors. A live block of `cat .agent-log/actions.jsonl` is proven.
- **Not working / postponed:** `.cursor/hooks.json` does not exist. The Cursor adapter works, but Cursor does not call it. In Cursor mode, `actionStrings` goes to the fallback (the payload has no `tool_name`) → the editor tools are over-blocked. Not urgent: the work happens in Claude Code.
- **Start from:** Phase 4 (subagent `spec-reviewer` to review a new spec against `.cursor/rules/*.mdc`) — as a separate PR. Or merge the current branch into main.
