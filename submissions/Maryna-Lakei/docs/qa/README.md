# Phase 6 QA proof pack

**Product:** AI Requirements Assistant  
**Owner:** Maryna Lakei  
**Written:** 2026-10-02 (Europe/Kyiv)  
**Requirements:** `docs/requirements.md` (signed off 2026-09-30)  
**Capability plan:** `docs/mvp-capability-plan.md` (approved 2026-10-02)  
**Status:** Acceptance report signed 2026-10-02 (Europe/Kyiv). Gate G6 is not fully green.

This pack indexes evidence that is already in the repo. It does not add a waiver, a pixel-parity config, or a deploy-verification file. The graded eval, headless clips, and the manual plan use the factory fake model (`REQUIREMENTS_MODEL_MODE=fake`). A later supplemental live OpenAI eval is recorded separately and does not replace that bar.

## Read in this order

| Document | What it decides |
| --- | --- |
| [requirements-traceability-matrix.md](requirements-traceability-matrix.md) | FR-1–FR-13 and NFR-1–NFR-5, each with implementation, test, and evidence, or an explicit gap |
| [manual-test-plan.md](manual-test-plan.md) | Desktop Chrome steps on the fake model: empty input, weekly success, `[[provider-error]]`, `[[timeout]]`, monthly replacement |
| [demo-script.md](demo-script.md) | The five headless clips in `demo-recordings/` |
| [risk-register.md](risk-register.md) | Open risks, including the ones that keep G6 open |
| [mvp-acceptance-report.md](mvp-acceptance-report.md) | Per-capability evidence. Signed 2026-10-02. Deploy evidence still missing |
| [eval-report.md](eval-report.md) | Graded quality bar (four cases, all 100, fake model) |
| [2026-10-02-live-openai-eval.md](2026-10-02-live-openai-eval.md) | Supplemental live OpenAI eval. Not the graded bar. Saved output re-graded at 100 after the rubric correction |
| [2026-10-02-clarifying-questions-rubric-correction.md](2026-10-02-clarifying-questions-rubric-correction.md) | Why the rubric changed, and the fake and live re-grade scores |

## Evidence this pack cites

| Evidence | Result |
| --- | --- |
| [recordings-report.md](recordings-report.md) | `check-recordings` Result: PASS. 5 clips, all asserted, vision met and readable |
| [demo-recordings/manifest.json](demo-recordings/manifest.json) | Clip ids, proof ids, video, still, explainer |
| [a11y-report.json](a11y-report.json) | Passed. axe, route `/`, light and dark color schemes, 0 serious/critical. Generated 2026-10-02T20:50:00+03:00 |
| [eval-report.md](eval-report.md) and [../../evals/results/latest.json](../../evals/results/latest.json) | 4 cases, score 100, fake model, no OpenAI call. Generated 2026-10-02T20:48:00+03:00. Matches [../../quality/eval-baseline.json](../../quality/eval-baseline.json) |
| [vision-report.json](vision-report.json) | `met: true` for FR-6. Demo stills in the manifest are also met and readable |
| [2026-10-02-add-requirement-generation-live-smoke.md](2026-10-02-add-requirement-generation-live-smoke.md) | Owner note |
| [2026-10-02-add-result-review-live-smoke.md](2026-10-02-add-result-review-live-smoke.md) | Owner note |
| [2026-10-02-add-generation-failure-owner-smoke.md](2026-10-02-add-generation-failure-owner-smoke.md) | Owner note on the fake model |

Automated tests cited from the matrix: `e2e/*.spec.ts`, `tests/cross-slice.integration.test.ts`, `lib/requirements/*.test.ts`.

## What stays open

- **NFR-2 deploy-gated evidence is missing.** Deploy is Phase 7 and was not done. There is no `docs/qa/deploy-verification.json`. Local Chromium evidence shows the page has no login step.
- **Visual fidelity / pixel-diff is NOT-EARNED.** It is not an approved requirement (`factory-lock.json` adaptation: no visual-parity config, no pixel-fidelity requirement). This pack does not state a pixel score.
- **Gate G6 is not fully green.** [automated-verification-latest.md](automated-verification-latest.md) was regenerated on 2026-10-02 at 20:53 Europe/Kyiv. Traceability, trajectory, and recordings passed. Acceptance artifacts then failed on the missing NFR-2 deploy report, so the battery stopped. Overall result: Fail. Visual fidelity was not reached by that run and stays NOT-EARNED. Slice 1 still has no `review-findings.json`. `.githooks/commit-msg` still drifts from `factory-lock.json`.
- **[traceability-report.md](traceability-report.md) is earlier than the clips.** It still lists every FR recording cell as blank and warns that FR-1, FR-2, and FR-13 have no `@trace` in the directories the walker scans. The current clip check is [recordings-report.md](recordings-report.md).
