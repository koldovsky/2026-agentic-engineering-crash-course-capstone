# Tech-debt tracker

Known debt, one row per item. Add a row when you find debt that you do not fix at once. Remove the
row in the commit that fixes it. Pay the debt in small pieces.

| # | Debt | Where | Found | Evidence or next step |
|---|---|---|---|---|
| 1 | 99 specs call `linkTestCase(n)` without the AIO `caseId`. Their Allure link opens the case list, not the case | `tests/specs/**` | 2026-09-29 | `caseId` is not the key number. Ask the human for a way to map key → `caseId` (the AIO REST API needs a token decision) |
| 2 | `shouldSeeOpenQuestionsDelta` and `shouldSeeClosedQuestionsDelta` repeat the logic of `deltas.shouldSeeStatsDelta` | `page-objects/admin/tabs/mentor-stats/mentor-stats-page.ts` | 2026-09-29 | Move the PRJ-TC-34 spec to the deltas component, then remove both methods. The page is at 300 lines |
| 3 | `readStatsForMentor` reads row 0 and does not check that the row belongs to the requested mentor | same file | 2026-09-29 | Found by `spec-reviewer` (review V5) |
| 4 | The guard matches command text only. A path built from string pieces at run time passes it | `scripts/harness/guard-policy.mjs` | 2026-09-29 | The agent did this once, see `docs/logs/autonomy-log.md`. Text matching cannot catch it. An OS-level sandbox can |
| 5 | The guard also blocks a command that only names a protected path, for example a commit message about the journal | `scripts/harness/guard-policy.mjs` | 2026-09-30 | Found when the guard blocked the commit of `add-edit-hooks`. Workaround: do not write the literal path in the message. The `--no-verify` rule already ignores quoted text and heredoc bodies |
| 6 | Bash can still read `test-data/users/static/stage.json` (for example `cat`) | `scripts/harness/guard-policy.mjs` | 2026-09-30 | The provisioning flow and `git diff --numstat` name the path. A rule must tell a read from a count first |
| 7 | `git -c core.hooksPath=…` or a `git config` change can switch off the git hooks | `scripts/harness/guard-policy.mjs` | 2026-09-30 | The guard blocks only `--no-verify` and `commit -n` |
| 8 | The git hooks work only after `npm run hooks:install` on each clone | `.githooks/` | 2026-09-30 | Add a `prepare` script in `package.json`, if the human agrees that `npm install` may change the local git config |
| 9 | The project MCP servers are also registered at user scope on the author's machine | `~/.claude.json` | 2026-09-29 | Kept by the human's decision. It is not a project defect |
| 10 | ESLint has warnings, most of them `no-console` in scripts | whole repo | 2026-09-30 | 221 warnings and 0 errors on 2026-09-30. After phase 6: 287. `scripts/loop/` adds 32 `explicit-function-return-type`, a TS rule that also runs on `.mjs`. Prune with `npx eslint . --prune-suppressions` after fixes |
| 11 | `utils/` imports upward: `core` 15 times, `page-objects` 4 times, `fixtures` once | `utils/**` | 2026-09-30 | See `ARCHITECTURE.md`. No check enforces the direction yet |
| 12 | Static test users with passwords are committed | `test-data/users/static/*.json` | 2026-09-30 | Project practice. Changing it is the human's decision |
| 13 | The edit hook runs only on `Edit`, `Write` and `MultiEdit`. A file that a Bash script changes gets no check until `npm run check` | `.claude/settings.json` | 2026-09-30 | Seen on 2026-09-30: a table row added through Bash had a 26-word sentence. The linter found it, not the hook |
| 14 | `block-availability` tests 11 and 14 fail in each build. The course progress counters lag after a block is completed through the API | `utils/helpers/api-helper.ts` | 2026-09-30 | Loop 2 found the lag. Its fix broke 5 callers with `skipHomework: true`, and the human discarded it. A fix must keep those callers green. A product bug is also possible. Decide with `bug-report` |
| 15 | `mentor-stats-calculation` tests 1 and 3 fail under 4 workers. `GET /course/…/progress` gives 404 for 30 s after the first LMS visit | `tests/specs/regression/admin-panel/mentor-stats/helpers/mentor-stats-calculation.ts:57` | 2026-09-30 | Seen once in the phase 6 stage run. Not reproduced yet |
| 16 | `activity-calendar.spec.ts` failed in builds 414 and 416, but passed 5 of 5 locally with 4 workers | `tests/specs/regression/lms/courses/trading-evolution/activity-calendar/` | 2026-09-30 | Loop 1 stopped with `NOT_REPRODUCED`. The flake probably needs the load of the full Jenkins run |
