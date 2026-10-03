# Current State

> Persistent handoff file for future agent windows. A quick map, not a
> replacement for source-of-truth artifacts. Always verify with OpenSpec,
> tests, and the repo.

## Last Updated

- **Date and time:** 2026-10-03 13:34:00 (Europe/Kyiv)
- **Current phase:** Phase 7, release documentation in the working tree, not yet the final release commit.
- **Last completed gate:** none
- **Active change:** none. The four capability slices stay archived. Closed improvement proposals are in `docs/qa/process-improvements/`, not in the slice archive.
- **Progress:** Production is deployed. Evidence: `docs/qa/deploy-verification.json` and commit `47800573915f20c69a4df89ae4218d606d919f14` (`Refs: PD-1`). The trajectory evaluation is accepted as a retrospective reading of the existing git history. It is not a product defect, and the commits were not rewritten. Visual fidelity stays NOT-EARNED. `quality/visual-parity.config.json` is absent.
- **Next task:** Push is not done. Do not rewrite, squash, split, or amend commits to raise trajectory scores. Do not add `quality/visual-parity.config.json`. Do not amend `10269e4`. Do not apply PD-3, PD-4, or PD-5. Do not apply the `npm audit fix --force` downgrade for the `braces` advisory (R-9).
- **Claims:**
  - Claims dated 2026-10-02 that say NFR-2 deploy evidence is missing, or that PD-2 still needs an owner decision, describe that day's pack. The 2026-10-03 claims below are the later evidence.
  - Production deploy — evidence: `docs/qa/deploy-verification.json` (`status` passed, `verifiedAt` 2026-10-03T13:15:56+03:00). URL https://ai-requirements-assistant-umber.vercel.app. Vercel project `marynalakei-png/ai-requirements-assistant`. Deployment `dpl_rGZG9Z5czhWLhWrPdAyv3fNLK24u`. HTTP 200, `loginWall` false. Smoke request produced one user story, 5 acceptance criteria, and 5 clarifying questions. Input preserved. `failureMessageShown` false. Browser hosts: only that production host. `secretMaterialInPage` false. Commit `47800573915f20c69a4df89ae4218d606d919f14` with trailer `Refs: PD-1`. `node scripts/check-deploy.mjs` on 2026-10-03 exited 0 and printed that URL.
  - Production env names — evidence: `productionEnv` in `docs/qa/deploy-verification.json`. `LLM_API_KEY` is `set-as-secret-value-not-recorded` (Vercel Production secret; the value is not copied). `LLM_MODEL` is `gpt-4.1-mini`. `REQUIREMENTS_MODEL_MODE` is `unset`.
  - PD-2 applied — evidence: commit `10269e4839fe4b42c05e88ef340b702ad332d012` (`Refs: PD-2`). Record `docs/qa/process-improvements/2026-10-03-improve-PD-2/`. `docs/qa/process-defects.json` status `resolved`. `node scripts/check-factory-integrity.mjs` on 2026-10-03 printed `Result: PASS, 1 warning(s)` about `core.hooksPath`. Git config was not changed.
  - PD-3, PD-4, PD-5 not adopted — evidence: status `not adopted` on each proposal under `docs/qa/process-improvements/2026-10-03-improve-PD-3/`, `docs/qa/process-improvements/2026-10-03-improve-PD-4/`, and `docs/qa/process-improvements/2026-10-03-improve-PD-5/`, and the same status in `docs/qa/process-defects.json`. `scripts/ledger-report.mjs` and `scripts/qa-verify.mjs` were not edited for them.
  - Trajectory evaluation accepted — evidence: `docs/qa/trajectory-eval-report.md` and `evals/results/trajectory-latest.json`, generated 2026-10-03T10:30:07Z. Owner acceptance 2026-10-03: honest assessment of the existing git history. All four slices fail process-order because tests and implementation were committed together. `add-request-intake` also fails in-scope because the initial factory scaffold was included in `5733b56`. These are retrospective process findings, not product defects. No commit was rewritten, squashed, split, or amended, and product behavior was not changed to raise the scores.
  - Visual fidelity NOT-EARNED — evidence: `node scripts/check-visual-fidelity.mjs` on 2026-10-03 printed `Result: NOT-EARNED` because `quality/visual-parity.config.json` is absent. `factory-lock.json` adaptation `no visual-parity config: no pixel-fidelity requirement`.
  - Release documentation — evidence: `docs/technical/`, `docs/estimation.md`, `docs/delivery-report.md`. Effort is commit timestamps only (`docs/estimation.md`). No hour total.
  - PD-6 resolved — evidence: `docs/qa/process-defects.json` status `resolved`. The fix is this release commit of the governed tree. No check script changed. `npm audit` `braces` advisory is R-9 in `docs/qa/risk-register.md`. The dependency downgrade was not applied.
  - Plan approved — evidence: `docs/mvp-capability-plan.md` status line
  - Red run before generation code — evidence: `npm run test:run` failed with `Cannot find module './parse-generation'` and `Cannot find module './generate'`; Chromium success test failed because `user-story` was absent. Existing validation tests stayed green (13).
  - Unit tests green — evidence: `npm run test:run` on 2026-10-02 16:23 Europe/Kyiv, 36 passed
  - Chromium tests green — evidence: `npm run test:e2e` on 2026-10-02 16:23 Europe/Kyiv, 8 passed
  - Lint and build green — evidence: `npm run lint` exit 0 (3 unused-var warnings in tests) and `npm run build` exit 0 on 2026-10-02 16:23 Europe/Kyiv
  - OpenSpec strict validate passed — evidence: `add-requirement-generation` and `--all`
  - Review clean — evidence: `openspec/changes/archive/2026-10-02-add-requirement-generation/review-findings.json` (`clean: true`). Security and spec auditors reported no findings. One state bug was fixed: a new submit clears the previous failure reason.
  - Browser smoke with the fake model — evidence: desktop Chromium at http://127.0.0.1:3000 on 2026-10-02, server started with `REQUIREMENTS_MODEL_MODE=fake` and `LLM_API_KEY` unset. Empty and whitespace showed "Enter a business request." and left Generate enabled. A non-empty request disabled Generate, then showed the fixture story, two criteria, and three questions. The field value remained. No login, no copy control, no Regenerate, no section headings, HTTP 200, and no request to api.openai.com (server log: local POST only).
  - Slice archived — evidence: `openspec/changes/archive/2026-10-02-add-requirement-generation/`
  - Live OpenAI check — evidence: `docs/qa/2026-10-02-add-requirement-generation-live-smoke.md`. Owner report on 2026-10-02: a real business request in the browser returned one User Story, Acceptance Criteria, and 5 Clarifying Questions. The key stayed in local `.env.local`.
  - Result-review unit tests green — evidence: `npm run test:run` on 2026-10-02, 49 passed
  - Result-review Chromium tests green — evidence: `npm run test:e2e` on 2026-10-02, 11 passed
  - Result-review review clean — evidence: `openspec/changes/archive/2026-10-02-add-result-review/review-findings.json` (`clean: true`)
  - Result-review browser smoke — evidence: desktop Chromium at http://127.0.0.1:3000 on 2026-10-02 with `REQUIREMENTS_MODEL_MODE=fake`. Empty and whitespace showed "Enter a business request." and no result headings. The weekly request showed the three headings and the weekly fixture, with the story text selected. The monthly-budget request replaced it: the weekly sentence was gone and the finance-lead story, two criteria, and three questions were shown. Generate was the only action button. Local HTTP 200 only.
  - Vision pass — evidence: `docs/qa/vision-report.json` (`met: true`) and stills in `docs/qa/vision/`
  - Slice archived — evidence: `openspec/changes/archive/2026-10-02-add-result-review/`
  - Live result-review check — evidence: `docs/qa/2026-10-02-add-result-review-live-smoke.md`. Owner report on 2026-10-02: the first live Generate showed User Story, Acceptance Criteria, and Clarifying Questions. Without a reload, a changed source request and a second Generate replaced that result. Only the new three sections remained.
  - Generation-failure red run — evidence: before sections 2–4, `npm run test:run` had 5 failed and 51 passed because `lib/requirements/generation-failure.ts` did not exist and fake mode still returned the weekly fixture for `[[provider-error]]` and `[[timeout]]`. `npm run test:e2e` had 3 failed and 11 passed because the failure sentence was absent. The timeout Chromium test hit its 10 second cap. Empty, whitespace, weekly, and monthly tests stayed green.
  - Generation-failure unit tests green — evidence: `npm run test:run` on 2026-10-02, 56 passed
  - Generation-failure Chromium tests green — evidence: `npm run test:e2e` on 2026-10-02, 14 passed
  - Generation-failure lint and build green — evidence: `npm run lint` exit 0 (5 existing unused-variable warnings in tests) and `npm run build` exit 0 on 2026-10-02
  - OpenSpec strict validate passed — evidence: `add-generation-failure` and `--all` (6 passed)
  - Generation-failure review clean — evidence: `openspec/changes/archive/2026-10-02-add-generation-failure/review-findings.json` (`clean: true`). Code review, security review, and spec audit each returned no findings. Spec coverage: 5 scenarios implemented.
  - Slice archived — evidence: `openspec/changes/archive/2026-10-02-add-generation-failure/`
  - Generation-failure browser smoke — evidence: desktop Chromium against http://127.0.0.1:3000 on 2026-10-02 18:39 Europe/Kyiv. The server was started with `REQUIREMENTS_MODEL_MODE=fake`, `REQUIREMENTS_FAKE_DEADLINE_MS=1500`, and `LLM_API_KEY` empty. Empty and whitespace showed only "Enter a business request." and left Generate enabled. The weekly request showed the three headings and the weekly fixture, with no failure sentence. `[[provider-error]]` showed the failure sentence in an alert after 1321 ms, left the field unchanged, re-enabled Generate, and kept the weekly story. `[[timeout]]` did the same after 1827 ms. The monthly-budget request then replaced the weekly story with the finance-lead fixture and cleared the failure sentence. No Internal Server Error. Request hosts were only 127.0.0.1:3000.
  - Owner generation-failure check — evidence: `docs/qa/2026-10-02-add-generation-failure-owner-smoke.md`. Owner report on 2026-10-02, factory fake model: the provider-error and timeout scenarios each showed "Generation failed. You can try Generate again."; empty input showed only "Enter a business request."; a later normal request showed a new User Story, Acceptance Criteria, and Clarifying Questions and replaced the previous result. No API key was used.
  - Cross-slice integration — evidence: `tests/cross-slice.integration.test.ts`. `npm run test:integration` on 2026-10-02, 1 passed. Fake model only. No database and no API key.
  - Cross-slice Chromium flow — evidence: `e2e/cross-slice.spec.ts`. `npm run test:e2e` on 2026-10-02 20:28 Europe/Kyiv, 15 passed.
  - Coverage baseline — evidence: `quality/coverage-baseline.json`. `npm run test:coverage` then `node scripts/check-coverage-ratchet.mjs --update`, then a compare run printed Result: PASS. Lines 67.08, statements 66.66, functions 72.97, branches 69.74. Uncovered on purpose for this run: `lib/requirements/actions.ts` and `lib/requirements/openai-client.ts`, which the unit suite does not execute because it must not call OpenAI.
  - Gate status — evidence: `node scripts/gate-status.mjs` on 2026-10-02. G5 PASS (coverage). Overall Result: FAIL because G4, G6, and G7 include acceptance artifacts, recordings, evals, visual fidelity, and factory integrity.
  - qa:verify on 2026-10-02 20:53 Europe/Kyiv — evidence: `docs/qa/automated-verification-latest.md`. Overall result: Fail. Traceability, trajectory, and recordings passed. Acceptance artifacts failed only on missing NFR-2 deploy verification, and the battery stopped there.
  - Phase 6 recordings — evidence: `docs/qa/demo-recordings/manifest.json`. `node scripts/check-recordings.mjs` Result: PASS, 5 clips, asserted, vision met and readable. Desktop only.
  - Phase 6 accessibility — evidence: `docs/qa/a11y-report.json`. axe on `/`, light and dark color schemes, 0 serious or critical violations. No dark theme was added.
  - Phase 6 eval — evidence: `docs/qa/eval-report.md` and `evals/results/latest.json`. Four fake-model cases, each scored 100 by a fresh judge. No OpenAI call. `quality/eval-baseline.json` matches. `node scripts/check-eval-ratchet.mjs` Result: PASS.
  - QA proof pack — evidence: `docs/qa/README.md`, `requirements-traceability-matrix.md`, `manual-test-plan.md`, `demo-script.md`, `risk-register.md`, `mvp-acceptance-report.md`. Owner signature: accepted as written on 2026-10-02 (Europe/Kyiv).
  - Supplemental live OpenAI eval — evidence: `docs/qa/2026-10-02-live-openai-eval.md` and `evals/results/live-openai.json`. Model `gpt-4.1-mini`. Key not recorded. Story-shape 100. Acceptance-criteria 75. Failure sentence not sent to OpenAI.
  - Clarifying-questions rubric correction — evidence: `docs/qa/2026-10-02-clarifying-questions-rubric-correction.md`. Fake re-grade 100 (`82dbea44-e8c8-4ee8-a275-66b902023b54`). Saved live re-grade 100 (`73dee2e3-fc03-49bd-aad9-2a36951ee267`). No new OpenAI call. `node scripts/check-eval-ratchet.mjs` Result: PASS. Production prompt unchanged.

