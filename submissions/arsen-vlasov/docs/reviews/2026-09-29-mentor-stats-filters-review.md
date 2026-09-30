# Review — `mentor-stats-filters.spec.ts` vs PRJ-TC-84

- Date: 2026-09-29
- Spec: `tests/specs/regression/admin-panel/mentor-stats/mentor-stats-filters.spec.ts`, as merged to `main` in `b0fff21`
- Maker: the human and Claude, in an earlier session the same day
- Reviewer, run 1: `.claude/agents/spec-reviewer.md` instructions, model `sonnet`, run as `general-purpose`.
  The harness registered the agent type only after this session started. The prompt limited the reviewer
  to Read, Grep, Glob and read-only AIO tools.

## Verdict: CHANGES

Every TC step has a code path, and the test can fail on a broken mentor filter. But the "selected
period" half of the expected results in steps 2 and 3 is never checked.

## Coverage matrix (reviewer)

| TC step | Expected outcome | Covered by | Verdict |
|---|---|---|---|
| 1 | table with statistics | `shouldSeePage` → `waitForTableLoad` checks only that `tbody` is visible (`base-table.component.ts:83`). `shouldSeeTableColumns` (`mentor-stats-page.ts:61`) is not called | partial |
| 1 | «Год с» / «Год по» / «Месяц с» / «Месяц по» | `mentor-stats-filters.component.ts:72-75`, via `shouldSeePage` | covered (by test id) |
| 1 | «Ментор» / «Кількість на сторінці» | `mentor-stats-filters.component.ts:81-82` | covered |
| 2 | only the selected mentor | `shouldSeeOnlyMentor` (`helpers/mentor-stats-filters.ts:24-31`) | covered. The helper drops rows named `null null` before the check |
| 2 | the selected period | nothing. `shouldSeeMentorRowsInRange` (`mentor-stats-page.ts:221`) is not called | **missing** |
| 3 | all mentors | `shouldSeeMultipleMentors` (`helpers/mentor-stats-filters.ts:33-36`), more than one distinct name | covered as a proxy. It depends on stage data |
| 3 | the selected period | nothing | **missing** |

## Findings beyond coverage (reviewer)

1. Row assertions read the table once, with no retry. `waitForTableLoad` returns immediately when no
   loader is in the DOM, and `tbody` is already visible from the previous data. So the rows can be read
   before the re-render. That is a false-red flake risk, not a false green. Unverified: found by reading only.
2. Locators and assertions sit in a spec helper, not in the POM. The helper duplicates `readSortRows` and
   `getCellText`. `mentor-stats-page.ts` is at 295 lines against a limit of about 300, so the code
   should move into the filters component, not the page.
3. The mentor-name comparison is not whitespace-normalised on the table side (`helpers/…:15` vs `component:94`).
4. `clearMentor` searches for a button named `/Clear/i` in a Russian-language UI. The reviewer did not check
   this against the DOM, and the code never asserts that the field is empty after clearing.
5. The reviewer found no rule violations. It checked no-expect, waits (≤30 s), naming, tags and Allure,
   and user keys, and cited a line for each.

## Checked by the maker after the review

| Reviewer claim | Checked | Result |
|---|---|---|
| Year/month filters are covered through `shouldSeePage` | `mentor-stats-page.ts:53-57` calls `filters.shouldSeeFiltersVisible()` | true |
| `shouldSeeMentorRowsInRange` is not used by this spec | grep: used only in `mentor-stats-verification.spec.ts:100` | true |
| `waitForTableLoad` skips absent loaders | `base-table.component.ts:77-83` | true |
| `mentor-stats-page.ts` is 295 lines | `wc -l` | true |

**The checker proved the maker wrong.** Before the review, the maker suspected that step 1 checked only 2 of
the 6 filters. It said so in the chat and kept it out of the reviewer's prompt. The reviewer found the
other 4 inside `shouldSeePage`, and the check above shows the same. The suspicion was wrong.

## Run 2 — the typed subagent

Once the harness registered `.claude/agents/spec-reviewer.md` (later in the same session), the same review ran as the real
`spec-reviewer` subagent. It used `sonnet` and only its declared tools: Read, Grep, Glob and the
read-only AIO tools.

**Verdict: CHANGES.** The main gap is the same as in run 1: the period in steps 2 and 3 is not checked.
It is stable across the two runs. Run 2 went further than run 1:

- Step 3 is **partial**, not covered. `> 1 distinct mentor` is weaker than "all mentors". A clear that
  returns a subset still passes. Suggested fix: compare against the baseline `preferredNames` read before
  the filter.
- It found 5 rule violations, each citing a line of the rule:
  - `admin-panel-tables.mdc:30,46`: table locators and assertions live in a spec helper.
  - `no-hardcoded-waits.mdc:30`: no `toPass` polling, so the reads can be stale.
  - `code-quality.mdc`: `'null null'` appears in three places.
  - `playwright-specs-no-expect.mdc` and `readability-for-everyone.mdc`: a bare data read outside
    `test.step`.
  - `page-objects-conventions.mdc:58`: an explanatory comment that names "TC-84".
- It noticed on its own that `utils/helpers/allure-helper.ts:8` builds the AIO URL from `caseId`. This is
  the same `linkTestCase` bug the maker found earlier in this session and moved to a separate task.

It said it had no shell and did not run the spec or `npm run check`.

**A problem in run 2.** The reviewer cited `stage.json:161` to show that the admin key exists. That
file holds test credentials: `Read` on it is in the `ask` list, and run 1 declined to open it. The
journal does not show whether this was a `Read` the human approved, or a `Grep`, which `Read(...)`
permission rules do not cover. The run took 34 minutes, against 2–3 minutes for run 1, which fits waiting
on a permission prompt. Follow-up: `.claude/agents/spec-reviewer.md` now forbids opening or searching
credential files. The permission gap for `Grep` and `Glob` goes to phase 4.

## What happens next

The human decides. The fixes need new POM code, which is a `ui-autotest` task, and a green run plus a
mutation run on stage. This review does not make them.
