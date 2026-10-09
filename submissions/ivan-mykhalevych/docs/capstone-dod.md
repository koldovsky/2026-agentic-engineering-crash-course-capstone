# Capstone: main instruction and Definition of Done

> Commit hashes in this file refer to the unsquashed history, kept in the git tag `full-history`
> (every red and green step). The branch holds the same content as a few phase commits.

Source: the course's mandatory assignment (translated from Ukrainian). This file is the
main instruction for the project. `docs/spec.md` and `docs/design.md` describe the
product; this file describes what must be true before we submit.

**Deadline: 4 October (inclusive).**

## The assignment

### What to do
1. Build a small project of your own, on any topic you like.
2. The stack is free: Next.js, Python, Go, Rust, a mobile app, a CLI, a bot.
3. Keep the scope modest. A small project taken through the full engineering cycle is
   better than a big one that "seems to work".
4. Apply the Agentic Engineering practices from the course, as many as are appropriate:
   - context engineering (rules / `AGENTS.md`, static vs dynamic context);
   - loop engineering instead of manual step-by-step prompting;
   - verification: tests / evals / checks instead of "it seems to work";
   - maker != checker (a separate agent or a review pass);
   - specifications up front (SDD), if appropriate.
5. Project Factory is optional (`/project-factory:init`).
6. Record a 1-2 minute video demo: briefly show the product and tell how you built it
   agentically.

How many practices and at what level is your decision. What matters is that every named
practice is visible: not "I used context engineering", but a link to the rule and to the
commit where the agent behaved differently because of it. Examples of proof are in the
course repo's `RUBRIC.md`.

### How to submit
1. Fork the capstone repository (the PR template comes with it).
2. Put the project on a separate branch of the fork (any stack). Code may also live in a
   separate repository, linked from the PR description.
3. Open a Pull Request and fill in the template:
   - name (real; it goes on the certificate);
   - link to the video demo (1-2 min);
   - description of the practices used: what you did agentically, which tools / MCPs you
     used, what you decided and what the agent decided.
4. The PR does not need to be merged; it may stay open.
5. The PR link must be submitted in the dedicated field on the course platform.

### Certificate
1. Complete the assignment.
2. Add a clickable PR link in the text field.

---

## Definition of Done

The work is done only when every box below is ticked **with a link to its evidence**.
Status as of the last update of this file.

### A. The project
- [x] A small project exists and works: Java interview trainer (3 levels, a 120-question pool
      with code snippets, 12-question random quizzes, English and Ukrainian, profiles,
      dashboard, logs). Evidence: `npm run check` 294/294 tests, `next build` OK, browser run-throughs, and
      independent QA runs (`docs/qa-plan.md`), latest `48d6a42`.
- [x] Light theme and phone-width layout checked (nice to have): light-theme contrast fix and
      mobile 375 px checks with no horizontal scroll on every page, signed out and signed in
      (`docs/qa-plan.md`: runs 2 and 3, Accounts, Gap fixes v0.23).

### B. Practices, each with clickable proof
Choose the practices that fit; each ticked one needs proof, never just a name.

- [x] **Verification (red -> green).** Red `d5be5f3` -> green `9ecbb1d` (quiz state);
      red `74b3c04` -> green `dbfb9cb` (10 questions per level); red `d27d97d` -> green
      `361332d` (mistakes review, shuffle); red `c55fbca` -> green `a612d48` (best score,
      R8); red `7781d6a` -> green `790e9d3` (code questions, R9). Command: `npm run check`.
      Honest note: `c55fbca` was committed with `--no-verify`, which the agent did without
      asking; afterwards the author approved the documented `RED_COMMIT=1` exception
      (`11d2f3e`) and `--no-verify` is forbidden in `AGENTS.md`. The two QA fixes
      (`b52b50e` spec, `19945a7` code) are UI behaviour without a unit test.
- [x] **SDD.** `docs/spec.md` and `docs/design.md`. For R6/R7 the spec change is in
      `d27d97d`, before the code in `361332d`. (The very first commit contains spec and
      first code together, so use the later commits as proof of order.)
