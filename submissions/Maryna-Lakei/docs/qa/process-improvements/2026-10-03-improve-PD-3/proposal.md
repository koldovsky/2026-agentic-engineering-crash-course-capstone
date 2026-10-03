# Improvement Proposal: improve-PD-3

> Drafted by the process-auditor. A human approves. This audit does not edit the QA narrative.

- **Defect:** PD-3 (`docs/qa/process-defects.json`) — handoff docs still describe an older qa-verify, traceability, and trajectory state than the generated reports
- **Class / severity:** stale-evidence / P1
- **Status:** not adopted

## Scope

Bring four handoff documents into line with the generated reports that are already on disk. Do not hand-edit `docs/qa/automated-verification-latest.md`, `docs/qa/traceability-report.md`, or `docs/qa/trajectory-report.md`. Those are generated. After these sentences match the current standalone reports, re-run `node scripts/qa-verify.mjs` so the bundle embeds the same traceability and trajectory output. That re-run will still finish Fail while NFR-2 has no deploy artifact (PD-1). It is not a green G6.

These four files move together. Leaving any one of them stale keeps the contradiction.

It deliberately does not:

- Waive NFR-2 or invent `docs/qa/deploy-verification.json`.
- Add `quality/visual-parity.config.json`. Visual fidelity stays NOT-EARNED.
- Rewrite the signed acceptance verdicts. The acceptance report gains an addendum.
- Mark G6 green.

## Target file

- `docs/qa/risk-register.md` — R-3, R-5, and R-7 still describe the older reports
- `docs/qa/README.md` — the open-items bullets cite a missing slice-1 review and a blank traceability matrix that the generated report no longer shows
- `docs/qa/requirements-traceability-matrix.md` — the opening paragraph and the FR-1, FR-2, and FR-13 test cells still say the walker warning is current
- `docs/qa/mvp-acceptance-report.md` — addendum only

They cannot land separately: each one is cited as the current evidence pack.

## Exact diff

```diff
--- a/docs/qa/risk-register.md
+++ b/docs/qa/risk-register.md
@@
-| R-3 | Slice 1 (`add-request-intake`, archive `openspec/changes/archive/2026-10-02-add-request-intake/`) has no `review-findings.json`. | Medium | Medium | `docs/qa/trajectory-report.md` Result: PASS with one warning: review evidence missing for `2026-10-02-add-request-intake`. Slices 2–4 have archive `review-findings.json` files with a clean review. A later review of slice 1 would have to be a new pass; this pack does not invent that file. | Maryna Lakei | Open |
+| R-3 | Slice 1 review evidence was missing from the 2026-10-02 archive. | Medium | Medium | `docs/qa/2026-10-03-global-review.md` records `openspec/changes/archive/2026-10-02-add-request-intake/review-findings.json` written 2026-10-03, `clean` true, not backdated. `docs/qa/trajectory-report.md` lists that slice as clean and Warnings: None. `docs/qa/automated-verification-latest.md` still embeds the older missing-file warning until qa-verify is regenerated. | Maryna Lakei | Closed in the 2026-10-03 review; the qa-verify bundle is still stale |
-| R-5 | `npm run qa:verify` is not all-green. `docs/qa/automated-verification-latest.md` (finished 2026-10-02T20:25:51+03:00) records Overall result: Fail. That run saw recordings at scope 0 and no a11y or eval artifact. | High | High | Cite the later artifacts that now exist: `docs/qa/recordings-report.md` (PASS), `docs/qa/a11y-report.json` (passed), `docs/qa/eval-report.md` (4/4 at 100). Re-run `qa:verify` only when deploy, visual-fidelity policy, and factory integrity are honest. Do not treat the stale Fail file as if the later artifacts were absent, and do not treat those later artifacts as a green G6. | Maryna Lakei | Open |
+| R-5 | `npm run qa:verify` is not all-green. `docs/qa/automated-verification-latest.md` finished 2026-10-02T17:53:53.763Z and records Overall result: Fail. Recordings in that file are PASS, Scope: 5. The failure row is NFR-2 deploy-gated. | High | High | Do not cite 2026-10-02T20:25:51+03:00 or recordings scope 0 as the contents of that file. Standalone `docs/qa/traceability-report.md` and `docs/qa/trajectory-report.md` are newer than the warnings embedded in the bundle. Re-run qa-verify to refresh the bundle. A regenerated Fail is not a green G6. Do not add `quality/visual-parity.config.json`. | Maryna Lakei | Open |
-| R-7 | `docs/qa/traceability-report.md` is older than the clips. It warns that FR-1, FR-2, and FR-13 have no `@trace` in scanned trees, and it leaves every recording cell blank. | Medium | Low | Those three annotations live in `e2e/request-intake.spec.ts`. The walker does not scan `e2e/`. Current clip coverage is `docs/qa/recordings-report.md`. Regenerate the traceability report before anyone treats that file as current. | Maryna Lakei | Open |
+| R-7 | Handoff text described `docs/qa/traceability-report.md` as blank and warning on FR-1, FR-2, and FR-13. | Medium | Low | That generated report now shows those three FRs with test trace 1, recording yes, and Warnings: None. The qa-verify bundle still embeds the older warning text. Regenerate the bundle before quoting it. | Maryna Lakei | Open until the bundle is regenerated |
```

