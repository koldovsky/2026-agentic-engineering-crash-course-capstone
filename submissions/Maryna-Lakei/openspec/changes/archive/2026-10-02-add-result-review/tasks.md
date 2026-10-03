# Tasks: add-result-review

Execution order: finish section 1, then write and run the section 5 tests and confirm they fail, then implement sections 2–4 until those tests pass, then section 6. Do not implement the helper, the headings, or the second fake fixture before the section 5 tests have been observed red.

Do not implement application behavior beyond this change. Do not write the tests as the application. Do not create `.env`, `.env.local`, or any other env file. Do not start `add-generation-failure`.

## 1. Dependencies and database schema

- [x] 1.1 Do not add a database, an ORM, a migration, or a `db/` directory. There is no database schema (TC-3). No new package is required for the three labels.
- [x] 1.2 Do not add authentication, a login route, or a redirect. There is no unauthorized state and no `next` parameter (TC-3).
- [x] 1.3 Do not add a provider, an API key, a new ADR, or an env file. Do not create `.env` or `.env.local`. Leave ADR-0003 unchanged. Do not call OpenAI from tests.
- [x] 1.4 Before any task in sections 2–4, complete every task in section 5 and confirm those tests fail because the specified behavior is not implemented yet.

## 2. Domain logic (labels and result replacement)

- [x] 2.1 Add a pure helper at `lib/requirements/result-review.ts`. It does not call the network, read the environment, or read an API key.
- [x] 2.2 Export the three English section labels exactly: `User Story`, `Acceptance Criteria`, `Clarifying Questions` (FR-6, NFR-1).
- [x] 2.3 Export one function that takes the stored result (or none) and a generation outcome. A success returns the new User Story, Acceptance Criteria, and Clarifying Questions and drops the previous result (FR-12). A structured failure returns the stored result unchanged, including when nothing was stored. Do not keep a history list.
- [x] 2.4 In the existing fake client (`REQUIREMENTS_MODEL_MODE=fake` only), keep returning the current fixture for every non-empty request that does not contain `monthly budget`, including `Need a weekly sales report for the regional team`: story `As a regional manager, I want a weekly sales report, so that I can review team performance.`; criteria `The report lists sales by region.` and `The report covers the previous week.`; questions `Which regions are included?`, `Who receives the report?`, and `What counts as a sale?`. A non-empty request that contains `monthly budget` returns a second valid fixture: story `As a finance lead, I want a monthly budget summary, so that I can compare planned and actual spend.`; criteria `The summary lists planned spend by category.` and `The summary lists actual spend for the month.`; questions `Which month does the budget cover?`, `Which categories are in scope?`, and `Who approves a variance?`. The fake client still does not call OpenAI, does not read `LLM_API_KEY`, and does not open a socket. Do not add a provider.

## 3. Services and server actions

- [x] 3.1 Wire `app/request-intake-form.tsx` to the helper. Render the three heading strings from the helper. Do not duplicate them as a second source of truth.
- [x] 3.2 On success, store the helper’s replacement result. On a structured failure, and in the `catch` path treated as `provider-error`, store the helper’s kept result. Remove the branches that set the result to null. Leave the raw request in the field. Keep the failure reason in client state for `add-generation-failure`. Do not render the FR-8 sentence.
- [x] 3.3 Do not clear a visible result when Generate is clicked or while the call is in flight. Only a new success replaces it (FR-12). Generate stays disabled until the action settles, then becomes enabled again.
- [x] 3.4 Keep the empty and whitespace-only path as it is: inline message `Enter a business request.`, Generate stays enabled, the server action is not called (FR-7). That path does not wipe a result already shown. A fresh page with no success still has no result.

## 4. UI and route handlers

- [x] 4.1 After success, show three sections in the existing result region. Heading text, as heading elements, is exactly `User Story`, `Acceptance Criteria`, and `Clarifying Questions`. The story stays one paragraph (`data-testid="user-story"`). Acceptance Criteria stay a bullet list (`data-testid="acceptance-criteria"`). Clarifying Questions stay a list (`data-testid="clarifying-questions"`).
- [x] 4.2 The result text is selectable with native browser selection. Do not set `user-select: none` on the result region or its text (FR-6).
- [x] 4.3 Do not add a copy-to-clipboard control, a `contenteditable` editor, or a separate Regenerate control (BC-5). Generate remains the only generate control. The Business Analyst refines by editing the raw request and clicking Generate again.
- [x] 4.4 Do not add a login redirect, a streaming view, a dark theme, or a persistent quota. Do not render a generic HTTP 500.

## 5. Tests

Write these tests first, from this change's spec, before sections 2–4. Run them and confirm they fail for the specified behavior. Do not weaken a test to make it pass. The traceability checker scans `lib/`, `tests/`, `app/`, `src/`, `components/`, and `evals/`. It does not scan `e2e/`. Put `@trace FR-6` and `@trace FR-12` in the unit test file under `lib/`. Chromium tests cover the browser and are not the trace source. Tests must not call OpenAI.

