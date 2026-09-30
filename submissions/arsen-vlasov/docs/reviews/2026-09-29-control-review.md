# Control review — does `spec-reviewer` catch planted defects?

- Date: 2026-09-29
- Reviewer: the `.claude/agents/spec-reviewer.md` instructions, model `sonnet`, run as `general-purpose`.
  The harness registers the agent file only at session start, so the typed subagent was not yet available.
  Note (2026-09-30): this belief was wrong. The typed subagent became available a few minutes later
  in the same session (see run 2 in the mentor-stats review).
  The prompt told the reviewer to use only Read, Grep, Glob and the read-only AIO tools.
- Maker: Claude Opus in the main session
- Input: a copy of `mentor-stats-filters.spec.ts` with four defects planted by the maker, kept outside the
  repository under a neutral name — `2026-09-29-control-spec.ts.txt`. The file was removed on
  2026-09-30. It is in commit `bded737`
- Test case: PRJ-TC-84, fetched by the reviewer from AIO

## Planted vs found

The defect list was written before the review ran: `2026-09-29-control-planted-defects.txt`, in
commit `bded737`.

| Planted | Found | Reviewer's reference |
|---|---|---|
| D1 TC id in the test title | yes | `test-naming-no-tc-ids.md`, spec:27 |
| D2 `expect` in the spec | yes | `playwright-specs-no-expect.md`, spec:48 |
| D3 `waitForTimeout(3000)` | yes | `no-hardcoded-waits.md`, spec:47. It also named the race that the wait hides |
| D4 TC step 3 removed | yes | matrix rows 3a–3c `missing`, verdict REJECT |
| step 2 weakened to `rows > 0` | yes | "partial, and vacuous. It passes when the filter is ignored" |

**4 of 4 planted defects found. Verdict: REJECT.**

Found beyond the planted set:

- TC outcome 2a, "results for the selected period", has no assertion, and the period is never set.
  This comes from the original spec, not from the planting. See the review of the real spec.
- Step 1a passes on an empty table. `shouldSeeTableColumns` exists and is not called.
- A possible whitespace flake in `shouldSeeOnlyMentor`. Marked "not verified".

The reviewer said it could not use Glob or Grep in that run and read files by known path. It also said
it did not run `npm run check`, so its lint predictions (unused imports) are marked as unverified.