```diff
--- a/docs/qa/README.md
+++ b/docs/qa/README.md
@@
-- **Gate G6 is not fully green.** [automated-verification-latest.md](automated-verification-latest.md) was regenerated on 2026-10-02 at 20:53 Europe/Kyiv. Traceability, trajectory, and recordings passed. Acceptance artifacts then failed on the missing NFR-2 deploy report, so the battery stopped. Overall result: Fail. Visual fidelity was not reached by that run and stays NOT-EARNED. Slice 1 still has no `review-findings.json`. `.githooks/commit-msg` still drifts from `factory-lock.json`.
-- **[traceability-report.md](traceability-report.md) is earlier than the clips.** It still lists every FR recording cell as blank and warns that FR-1, FR-2, and FR-13 have no `@trace` in the directories the walker scans. The current clip check is [recordings-report.md](recordings-report.md).
+- **Gate G6 is not fully green.** [automated-verification-latest.md](automated-verification-latest.md) finished 2026-10-02T17:53:53.763Z (20:53 Europe/Kyiv). In that file, traceability, trajectory, and recordings passed (recordings Scope: 5) and acceptance artifacts failed on the missing NFR-2 deploy report, so the battery stopped. Overall result: Fail. That file still embeds an older traceability warning and a missing slice-1 review warning. The standalone [traceability-report.md](traceability-report.md) and [trajectory-report.md](trajectory-report.md) now show no warnings, and [2026-10-03-global-review.md](2026-10-03-global-review.md) records the slice-1 review file. Visual fidelity was not reached by that run and stays NOT-EARNED. `.githooks/commit-msg` still drifts from `factory-lock.json`.
+- **[traceability-report.md](traceability-report.md) is the current generated traceability result.** FR-1, FR-2, and FR-13 each have a test trace and a recording cell, and the Warnings section is None. The qa-verify bundle has not yet been regenerated to match it. Clip check: [recordings-report.md](recordings-report.md) (PASS, Scope: 5).
```

```diff
--- a/docs/qa/requirements-traceability-matrix.md
+++ b/docs/qa/requirements-traceability-matrix.md
@@
-`docs/qa/traceability-report.md` still shows a blank recording column and warns that FR-1, FR-2, and FR-13 have no `@trace` annotation in the directories the walker scans (`lib/`, `tests/`, `app/`, `src/`, `components/`, `evals/`). It does not scan `e2e/`. That report predates `docs/qa/demo-recordings/manifest.json`. Clip evidence below is `docs/qa/recordings-report.md` (Result: PASS, 5 clips, all asserted, vision met and readable).
+`docs/qa/traceability-report.md` shows a test trace and a recording for every MVP FR, including FR-1, FR-2, and FR-13, and its Warnings section is None. `docs/qa/automated-verification-latest.md` still embeds an older run that warned on those three ids. Clip evidence below is `docs/qa/recordings-report.md` (Result: PASS, 5 clips, all asserted, vision met and readable).
```

