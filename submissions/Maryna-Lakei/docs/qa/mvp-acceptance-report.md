# MVP acceptance report

**Product:** AI Requirements Assistant  
**Prepared:** 2026-10-02 (Europe/Kyiv)  
**Requirements:** `docs/requirements.md` (owner sign-off 2026-09-30)  
**Plan:** `docs/mvp-capability-plan.md` (approved 2026-10-02)  
**Status:** Signed by Maryna Lakei on 2026-10-02 (Europe/Kyiv), accepted as written. Gate G6 is not fully green.

This report links each capability to evidence already in the repo. Recordings illustrate the flows. `docs/qa/eval-report.md` decides the graded cases. The matrix is `docs/qa/requirements-traceability-matrix.md`.

The graded eval is the factory fake model (`REQUIREMENTS_MODEL_MODE=fake`): four cases, each score 100, no OpenAI call (`evals/results/latest.json`, matched by `quality/eval-baseline.json`). This report does not claim a live OpenAI run.

## Capability verdicts

| Capability | MVP ids | Verdict for the owner to read | Evidence |
| --- | --- | --- | --- |
| `add-request-intake` | FR-1, FR-2, FR-7, FR-13; NFR-1, NFR-2 (local), NFR-5 | Local desktop behavior is evidenced. Slice 1 has no `review-findings.json`. NFR-2 deploy-gated evidence is missing. | `e2e/request-intake.spec.ts`, `lib/requirements/validation.test.ts`, clip `01-request-intake`, `docs/qa/a11y-report.json`, `docs/qa/trajectory-report.md` |
| `add-requirement-generation` | FR-3, FR-4, FR-5, FR-9, FR-10, FR-11; NFR-4 | Fake-model shape and the 30-second bound are evidenced. The eval passes. A live provider is not the graded bar in this pack. | `lib/requirements/parse-generation.test.ts`, `lib/requirements/generate.test.ts`, `e2e/requirement-generation.spec.ts`, clip `02-requirement-generation`, `docs/qa/eval-report.md` |
| `add-result-review` | FR-6, FR-12 | Labeled sections, native selection, and replacement are evidenced on the fake model. Vision met for FR-6. | `lib/requirements/result-review.test.ts`, `e2e/result-review.spec.ts`, clip `03-result-review`, `docs/qa/vision-report.json` |
| `add-generation-failure` | FR-8; NFR-3, NFR-4 | Provider-error and timeout show the failure sentence, keep the field, and leave Generate usable. The page is not a generic HTTP 500. Eval error-clarity is 100. | `lib/requirements/generation-failure.test.ts`, `e2e/generation-failure.spec.ts`, `tests/cross-slice.integration.test.ts`, clip `04-generation-failure`, `docs/qa/eval-report.md` |

## Acceptance criteria

### 1. `add-request-intake`

| Criterion (from the capability plan) | Result | Evidence |
| --- | --- | --- |
| A short non-empty request is accepted by validation | Met on the fake-model page | `e2e/request-intake.spec.ts` (single word `reports` is not rejected). Manual MT-2 |
| Empty and whitespace-only requests show an inline message and do not call the LLM | Met | `lib/requirements/validation.test.ts`; `e2e/request-intake.spec.ts`; clip `01-request-intake` (empty) and clip `05-security-negative` (whitespace). Message: `Enter a business request.` |
| Generate disables while a request is in flight | Met | `e2e/request-intake.spec.ts`; clip `01-request-intake` (FR-13) |
| English, no login, desktop | Met locally | Clip `01-request-intake` (NFR-1, NFR-2, NFR-5). `app/layout.tsx` `lang="en"`. Playwright project is Desktop Chrome / Chromium |
| Public deploy without an account | **Missing** | NFR-2 deploy-gated evidence was not produced. Deploy is Phase 7 |
| Review findings archived | **Missing for this slice** | `docs/qa/trajectory-report.md` warning on `2026-10-02-add-request-intake` |

### 2. `add-requirement-generation`

| Criterion | Result | Evidence |
| --- | --- | --- |
| One “As a / I want / so that” User Story | Met (fake model, eval 100) | Eval `eval-user-story-shape` (FR-3, FR-9). Clip `02-requirement-generation` |
| Short Acceptance Criteria bullet list | Met (eval 100) | Eval `eval-acceptance-criteria-bullets` (FR-4, FR-10). Given/When/Then is not required |
| 3 to 5 questions about gaps | Met (eval 100) | Eval `eval-clarifying-questions-unstated-gaps` (FR-5, FR-11). Notes: regions, recipient, and what counts as a sale |
| Completes or fails within 30 seconds | Met for the fake fixture and the timeout unit | Clip `02-requirement-generation` (result under 30 seconds). `lib/requirements/generation-failure.test.ts` (`@trace NFR-4`) returns timeout at 30000 ms when fake mode has no deadline override |
| API key stays off the browser bundle | Met for the automated path | Chromium specs assert no request to `api.openai.com`. Server env only (TC-2). This pack does not print a key |
| Review | Clean on the archived slice | `openspec/changes/archive/2026-10-02-add-requirement-generation/review-findings.json` |

