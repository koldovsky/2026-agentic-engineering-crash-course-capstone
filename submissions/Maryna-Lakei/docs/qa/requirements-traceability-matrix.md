# Requirements traceability matrix

**Product:** AI Requirements Assistant  
**Written:** 2026-10-02 (Europe/Kyiv)  
**Source of IDs:** `docs/requirements.md`. No ID is renumbered. FR-1 through FR-13 are all present (13 rows, no gap). NFR-1 through NFR-5 are all present.

Owning capabilities are from `docs/mvp-capability-plan.md`. Recordings illustrate a case. The eval in `docs/qa/eval-report.md` decides graded quality. Manual case ids are in `docs/qa/manual-test-plan.md`.

`docs/qa/traceability-report.md` still shows a blank recording column and warns that FR-1, FR-2, and FR-13 have no `@trace` annotation in the directories the walker scans (`lib/`, `tests/`, `app/`, `src/`, `components/`, `evals/`). It does not scan `e2e/`. That report predates `docs/qa/demo-recordings/manifest.json`. Clip evidence below is `docs/qa/recordings-report.md` (Result: PASS, 5 clips, all asserted, vision met and readable).

Visual fidelity / pixel-diff is **NOT-EARNED**. It is not an approved requirement. There is no pixel score in this matrix.

## Functional requirements