```diff
--- a/docs/qa/requirements-traceability-matrix.md
+++ b/docs/qa/requirements-traceability-matrix.md
@@
-| FR-1 | `add-request-intake` | `app/page.tsx`, `app/request-intake-form.tsx` (labeled text field “Raw business request”) | `e2e/request-intake.spec.ts` (file header `@trace FR-1`; walker does not scan `e2e/`, so `traceability-report.md` still warns) | MT-2 | Clip `01-request-intake` in `docs/qa/demo-recordings/manifest.json`. Still `docs/qa/demo-recordings/01-request-intake.png`. Axe: `docs/qa/a11y-report.json` (route `/`, 0 serious/critical) |
-| FR-2 | `add-request-intake` | `app/request-intake-form.tsx` (Generate submit control) | `e2e/request-intake.spec.ts` (`@trace FR-2` in that file; same walker warning) | MT-2 | Clip `01-request-intake`. `docs/qa/a11y-report.json` |
+| FR-1 | `add-request-intake` | `app/page.tsx`, `app/request-intake-form.tsx` (labeled text field “Raw business request”) | `e2e/request-intake.spec.ts` (file header `@trace FR-1`). `docs/qa/traceability-report.md` test trace 1, recording yes, Warnings: None | MT-2 | Clip `01-request-intake` in `docs/qa/demo-recordings/manifest.json`. Still `docs/qa/demo-recordings/01-request-intake.png`. Axe: `docs/qa/a11y-report.json` (route `/`, 0 serious/critical) |
+| FR-2 | `add-request-intake` | `app/request-intake-form.tsx` (Generate submit control) | `e2e/request-intake.spec.ts` (`@trace FR-2`). `docs/qa/traceability-report.md` test trace 1, recording yes | MT-2 | Clip `01-request-intake`. `docs/qa/a11y-report.json` |
@@
-| FR-13 | `add-request-intake` | `disabled={inFlight}` on Generate in `app/request-intake-form.tsx` | `e2e/request-intake.spec.ts` (`@trace FR-13` in that file; walker warning, same reason as FR-1) | MT-2 | Clip `01-request-intake` (Generate disabled in flight, then enabled again) |
+| FR-13 | `add-request-intake` | `disabled={inFlight}` on Generate in `app/request-intake-form.tsx` | `e2e/request-intake.spec.ts` (`@trace FR-13`). `docs/qa/traceability-report.md` test trace 1, recording yes | MT-2 | Clip `01-request-intake` (Generate disabled in flight, then enabled again) |
```

```diff
--- a/docs/qa/mvp-acceptance-report.md
+++ b/docs/qa/mvp-acceptance-report.md
@@
 Later the same day, the clarifying-questions rubric was corrected to FR-5 and FR-11. The saved live output was re-graded with no new OpenAI call: score 100, pass. The fake-model gap-questions score stayed 100, and `node scripts/check-eval-ratchet.mjs` printed Result: PASS. Record: `docs/qa/2026-10-02-clarifying-questions-rubric-correction.md`.
+
+## Post-signature addendum (2026-10-03)
+
+The signed body above cites qa-verify as finished at 2026-10-02T20:25:51+03:00 with recordings still at scope 0, and it says slice 1 has no `review-findings.json`. Those sentences are stale.
+
+- `docs/qa/automated-verification-latest.md` finished 2026-10-02T17:53:53.763Z. Recordings in that file are PASS, Scope: 5. Overall result remains Fail on NFR-2.
+- `docs/qa/trajectory-report.md` lists `2026-10-02-add-request-intake` as clean, Warnings: None.
+- `docs/qa/2026-10-03-global-review.md` records the slice-1 `review-findings.json` written that day.
+- `docs/qa/traceability-report.md` shows FR-1, FR-2, and FR-13 with test trace 1, recording yes, and Warnings: None.
+
+This addendum does not close gate G6. Deploy evidence is still missing. Visual fidelity stays NOT-EARNED.
```

## Expected metric movement

- **Metric:** `handoffClaimMismatch` (count of these four docs that contradict the generated reports)
- **Current:** 4
- **Expected after fix:** `4 -> 0`
- **Verified by:** the next retro reads the four docs against `docs/qa/traceability-report.md`, `docs/qa/trajectory-report.md`, and the Finished / Scope lines of `docs/qa/automated-verification-latest.md`. `claimDivergence.unmetContracts` stays 1 until PD-1. No movement on the handoff count means revert.

## EXECUTED red→green proof

The red condition is the contradiction already on disk. No new check script exists, so there is no fixture test to paste. Approval waits until a reviewer diffs the four files after the edit and confirms the quoted stale sentences are gone.

Observed red (verbatim, already in the files):

```text
docs/qa/risk-register.md: That run saw recordings at scope 0
docs/qa/automated-verification-latest.md: Finished: 2026-10-02T17:53:53.763Z
docs/qa/automated-verification-latest.md: Status: PASS (exit code: 0, Scope: 5)
docs/qa/traceability-report.md: ## Warnings / None.
docs/qa/trajectory-report.md: 2026-10-02-add-request-intake | clean
```

Green fixture: not executed.

## Rollback (one revert)

- **Single commit:** yes. Rollback is `git revert <sha>`.
- **State to clean up on revert:** none, unless the same commit also regenerated `docs/qa/automated-verification-latest.md`. If it did, the revert restores the previous bundle too.
- **Ladder position:** not a new check. Narrative correction only.

## Approval & trailer convention

- Human approver: Maryna Lakei · Date: 2026-10-03
- Decision: not adopted. The proposed narrative edits were not applied. No implementation diff exists, and there is no `Refs: PD-3` commit. This folder is archived so a declined proposal is not an active change.
