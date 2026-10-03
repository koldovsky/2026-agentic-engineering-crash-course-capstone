# Delivery report

**Product:** AI Requirements Assistant  
**Audience:** Maryna Lakei, owner, and the next reader of the capstone  
**Written:** 2026-10-03 (Europe/Kyiv)  
**Requirements:** [docs/requirements.md](requirements.md), signed off 2026-09-30  
**Plan:** [docs/mvp-capability-plan.md](mvp-capability-plan.md), approved 2026-10-02  
**Status of this report:** Included in the Phase 7 release commit. Push is not done. Last completed gate in [docs/current-state.md](current-state.md) stays `none`.

## Executive summary

The demo is one public desktop page. A Business Analyst pastes a raw business request, clicks Generate, and reads a User Story, Acceptance Criteria, and Clarifying Questions. There are no accounts, no database, no email, and no payments (TC-3).

Production is up. On 2026-10-03 the page at https://ai-requirements-assistant-umber.vercel.app returned HTTP 200 with no login wall. One live Generate succeeded: one user story, 5 acceptance criteria, 5 clarifying questions, the input left in the field, and no failure sentence. The browser contacted only that host. No secret was in the page. Evidence: [docs/qa/deploy-verification.json](qa/deploy-verification.json). Commit `47800573915f20c69a4df89ae4218d606d919f14` (`Refs: PD-1`).

This report is part of the Phase 7 release commit. Push is not done. Visual fidelity is NOT-EARNED. `quality/visual-parity.config.json` was not added. `npm audit --audit-level=high` still reports the `braces` advisory (GHSA-vfj7-8cjw-p6xm) through ESLint. The suggested dependency downgrade was not applied. See R-9 in [docs/qa/risk-register.md](qa/risk-register.md).

The trajectory evaluation is accepted as an honest reading of the existing git history. All four slices fail process-order because tests and implementation were committed together. The intake slice also fails in-scope because commit `5733b56` included the initial factory scaffold. Those are retrospective process findings, not product defects. No historical commit was rewritten, squashed, split, or amended, and product behavior was not changed to raise the scores. Evidence: [docs/qa/trajectory-eval-report.md](qa/trajectory-eval-report.md).

## What shipped

| Slice | Commit | Owns |
| --- | --- | --- |
| `add-request-intake` | `5733b56` | FR-1, FR-2, FR-7, FR-13 |
| `add-requirement-generation` | `e986fcf` | FR-3, FR-4, FR-5, FR-9, FR-10, FR-11, NFR-4 |
| `add-result-review` | `cd6567d` | FR-6, FR-12 |
| `add-generation-failure` | `e53db6c` | FR-8, NFR-3 |
| Phase 5 checks | `dd07d6c` | Coverage floor, cross-slice tests |
| Phase 6 QA pack | `975a6d2` | Recordings, eval, signed acceptance report |
| PD-2 lock reseal | `10269e4` | `Refs: PD-2` |
| PD-1 deploy evidence | `4780057` | `Refs: PD-1` |

Full hashes and timestamps: [docs/estimation.md](estimation.md). Behavior: [docs/technical/workflows.md](technical/workflows.md).

## Requirement traceability

Ids are only those in [docs/requirements.md](requirements.md). The cell-level matrix is [docs/qa/requirements-traceability-matrix.md](qa/requirements-traceability-matrix.md). Graded quality is [docs/qa/eval-report.md](qa/eval-report.md) (fake model, four cases, each 100). Recordings illustrate. They do not decide the eval.

| IDs | High-level result | Evidence |
| --- | --- | --- |
| FR-1, FR-2, FR-13 | Field, Generate, disabled while in flight | `app/request-intake-form.tsx`, `lib/requirements/request-intake-controls.test.ts`, clip `01-request-intake` |
| FR-7 | Empty or whitespace shows `Enter a business request.` and does not call the model | `lib/requirements/validation.ts`, `e2e/request-intake.spec.ts` |
| FR-3, FR-4, FR-5, FR-9, FR-10, FR-11 | One As-a / I-want / so-that story, a short bullet list, 3 to 5 gap questions | `lib/requirements/parse-generation.ts`, eval cases in the eval report, clip `02-requirement-generation` |
| FR-6, FR-12 | Three labeled sections the BA can select. A later success replaces them | `lib/requirements/result-review.ts`, `docs/qa/vision-report.json`, clip `03-result-review` |
| FR-8, NFR-3 | Failure sentence `Generation failed. You can try Generate again.` Field kept. Generate usable. Not a generic 500 | `lib/requirements/generation-failure.ts`, clip `04-generation-failure` |
| NFR-1, NFR-5 | English desktop page. Chromium is the automated browser | `app/layout.tsx`, `playwright.config.ts`, clip `01-request-intake` |
| NFR-2 | Public, no account | Local clips, plus the production file above. The matrix cell still says the deploy artifact is missing. That sentence is older than the file. PD-3 was not adopted, so the matrix was not rewritten here |
| NFR-4 | Completes or fails within 30 seconds | `GENERATION_DEADLINE_MS` in `lib/requirements/generate.ts`. The unit test covers 30000 ms. The production smoke does not record a duration |
| TC-1–TC-8, BC-1–BC-5 | Stack and exclusions | [docs/technical/architecture.md](technical/architecture.md), [docs/technical/integrations.md](technical/integrations.md) |