| ID | Capability | Implementation | Automated test | Manual case | Evidence |
| --- | --- | --- | --- | --- | --- |
| FR-1 | `add-request-intake` | `app/page.tsx`, `app/request-intake-form.tsx` (labeled text field “Raw business request”) | `lib/requirements/request-intake-controls.test.ts` (`@trace FR-1`). Chromium coverage remains `e2e/request-intake.spec.ts` | MT-2 | Clip `01-request-intake` in `docs/qa/demo-recordings/manifest.json`. Still `docs/qa/demo-recordings/01-request-intake.png`. Axe: `docs/qa/a11y-report.json` (route `/`, 0 serious/critical) |
| FR-2 | `add-request-intake` | `app/request-intake-form.tsx` (Generate submit control) | `lib/requirements/request-intake-controls.test.ts` (`@trace FR-2`). Chromium coverage remains `e2e/request-intake.spec.ts` | MT-2 | Clip `01-request-intake`. `docs/qa/a11y-report.json` |
| FR-3 | `add-requirement-generation` | `lib/requirements/generate.ts`, `lib/requirements/parse-generation.ts`, `lib/requirements/actions.ts`, story region in `app/request-intake-form.tsx` | `lib/requirements/parse-generation.test.ts` (`@trace FR-3`), `lib/requirements/generate.test.ts`, `e2e/requirement-generation.spec.ts` | MT-2 | Eval case `eval-user-story-shape` score 100 (`docs/qa/eval-report.md`, `evals/results/latest.json`). Clip `02-requirement-generation` |
| FR-4 | `add-requirement-generation` | Same generation modules; Acceptance Criteria list in `app/request-intake-form.tsx` | `lib/requirements/parse-generation.test.ts` (`@trace FR-4`), `e2e/requirement-generation.spec.ts` | MT-2 | Eval case `eval-acceptance-criteria-bullets` score 100. Clip `02-requirement-generation` |
| FR-5 | `add-requirement-generation` | Same generation modules; Clarifying Questions list in `app/request-intake-form.tsx` | `lib/requirements/parse-generation.test.ts` (`@trace FR-5`), `evals/cases/clarifying-questions.eval.ts` (`@trace FR-5`), `e2e/requirement-generation.spec.ts` | MT-2 | Eval case `eval-clarifying-questions-unstated-gaps` score 100. Clip `02-requirement-generation` |
| FR-6 | `add-result-review` | `lib/requirements/result-review.ts` (`RESULT_SECTION_LABELS`); three labeled sections in `app/request-intake-form.tsx` | `lib/requirements/result-review.test.ts` (`@trace FR-6`), `e2e/result-review.spec.ts` (native selection) | MT-2 | `docs/qa/vision-report.json` (`met: true`, `readable: true`, requirement FR-6) and stills `docs/qa/vision/result-review-labels.png`, `docs/qa/vision/result-review-criteria.png`. Clip `03-result-review` vision met and readable |
| FR-7 | `add-request-intake` | `lib/requirements/validation.ts`, inline alert in `app/request-intake-form.tsx` | `lib/requirements/validation.test.ts` (`@trace FR-7`), `tests/cross-slice.integration.test.ts` (`@trace FR-7`), `e2e/request-intake.spec.ts`, `e2e/requirement-generation.spec.ts`, `e2e/cross-slice.spec.ts` | MT-1 | Clips `01-request-intake` and `05-security-negative`. `docs/qa/a11y-report.json`. Owner note `docs/qa/2026-10-02-add-generation-failure-owner-smoke.md` (fake model: empty input showed only “Enter a business request.”) |
| FR-8 | `add-generation-failure` | `lib/requirements/generation-failure.ts`, fake markers in `lib/requirements/generate.ts`, alert in `app/request-intake-form.tsx` | `lib/requirements/generation-failure.test.ts` (`@trace FR-8`), `tests/cross-slice.integration.test.ts` (`@trace FR-8`), `e2e/generation-failure.spec.ts`, `evals/cases/generation-failure-message.eval.ts` | MT-3, MT-4 | Eval case `eval-generation-failure-message` score 100. Clip `04-generation-failure`. Owner note `docs/qa/2026-10-02-add-generation-failure-owner-smoke.md` (fake model) |
| FR-9 | `add-requirement-generation` | `lib/requirements/parse-generation.ts` (one “As a / I want / so that” story) | `lib/requirements/parse-generation.test.ts` (`@trace FR-9`), `evals/cases/requirement-shape.eval.ts` (`@trace FR-9`), `e2e/requirement-generation.spec.ts` | MT-2 | Eval case `eval-user-story-shape` score 100. Clip `02-requirement-generation` |
| FR-10 | `add-requirement-generation` | `lib/requirements/parse-generation.ts` (short bullet list; Given/When/Then not required) | `lib/requirements/parse-generation.test.ts` (`@trace FR-10`), `evals/cases/requirement-shape.eval.ts` (`@trace FR-10`), `e2e/requirement-generation.spec.ts` | MT-2 | Eval case `eval-acceptance-criteria-bullets` score 100. Clip `02-requirement-generation` |
| FR-11 | `add-requirement-generation` | `lib/requirements/parse-generation.ts` (3 to 5 gap questions) | `lib/requirements/parse-generation.test.ts` (`@trace FR-11`), `evals/cases/clarifying-questions.eval.ts` (`@trace FR-11`), `e2e/requirement-generation.spec.ts` | MT-2 | Eval case `eval-clarifying-questions-unstated-gaps` score 100. Clip `02-requirement-generation` |
| FR-12 | `add-result-review` | `applyGenerationOutcome` in `lib/requirements/result-review.ts`; form replaces stored result on success | `lib/requirements/result-review.test.ts` (`@trace FR-12`), `tests/cross-slice.integration.test.ts` (`@trace FR-12`), `e2e/result-review.spec.ts`, `e2e/cross-slice.spec.ts` | MT-5 | Clip `03-result-review`. Owner note `docs/qa/2026-10-02-add-result-review-live-smoke.md` records an owner browser check; this pack’s graded and recorded evidence is the fake model |
| FR-13 | `add-request-intake` | `disabled={inFlight}` on Generate in `app/request-intake-form.tsx` | `lib/requirements/request-intake-controls.test.ts` (`@trace FR-13`). Chromium coverage remains `e2e/request-intake.spec.ts` | MT-2 | Clip `01-request-intake` (Generate disabled in flight, then enabled again) |

## Non-functional requirements

