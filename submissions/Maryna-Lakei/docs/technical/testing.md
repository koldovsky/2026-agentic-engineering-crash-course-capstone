# Testing

Verification is Vitest and Playwright (TC-4). Specs are OpenSpec (TC-5). Automated browsers are Chromium only (TC-8). There is no database smoke (TC-3). This documentation pass did not re-run the suite. Counts below are the recorded artifacts, not a new run.

## Layers

| Layer | Command | Files | Model |
| --- | --- | --- | --- |
| Unit | `npm run test:run` | `lib/**/*.test.ts` (`vitest.config.ts`) | Fake, or pure functions with no network |
| Coverage ratchet | `npm run test:coverage` then `node scripts/check-coverage-ratchet.mjs` | Same include, excludes `*.test.ts` | Same. `lib/requirements/actions.ts` and `lib/requirements/openai-client.ts` stay outside the unit path so the suite does not call OpenAI |
| Integration | `npm run test:integration` | `tests/cross-slice.integration.test.ts` | `REQUIREMENTS_MODEL_MODE=fake`, `LLM_API_KEY` deleted, `fetch` rejected |
| End to end | `npm run test:e2e` | `e2e/*.spec.ts`, project `chromium`, Desktop Chrome (`playwright.config.ts`) | Fake, empty key, fake deadline 1500 ms |
| Graded eval | `node scripts/check-eval-ratchet.mjs` | `evals/cases/*.eval.ts`, bar in `quality/eval-baseline.json` | Fake. Report: [docs/qa/eval-report.md](../qa/eval-report.md) |

Playwright starts `npm run dev -- --port 3000` at `http://127.0.0.1:3000` and does not reuse an existing server (`playwright.config.ts`).

## What each area locks

| Behavior | Automated evidence |
| --- | --- |
| Empty and whitespace show `Enter a business request.` and do not call the model | `lib/requirements/validation.test.ts`, `e2e/request-intake.spec.ts` |
| Field, Generate, and in-flight disable | `lib/requirements/request-intake-controls.test.ts` (`@trace` FR-1, FR-2, FR-13), `e2e/request-intake.spec.ts` |
| Story, criteria, and question shape | `lib/requirements/parse-generation.test.ts`, `e2e/requirement-generation.spec.ts` |
| Labeled sections and replacement | `lib/requirements/result-review.test.ts`, `e2e/result-review.spec.ts` |
| Failure sentence, field kept, Generate usable, no generic 500 | `lib/requirements/generation-failure.test.ts`, `e2e/generation-failure.spec.ts` |
| One sequence across those behaviors | `tests/cross-slice.integration.test.ts`, `e2e/cross-slice.spec.ts` |

The matrix maps every FR and NFR to a test and a manual case: [docs/qa/requirements-traceability-matrix.md](../qa/requirements-traceability-matrix.md). Manual steps: [docs/qa/manual-test-plan.md](../qa/manual-test-plan.md). Its NFR-2 deploy cell still says the artifact is missing. The later artifact is [docs/qa/deploy-verification.json](../qa/deploy-verification.json). PD-3 was not adopted, so the matrix text was not edited in this pass.

## Evals and recordings

The factory bar is four fake-model cases, each score 100, pass mark 70 ([docs/qa/eval-report.md](../qa/eval-report.md), `evals/results/latest.json`). Recordings illustrate those flows. They do not replace the eval. Five desktop clips, each asserted: [docs/qa/demo-recordings/manifest.json](../qa/demo-recordings/manifest.json). There is no mobile clip.

A supplemental live grade on 2026-10-02 is [docs/qa/2026-10-02-live-openai-eval.md](../qa/2026-10-02-live-openai-eval.md). Story-shape 100, acceptance-criteria 75, clarifying questions 100 after a rubric correction with no new OpenAI call. That file does not move `quality/eval-baseline.json`.

## Other checks

| Check | Record |
| --- | --- |
| Axe on `/`, light and dark color schemes, 0 serious or critical | [docs/qa/a11y-report.json](../qa/a11y-report.json). No dark theme was added (BC-5) |
| Vision for FR-6 | [docs/qa/vision-report.json](../qa/vision-report.json) |
| Coverage floor | `quality/coverage-baseline.json`: lines 67.08, statements 66.66, functions 72.97, branches 69.74 |
| Deploy artifact | `node scripts/check-deploy.mjs` exited 0 on 2026-10-03. See [operations](operations.md) |
| Visual fidelity | `node scripts/check-visual-fidelity.mjs` printed `Result: NOT-EARNED` on 2026-10-03. Not an approved requirement. No pixel config |
| Latest full battery file | [docs/qa/automated-verification-latest.md](../qa/automated-verification-latest.md), finished 2026-10-02, overall Fail, stopped at acceptance-artifacts. Not regenerated after the deploy |

## What the suite does not claim

It does not call OpenAI. It does not prove Safari or Firefox. It does not measure pixel parity. A green unit run is not a production smoke. The production smoke is the deploy file, one request, on 2026-10-03.