## Source Of Truth

1. `docs/requirements.md` — signed off 2026-09-30.
2. `docs/product-brief.md` — product narrative.
3. `docs/adr/` — ADR-0001 stack, ADR-0002 context budget, ADR-0003 OpenAI `gpt-4.1-mini`.
4. `docs/mvp-capability-plan.md` — approved 2026-10-02.
5. `docs/current-state.md` — this handoff.
6. `docs/technical/`, `docs/estimation.md`, `docs/delivery-report.md` — release map. They do not replace the requirements or the deploy file.

## OpenSpec Status

Five baseline specs. Active changes: none. Archived slices: `2026-10-02-add-request-intake`, `2026-10-02-add-requirement-generation`, `2026-10-02-add-result-review`, `2026-10-02-add-generation-failure`. Closed proposals, kept out of the slice archive: `docs/qa/process-improvements/` (`improve-PD-1` applied, `improve-PD-2` applied, `improve-PD-3` through `improve-PD-5` not adopted).

## Completed Changes

- `add-request-intake`
- `add-requirement-generation`
- `add-result-review`
- `add-generation-failure`

## Validation Commands

From `submissions/Maryna-Lakei/`: `npm run lint`, `npm run test:run`, `npm run test:e2e`, `npm run build`, `npx --yes @fission-ai/openspec@latest validate --all --strict`.