The 2026-10-02 acceptance signature is [docs/qa/mvp-acceptance-report.md](qa/mvp-acceptance-report.md). It was accepted as written that day, and it still says the deploy was missing. It is not a post-deploy signature.

## Evidence index

| Claim | Path |
| --- | --- |
| Production smoke | [docs/qa/deploy-verification.json](qa/deploy-verification.json) |
| Deploy check on 2026-10-03 | `node scripts/check-deploy.mjs` exited 0 and printed the production URL |
| Fake-model eval bar | [docs/qa/eval-report.md](qa/eval-report.md), `quality/eval-baseline.json` |
| Supplemental live grade, not the bar | [docs/qa/2026-10-02-live-openai-eval.md](qa/2026-10-02-live-openai-eval.md) |
| Five desktop clips | [docs/qa/demo-recordings/manifest.json](qa/demo-recordings/manifest.json) |
| Coverage floor | `quality/coverage-baseline.json` (lines 67.08, statements 66.66, functions 72.97, branches 69.74) |
| Visual fidelity | `node scripts/check-visual-fidelity.mjs` on 2026-10-03 printed `Result: NOT-EARNED` |
| Factory lock | `node scripts/check-factory-integrity.mjs` on 2026-10-03 printed `Result: PASS, 1 warning(s)` |
| Older battery | [docs/qa/automated-verification-latest.md](qa/automated-verification-latest.md), finished 2026-10-02, overall Fail |

This pass did not re-run lint, unit tests, Playwright, or `npm run build`. It did not regenerate the qa-verify bundle.

## Ops actions

1. Make the final release commit and push. Neither was done here. The owner stopped before that commit.
2. The stored upstream `origin/capstone-project` was `10269e4` while `HEAD` was `4780057`. No fetch was run. Confirm the remote before pushing.
3. Leave `LLM_API_KEY` as the existing Vercel Production secret. Leave `LLM_MODEL` at `gpt-4.1-mini`. Leave `REQUIREMENTS_MODEL_MODE` unset in production. Do not set `fake` there.
4. Do not add `quality/visual-parity.config.json`.
5. Do not change `git config`. The integrity warning about `core.hooksPath` was left as printed.
6. No email domain and no payment provider exist to verify (TC-3).

## Process notes

| Item | State | Where |
| --- | --- | --- |
| PD-1 | Applied. Record kept out of the slice archive | `docs/qa/process-improvements/2026-10-03-improve-PD-1/`. Commit `4780057`, `Refs: PD-1`. `docs/qa/process-defects.json` status `resolved` |
| PD-2 | Applied. Do not amend `10269e4` | `docs/qa/process-improvements/2026-10-03-improve-PD-2/`. `Refs: PD-2`. Status `resolved` |
| PD-3, PD-4, PD-5 | Not adopted | `docs/qa/process-improvements/`. Proposal status `not adopted`. `scripts/ledger-report.mjs` and `scripts/qa-verify.mjs` were not edited |
| Trajectory eval | Accepted as history, not a product defect | `docs/qa/trajectory-eval-report.md`. All four slices fail process-order. Intake also fails in-scope. Commits were not rewritten |
| PD-6 | Open in the defect file | Uncommitted-work streak. This pass adds more uncommitted files |
| Gate header | `none` | Must stay `none`. A header that names G7 would outrun the computed frontier |
| Visual fidelity | NOT-EARNED | No pixel-fidelity requirement in the lock adaptations |

## Effort log

Honest limits are in [docs/estimation.md](estimation.md). Short version: 8 product commits by Maryna Lakei from 2026-10-02 15:06 Europe/Kyiv to 2026-10-03 13:21 Europe/Kyiv, plus 3 earlier course-template commits. Elapsed clock between the first and last product commit is 22h 14m 52s, including one overnight gap of 15h 3m 8s. That number is not hours worked. Git cannot show sessions that were never committed.

## Not verified in this pass

- The live URL was not opened again. The smoke facts are the deploy file (`verifiedAt` 2026-10-03T13:15:56+03:00).
- The Vercel dashboard was not opened. The secret is cited only as `set-as-secret-value-not-recorded`. `.env.local` was not read.
- Lint, unit, e2e, build, `qa:verify`, and `gate:status` were not re-run. The 2026-10-02 battery file still says Fail.
- No GitHub Actions run was looked up. The workflow copy lives under this project's `.github/workflows/ci.yml`, and that file says Actions loads workflows from the repository root. The git root has no workflow file.
- A fresh `git fetch` was not run.