### 3. `add-result-review`

| Criterion | Result | Evidence |
| --- | --- | --- |
| Three labeled, readable sections the BA can select | Met | `e2e/result-review.spec.ts` (triple-click selection; `user-select` is not `none`). `docs/qa/vision-report.json` met and readable for FR-6. Clip `03-result-review` |
| A second success removes the previous text | Met | `e2e/result-review.spec.ts` weekly then monthly. Clip `03-result-review` (FR-12). `tests/cross-slice.integration.test.ts` |
| No copy button, in-page editor, or separate Regenerate control | Met on the Chromium spec | `e2e/result-review.spec.ts` (BC-5) |
| Review | Clean on the archived slice | `openspec/changes/archive/2026-10-02-add-result-review/review-findings.json` |

The vision notes record a Next.js dev badge over the left of the Clarifying Questions heading in `docs/qa/vision/result-review-criteria.png` only. The judge still marked the still met and readable.

### 4. `add-generation-failure`

| Criterion | Result | Evidence |
| --- | --- | --- |
| A forced provider error shows a visible message, preserves the input, and leaves Generate usable | Met | `e2e/generation-failure.spec.ts`. Sentence: `Generation failed. You can try Generate again.` Clip `04-generation-failure`. Manual MT-3 uses `[[provider-error]]` |
| A forced timeout does the same | Met | `e2e/generation-failure.spec.ts` (alert within 10 seconds; Playwright sets `REQUIREMENTS_FAKE_DEADLINE_MS=1500`). Unit test covers the 30000 ms bound. Manual MT-4 uses `[[timeout]]` |
| No generic 500 page | Met on these paths | `e2e/generation-failure.spec.ts`, `e2e/cross-slice.spec.ts`, clip `05-security-negative`. Eval `eval-generation-failure-message` score 100 (FR-8, NFR-3) |
| A failure keeps a previous successful result | Met | `e2e/generation-failure.spec.ts`, `e2e/cross-slice.spec.ts`, clip `04-generation-failure` |
| Review | Clean on the archived slice | `openspec/changes/archive/2026-10-02-add-generation-failure/review-findings.json` |

Owner confirmation of the fake-model failure sentence, the empty-input sentence, and a later replacement: `docs/qa/2026-10-02-add-generation-failure-owner-smoke.md`.

## Cross-cutting evidence

| Check | Result | Path |
| --- | --- | --- |
| Headless clips | PASS, 5 clips, all asserted, vision met and readable | `docs/qa/recordings-report.md`, `docs/qa/demo-recordings/manifest.json` |
| Axe | Passed. Route `/`. Light and dark color schemes. 0 serious/critical. Dark is the browser color-scheme preference; the product has no dark theme | `docs/qa/a11y-report.json` (2026-10-02T20:50:00+03:00) |
| Eval | 4 pass, 0 fail, every score 100, fake model | `docs/qa/eval-report.md`, `evals/results/latest.json` (2026-10-02T20:48:00+03:00) |
| Cross-slice flow | One fake-model sequence: validate, succeed, fail without losing the result, then replace it | `tests/cross-slice.integration.test.ts`, `e2e/cross-slice.spec.ts` |
| Pixel-diff | **NOT-EARNED.** Not an approved requirement. No pixel score | — |
| Deploy | **MISSING.** Phase 7 was not done | — |
| Last `qa:verify` report | Overall result: Fail at 2026-10-02T20:25:51+03:00, before the a11y report, eval results, and clips were the current evidence | `docs/qa/automated-verification-latest.md` |

## Owner signature

Maryna Lakei accepted this report as written on 2026-10-02 (Europe/Kyiv), including the missing deploy evidence and the remaining warnings. Signing does not by itself close gate G6.

| Field | Entry |
| --- | --- |
| Owner | Maryna Lakei |
| Date (Europe/Kyiv) | 2026-10-02 |
| Signature | Accepted as written |

## Post-signature addendum

Recorded after the signature above. It does not change the signed verdicts.

On 2026-10-02 a supplemental live OpenAI eval used local `.env.local` (`gpt-4.1-mini`). The key was not recorded. The fake-model graded bar was not changed.

| Case | Live score | Verdict |
| --- | --- | --- |
| Clarifying questions | 35 | Fail. Two judges. Recipients are asked. Which regions are included, and what counts as a sale, are not. |
| User Story | 100 | Pass |
| Acceptance Criteria | 75 | Pass. Two judges (74 and 76). |
| Failure sentence | not sent | The sentence is local. `[[provider-error]]` was not sent to OpenAI. |

Detail: `docs/qa/2026-10-02-live-openai-eval.md`. This addendum does not close gate G6. Deploy evidence is still missing.

Later the same day, the clarifying-questions rubric was corrected to FR-5 and FR-11. The saved live output was re-graded with no new OpenAI call: score 100, pass. The fake-model gap-questions score stayed 100, and `node scripts/check-eval-ratchet.mjs` printed Result: PASS. Record: `docs/qa/2026-10-02-clarifying-questions-rubric-correction.md`.