## Environment / Deployment

- Production URL: https://ai-requirements-assistant-umber.vercel.app. Vercel project `marynalakei-png/ai-requirements-assistant`. Deployment `dpl_rGZG9Z5czhWLhWrPdAyv3fNLK24u`. Evidence: `docs/qa/deploy-verification.json`.
- `LLM_API_KEY` is a Vercel Production secret. `LLM_MODEL` is `gpt-4.1-mini`. `REQUIREMENTS_MODEL_MODE` is unset in production. Fake mode is tests only. Do not read, print, or commit `.env.local`.
- No database, auth, email, or payments (TC-3).
- Project directory: `submissions/Maryna-Lakei/` on branch `capstone-project`. Course root files (`README.md`, `RUBRIC.md`, `.github/PULL_REQUEST_TEMPLATE.md`) stay untouched.
- As of 2026-10-03 13:26 Europe/Kyiv, `HEAD` was `47800573915f20c69a4df89ae4218d606d919f14` and the stored upstream `origin/capstone-project` was `10269e4839fe4b42c05e88ef340b702ad332d012`. No fetch was run. The final release commit and push are not done.

## Agent Rules / Gotchas

- Scope and the capability plan are approved. All four slices are archived. Phase 7 release documentation is in the working tree and is not the final release commit. Visual fidelity stays NOT-EARNED. Do not add `quality/visual-parity.config.json`. Do not amend commit `10269e4`. Do not apply PD-3, PD-4, or PD-5. Do not rewrite history to improve trajectory process-order or intake in-scope scores. Those findings stay as written in `docs/qa/trajectory-eval-report.md`.
- This MVP has no database and no accounts (TC-3). Do not add a seed helper, login tests, or a pixel-parity config to force a later gate green.
- **Last completed gate** in this file stays `none`. Do not write G7 or any gate id as completed.
- Do not renumber FR/NFR/TC/BC ids.
- Do not archive OpenSpec changes before implementation and smoke test.