- [x] **Context engineering.** Rules in `AGENTS.md` (KISS main rule `b9f8acd`; DoD
      read-on-demand rule `804315f`, which keeps static context small). Deterministic
      guard: `.githooks/pre-commit` (commit `024c65f`) runs `npm run check`. Blocked action,
      recorded 2026-09-30 by committing a deliberately failing test
      (`expect(1).toBe(2)`; the demo file was removed afterwards, never committed):
      ```
      pre-commit: running npm run check in submissions/ivan-mykhalevych ...
       FAIL  src/lib/zz-hook-demo.test.ts > deliberately failing
      AssertionError: expected 1 to be 2 // Object.is equality
       Tests  1 failed | 29 passed (30)
      pre-commit: check FAILED - commit blocked.     (git commit exit status 1, HEAD unchanged)
      ```
      The same hook let the real commit `024c65f` through with 29/29 tests passing.
      Red-commit exception (author's decision, after the agent once used `--no-verify` on
      `c55fbca` without asking): the hook skips the check only when `RED_COMMIT=1` is set,
      and `AGENTS.md` forbids `--no-verify`. Verified: a failing staged test gives hook exit 1
      without the variable and exit 0 with it.
- [x] **Loops.** Scripted loop `scripts/review-loop.sh` (`npm run loop -- <paths>`, `9d676e0`,
      rules in `docs/spec.md` "Development rules"): gate `npm run check` -> read-only reviewer
      (`.claude/agents/reviewer.md`) -> separate fixer agent, until the gate is green and the
      reviewer reports no high or medium findings, at most `MAX_ITER` (3) fix passes; every
      iteration is appended to `docs/loop-log.md`. Run on `src/server` (2026-10-09): iteration 1
      found a medium R26 bug (413 answered before 404/405), the fixer added a route test and the
      fix; iteration 2 PASS, gate 296/296; stopped "converged after 1 fix pass", committed as
      `db4cb3f` after my review. The first attempt aborted on an expired CLI login, so the
      script now stops when an agent call fails. Earlier manual loop: `bc0c207`.
- [x] **maker != checker.** Reviewer definition: `.claude/agents/reviewer.md` (`b47bbf8`,
      read-only tools, told to report only real findings). Run once on 2026-09-30, about
      74k subagent tokens. Honest note: the new agent file is only discovered at session
      start, so this run used a general-purpose sonnet agent instructed to follow
      `reviewer.md` exactly; in a fresh session it loads as `reviewer`.
      **What it found** (no wrong marked answers, but real issues; all verified by me):
      j5 and j8 had defensible "wrong" options (static methods are hidden, and instance
      `main` exists in newer Java), s6 "Java heap" was partly defensible, m9's correct option
      was the longest (the guessing pattern R2 targets), and `restartQuiz` was dead code
      against KISS. Fixed in `bc0c207`. Not changed: s2 (correct option merely "more
      technical", low) and m3's "never cached at all" wording (low; option is wrong either
      way). I did not independently verify the reviewer's JEP 445 timeline claim, only
      softened the wording so it holds either way.
- [x] **Independent QA (second checker).** Plan, results and findings: `docs/qa-plan.md`.
      The Chrome-extension attempt was blocked (no connected Chrome, nothing tested); the run
      in the built-in browser pane on `06509f2` passed 10/10 checks and found two low-severity
      issues, fixed afterwards (see the log).
- [x] **Accounts slice (optional, built on `feature/accounts`, merged in `8050208`).** Spec R20-R28 `7468323`; red
      then green per slice: hashing `49d1d68` -> `971ecf8`, users and sessions `c86ab08` ->
      `f85697a`, auth `26c3d4c` -> `16389d6`, data `ba1ef04` -> `65d80f8`, HTTP API `623e1be`
      -> `622e388`, client `c3218a9` -> `421f991`, review fixes `5150634` -> `a902b4b`, QA fixes
      `66b5bd2`. 279 tests. Independent security
      review and black-box QA in `docs/qa-plan.md` ("Accounts"), no high findings.
- [x] **Plan-driven gap fixes (spec v0.23).** Plan `docs/plan-gap-fixes.md` (`3dfb2ed`), red
      `test(red): guest me answer, registration limit, quiz persistence`, green `8de089d` and
      `f7bb6c4` (resume a running quiz, registration limit, guest `me` answer, saved-on-device
      notice). Browser checks and the independent QA run: `docs/qa-plan.md`, "Gap fixes v0.23".
- [ ] Optional: autonomy log (`templates/autonomy-log.md`), Project Factory. Skipped unless
      time allows.