| ID | Capability | Implementation | Automated test | Manual case | Evidence |
| --- | --- | --- | --- | --- | --- |
| NFR-1 | Every slice; first visible in `add-request-intake` | `app/layout.tsx` (`lang="en"`), English labels in `app/request-intake-form.tsx` | `e2e/request-intake.spec.ts`, `e2e/cross-slice.spec.ts` (English accessible names) | MT-2 | Clip `01-request-intake` proof list includes NFR-1. `docs/qa/recordings-report.md` |
| NFR-2 | `public-demo`, honored by `add-request-intake` | No login module (TC-3). `app/page.tsx` renders the form with no account gate | Local: `e2e/request-intake.spec.ts`, `e2e/cross-slice.spec.ts` (no sign-in copy). **Deploy-gated evidence is missing** | MT-2 (local only) | Local clips `01-request-intake` and `05-security-negative`. **Deploy-gated artifact is MISSING** because deploy is Phase 7 and was not done. No deploy-verification file is part of this pack |
| NFR-3 | `add-generation-failure` | `lib/requirements/generation-failure.ts` sentence “Generation failed. You can try Generate again.”; form catch maps thrown failures to that sentence; page stays on `/` | `lib/requirements/generation-failure.test.ts` (`@trace NFR-3`), `tests/cross-slice.integration.test.ts` (`@trace NFR-3`), `e2e/generation-failure.spec.ts`, `e2e/cross-slice.spec.ts`, `evals/cases/generation-failure-message.eval.ts` | MT-1, MT-3, MT-4 | Eval case `eval-generation-failure-message` score 100 (explicit provider-error, not an HTTP 500). Clips `04-generation-failure` and `05-security-negative` |
| NFR-4 | `add-requirement-generation` and `add-generation-failure` | `GENERATION_DEADLINE_MS` is 30000 in `lib/requirements/generate.ts`. Fake mode may shorten the hang with `REQUIREMENTS_FAKE_DEADLINE_MS` | `lib/requirements/generation-failure.test.ts` (`@trace NFR-4`; `[[timeout]]` returns timeout at 30000 when the override is absent), `tests/cross-slice.integration.test.ts` (`@trace NFR-4`), `e2e/generation-failure.spec.ts` (alert within 10s while the Playwright server sets the fake deadline to 1500) | MT-2, MT-4 | Clip `02-requirement-generation` asserts the weekly result within 30 seconds. The 30-second timeout bound is the unit test, not a live provider hang |
| NFR-5 | `add-request-intake` | Desktop page in `app/page.tsx` (`max-w-3xl`). Playwright project is Chromium / Desktop Chrome only (`playwright.config.ts`, TC-8) | `e2e/request-intake.spec.ts` on the Chromium project | MT-2 in desktop Chrome | Clip `01-request-intake` recorded at a fixed 1280×800 viewport. Cross-browser testing is out of scope |

## Graded eval (decides; clips illustrate)

`evals/results/latest.json` (2026-10-02T20:48:00+03:00): four cases, all score 100, all pass, threshold 70, fake model, no OpenAI call. `quality/eval-baseline.json` matches those four dimension scores (gap-questions, story-shape, acceptance-criteria, error-clarity). Narrative: `docs/qa/eval-report.md`.

| Case | Proves | Score |
| --- | --- | --- |
| `eval-clarifying-questions-unstated-gaps` | FR-5, FR-11 | 100 pass |
| `eval-user-story-shape` | FR-3, FR-9 | 100 pass |
| `eval-acceptance-criteria-bullets` | FR-4, FR-10 | 100 pass |
| `eval-generation-failure-message` | FR-8, NFR-3 | 100 pass |

## Accessibility and vision

- `docs/qa/a11y-report.json`: status `passed`, tool `@axe-core/playwright`, tags `wcag2a` and `wcag2aa`, route `/`, schemes `light` and `dark`, `seriousOrCritical` 0. The product has no dark theme (BC-5). The dark run is the browser color-scheme preference used by the locked axe script.
- `docs/qa/vision-report.json`: FR-6 met and readable on 2026-10-02. The notes record a Next.js dev badge overlapping the left of the Clarifying Questions heading in `docs/qa/vision/result-review-criteria.png` only.
- Each of the five demo stills is `vision.met: true` and `vision.readable: true` in `docs/qa/demo-recordings/manifest.json`.

## Explicit non-rows

| Item | Reason |
| --- | --- |
| Pixel-diff / visual fidelity | Not an approved FR or NFR. Status **NOT-EARNED**. No pixel score is recorded |
| NFR-2 on a public host | Deploy-gated evidence **MISSING**. Phase 7 was not done |
| Live OpenAI eval | Not in this pack. The four eval cases use the fake model |