- [x] 5.1 Write `lib/requirements/result-review.test.ts` for the pure helper. Assert the three labels are exactly `User Story`, `Acceptance Criteria`, and `Clarifying Questions`. Assert a new success replaces a stored result, a failure keeps that stored result, and a failure with nothing stored stays empty. `@trace FR-6` `@trace FR-12`
- [x] 5.2 Write a Chromium test that starts with `REQUIREMENTS_MODEL_MODE=fake` and no live key, enters `Need a weekly sales report for the regional team`, and after success sees the three headings with those exact names, the existing fixture story as readable paragraph text, the existing criteria as list items, and 3 to 5 questions. Select the story with a native gesture (triple-click the story paragraph) and assert the browser selection contains that story sentence. Assert the story’s computed `user-select` is not `none`. The test must not call OpenAI.
- [x] 5.3 Write a Chromium test that, after the weekly sales success is visible, replaces the field with `Need a monthly budget for the finance team`, activates Generate again, and asserts the weekly story sentence is gone, the finance-lead story is the visible story, the criteria are the monthly-budget criteria, and the questions are the three monthly-budget questions. Only that latest success is visible. The test must not call OpenAI.
- [x] 5.4 On a visible successful result, assert there is no copy-to-clipboard control, no `contenteditable` editor, and no button named Regenerate. Generate is still present (BC-5).
- [x] 5.5 Update the success-path assertions that the three headings are absent, on purpose, because FR-6 now requires those labels after success. In `e2e/requirement-generation.spec.ts`, after the weekly fixture is visible, expect each heading once instead of `toHaveCount(0)`. In `e2e/request-intake.spec.ts`, after the in-flight weekly sales Generate has finished and Generate is enabled, expect each heading once instead of `toHaveCount(0)`. Keep the fixture text checks, the in-flight disable, the single-request check, the field value, and the absent Copy control.
- [x] 5.6 On the empty and whitespace-only Chromium paths, keep every existing check (inline message, Generate enabled, no generation request, no story). Also assert the three result headings are absent. Do not delete or loosen those empty-input checks.
- [x] 5.7 Run the new unit tests and the new Chromium tests. Record that they failed before implementation of sections 2–4 began. The unit file should fail because the helper module does not exist yet. The heading and replacement Chromium tests should fail because the headings are absent and the fake model still returns the weekly story for a monthly-budget request.

## 6. Validation, docs, and archive prep

- [x] 6.1 Run lint (`npm run lint`) and fix failures introduced by this slice.
- [x] 6.2 Run unit tests (`npm run test:run`) and confirm the section 5 unit tests now pass.
- [x] 6.3 Run the production build (`npm run build`) and confirm it succeeds.
- [x] 6.4 Run Chromium end-to-end tests (`npm run test:e2e`) and confirm they pass, including the updated heading assertions and the second-fixture replacement test.
- [x] 6.5 Run `npx --yes @fission-ai/openspec@latest validate add-result-review --strict` and confirm it passes. The npm package named `openspec` is a stub; use this `@fission-ai/openspec` command.
- [x] 6.6 Run `npx --yes @fission-ai/openspec@latest validate --all --strict` and confirm it passes.
- [x] 6.7 Update `docs/current-state.md` with the date and time in Europe/Kyiv, the phase, and this active change. Record only claims that have an evidence path.
- [x] 6.8 Manual browser smoke with the fake model, on a desktop Chromium window, with no live API key required, in this order: (1) start the app with `REQUIREMENTS_MODEL_MODE=fake` and without `LLM_API_KEY`; do not create an env file; (2) open the application URL and confirm no login step appears; (3) leave the field empty, activate Generate, and confirm the inline validation message appears, Generate stays enabled, and no result headings appear; (4) enter only spaces, activate Generate, and confirm the same inline validation behavior and no result headings; (5) enter `Need a weekly sales report for the regional team`, activate Generate, and confirm Generate is disabled while the fake call is in flight; (6) when it finishes, confirm the headings `User Story`, `Acceptance Criteria`, and `Clarifying Questions`, the existing weekly story paragraph, the two weekly criteria, and the three weekly questions, and confirm the page is not a generic HTTP 500; (7) select the story text with the browser and confirm it highlights; (8) confirm there is no copy-to-clipboard control, no in-page editor, and no separate Regenerate control; (9) replace the field with `Need a monthly budget for the finance team`, activate Generate again, and confirm the weekly story sentence is gone and the finance-lead story, the monthly criteria, and the monthly questions are the only result; (10) confirm the raw request is still in the field and Generate is enabled again; (11) confirm the smoke did not call `https://api.openai.com`. There is no database smoke and no login redirect.
- [x] 6.9 Leave that settled labeled result for a vision pass. Do not create or edit `docs/qa/vision-report.json`. Do not set `met: true`. The orchestrator writes that file after a fresh vision judge looks at the settled result.
- [x] 6.10 Only after step 6.8 passes, run `npx --yes @fission-ai/openspec@latest archive add-result-review --yes`. Do not archive if any smoke step fails. Do not archive before the smoke.