### C. Submission
- [x] Video opens without login (YouTube oEmbed answers 200) and shows the product and how it was
      built agentically: https://youtu.be/N_428fi8u04. The local recording runs 2:12; the author
      decided this length is acceptable.
- [x] Branch pushed to the fork `Mychalevytsh/2026-agentic-engineering-crash-course-capstone`:
      `git push origin ivan-mykhalevych` ended with `de4711c..48d6a42`; push again after any new commit.
- [x] Pull Request opened from the fork with the template fully filled in: real name, video
      link, practices with proof, tools/MCPs, what I decided vs what the agent decided,
      and the verification command with its output:
      https://github.com/koldovsky/2026-agentic-engineering-crash-course-capstone/pull/14
      (open, head `Mychalevytsh:ivan-mykhalevych`, base `main`, body follows the template).
- [x] The PR description is honest: includes what went wrong or was changed along the way
      (`docs/pr-description.md`, "What went wrong or changed along the way").
- [x] PR link pasted into the course platform field, before the deadline: submitted on
      2 October 2026, the platform shows "Answer submitted. Waiting for evaluation." with
      https://github.com/koldovsky/2026-agentic-engineering-crash-course-capstone/pull/14.

### D. What gets a submission returned (avoid)
- Practices named without proof.
- A description written afterwards to fit the rubric, with no problems mentioned.
- No account of what the human decided.
- A video over 2 minutes, or without the agentic-build story.

### What the human (Ivan) decided, to record for the PR
- Chose the project idea and pivoted it to a Java interview trainer.
- Set the scope: simple, three levels, trainer not interview simulator; English first, then
  asked for Ukrainian and for the correct answer not to be guessable by length.
- Chose the dark code-editor look and a generated background.
- Reviews the question bank for accuracy. (Pending: record any corrections.)

## Profiles, dashboard and logs (built on `feature/profiles-dashboard`, merged into `ivan-mykhalevych`)

Seven spec-first slices with a red commit (`RED_COMMIT=1`) before each green commit:

| Slice | Requirement | Red | Green |
|---|---|---|---|
| 1 Profile storage logic | R10 | `29f9fce` | `7048e24` |
| 2 Profile switcher | R11 | `3673633` | `8649dd2` |
| 3 Attempt log (cap 200, per profile) | R12 | `d575b8f` | `a5c5a0d` |
| 4 Progress logic (mastery, weakest, streak) | R13 | `d03da1e` | `4a15056` |
| 5 /dashboard | R14 | `213dd25` | `13b1931` |
| 6 /logs with JSON export | R15 | `c2f875d` | `eff637f` |
| 7 Best score per profile, migration | R16 | `9e54004` | `3f1e715` |
| Review fixes (storage tests, safe removal) | R11 | `3b59998` | `e37da59` |

Then the header overflow fix `abc7fc3`. State: `npm run check` 112/112 tests, `next build` OK.
Checkers: reviewer run 2 and independent QA run 3 (12 of 13 passed, the one failure fixed and
verified), see `docs/qa-plan.md`. Logic-only slices (1, 4) had nothing to verify in the browser
when committed; they were exercised through the UI in slices 2, 3 and 5. The two review-fix
categories (header overflow, removal order) were verified by the author agent, not re-run by the
independent checker. Slice 0 (the two earlier QA findings) was already done on the PR branch as
`b52b50e` and `19945a7`, so it was not repeated.

## Question pool and Ukrainian (1 October)

Spec-first slices with red before green: question pool and no-tell rules `ec8a03b` -> `ad68e10`
(then fact-check fixes `b72e0b8`); language core and Ukrainian interface `a47ee3b` ->
`b89c982`; Ukrainian questions and topic labels `6f4bf5e` -> `4489857`; review and QA fixes
`e264fca`. Checkers: a fact-check reviewer (about 83k tokens: no wrong answers, 3 ambiguous
questions, a dozen senior questions at middle level, all fixed), a Ukrainian language reviewer
(about 113k tokens: no fidelity errors, wording issues fixed) and an independent QA run
(about 120k tokens, 36 quizzes: 9/9 areas passed, one overflow bug fixed). Details in
`docs/qa-plan.md`. Open points: the Ukrainian text has had an agent review only (the author
should read it), and the generator scripts used to produce the bank are not in the repository.
