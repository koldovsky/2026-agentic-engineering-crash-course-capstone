# Tasks: add-generation-failure

Execution order: finish section 1, then write and run the section 5 tests and confirm they fail, then implement sections 2–4 until those tests pass, then section 6. Do not implement the helper, the alert, the fake-mode markers, or the deadline override before the section 5 tests have been observed red.

Do not implement application behavior beyond this change. Do not write the tests as the application. Do not create `.env`, `.env.local`, or any other env file. Do not put an API key in any file. Do not start a QA pack, a deploy, or a new slice.

## 1. Dependencies and database schema

- [x] 1.1 Do not add a database, an ORM, a migration, or a `db/` directory. There is no database schema (TC-3). No new package is required for the failure sentence.
- [x] 1.2 Do not add authentication, a login route, or a redirect. There is no unauthorized state and no `next` parameter (TC-3).
- [x] 1.3 Do not add a provider, an API key, a new ADR, or an env file. Do not create `.env` or `.env.local`. Leave ADR-0003 unchanged. Do not call OpenAI from tests. Do not read a real API key.
- [x] 1.4 Before any task in sections 2–4, complete every task in section 5 and confirm those new failure tests fail because the specified behavior is not implemented yet.

## 2. Domain logic (failure sentence)

- [x] 2.1 Add a pure helper at `lib/requirements/generation-failure.ts`. It does not call the network, read the environment, or read an API key.
- [x] 2.2 Export the English sentence exactly: `Generation failed. You can try Generate again.` (FR-8, NFR-1, NFR-3).
- [x] 2.3 Export one function that maps a reason to that sentence or to no sentence. `provider-error`, `timeout`, `invalid-payload`, and `missing-key` return the sentence. `empty-input` returns no generation-failure sentence. No reason returns no generation-failure sentence.

## 3. Services and server actions

- [x] 3.1 Wire `app/request-intake-form.tsx` to the helper. Render the alert text from the helper. Do not duplicate the sentence as a second source of truth.
- [x] 3.2 When the action returns `provider-error`, `timeout`, `invalid-payload`, or `missing-key`, store that reason and render the helper’s sentence. When the action throws, keep the existing mapping to `provider-error` and render the same sentence. Keep calling `applyGenerationOutcome` so any previous successful labeled result stays (FR-12). Do not clear the raw request. Enable Generate again when the action settles.
- [x] 3.3 In the existing fake client, only when `REQUIREMENTS_MODEL_MODE=fake`: a request containing `[[timeout]]` returns a promise that does not settle and does not return a fixture; otherwise a request containing `[[provider-error]]` waits about one second and then fails as `provider-error`. No fetch. A request that contains both markers takes the timeout path. Requests that contain neither marker keep the current weekly fixture, and a request that contains `monthly budget` and neither marker keeps the current monthly fixture.
- [x] 3.4 Keep `GENERATION_DEADLINE_MS` at 30000. Use `REQUIREMENTS_FAKE_DEADLINE_MS` as the race deadline only when mode is `fake` and the value is a base-10 integer greater than 0. Every other mode, including mode unset, ignores that override and still uses 30000.
- [x] 3.5 In `playwright.config.ts` `webServer.env`, keep `REQUIREMENTS_MODEL_MODE=fake` and `LLM_API_KEY` empty, and set `REQUIREMENTS_FAKE_DEADLINE_MS` to `1500`. Do not create an env file.

## 4. UI and route handlers

- [x] 4.1 On a generation failure, show a visible `role="alert"` on the same page whose text is exactly `Generation failed. You can try Generate again.` The page is not a generic HTTP 500 and does not show `Internal Server Error` (FR-8, NFR-3).
- [x] 4.2 After `provider-error`, `timeout`, `invalid-payload`, `missing-key`, or a thrown action, the submitted raw request is still in the field and Generate is enabled again (FR-8). Generate stays disabled only while the call is in flight (FR-13).
- [x] 4.3 A previous successful labeled result stays visible through those failures (FR-12). Do not clear it.
- [x] 4.4 Keep the empty and whitespace-only path as it is: inline message `Enter a business request.`, Generate stays enabled, the server action is not called (FR-7). That path does not show the generation-failure sentence.
- [x] 4.5 Do not add a login redirect, a streaming view, a dark theme, a persistent quota, a copy control, an in-page editor, or a Regenerate control (BC-5, TC-3).

## 5. Tests

Write these tests first, from this change's spec, before sections 2–4. Run them and confirm the new failure tests fail for the specified behavior. Do not weaken a test to make it pass. The traceability checker scans `lib/`, `tests/`, `app/`, `src/`, `components/`, and `evals/`. It does not scan `e2e/`. Put `@trace FR-8`, `@trace NFR-3`, and `@trace NFR-4` in the unit test file under `lib/`. Chromium tests cover the browser and are not the trace source. Tests must not call OpenAI and must not read a real API key. Do not create `.env.local`.

- [x] 5.1 Write `lib/requirements/generation-failure.test.ts`. Assert `provider-error`, `timeout`, `invalid-payload`, and `missing-key` each return exactly `Generation failed. You can try Generate again.` Assert `empty-input` returns no generation-failure sentence. `@trace FR-8` `@trace NFR-3` `@trace NFR-4`
- [x] 5.2 In that unit file, with `REQUIREMENTS_MODEL_MODE=fake`, no injected client, and `LLM_API_KEY` deleted and not read: a request containing `[[provider-error]]` returns `{ ok: false, reason: "provider-error" }` after about one second, and `fetch` is not called. Use fake timers. The test must not call OpenAI.
- [x] 5.3 In that unit file, with fake mode and no deadline override: a request containing `[[timeout]]` does not settle on its own. With fake timers the race returns `{ ok: false, reason: "timeout" }` at 30000 milliseconds, and it has not returned at 1500 milliseconds. Assert `GENERATION_DEADLINE_MS` is still 30000. `fetch` is not called.
- [x] 5.4 In that unit file, with fake mode and `REQUIREMENTS_FAKE_DEADLINE_MS=1500`: the `[[timeout]]` request returns `timeout` at 1500 milliseconds of fake timers. With mode unset, the same override is ignored: an unsettled client still returns `timeout` at 30000, and a request containing `[[provider-error]]` with no API key returns `missing-key` without fetch. Restore both env vars after each test.
- [x] 5.5 Write a Chromium test for a request containing `[[provider-error]]`. The Playwright server already uses fake mode. After the change in task 3.5 it also sets `REQUIREMENTS_FAKE_DEADLINE_MS=1500` and an empty `LLM_API_KEY`. Assert the exact sentence in a `role="alert"`, the field value unchanged, Generate enabled again, no `Internal Server Error`, and no request to `api.openai.com`.
- [x] 5.6 Write a Chromium test for a request containing `[[timeout]]` with the same assertions. Expect the sentence within a few seconds of activating Generate, so a 30 second hang fails the test. Assert the field value unchanged, Generate enabled again, no `Internal Server Error`, and no request to `api.openai.com`.
- [x] 5.7 In one of those Chromium tests, first complete a weekly success (`Need a weekly sales report for the regional team`), then submit a marked failure, and assert the weekly story is still visible with the generation-failure sentence.
- [x] 5.8 On the existing empty and whitespace-only Chromium tests, keep every existing check. They still expect only `Enter a business request.` for that path, and they expect the sentence `Generation failed. You can try Generate again.` to be absent. Do not delete or loosen those checks. Leave the weekly and monthly success tests on their current fixtures.
- [x] 5.9 Run the new unit tests and the new Chromium tests. Record that they failed before implementation of sections 2–4 began. The unit file should fail because the helper module does not exist yet and the fake client still returns a success fixture for the markers. The Chromium tests should fail because the generation-failure sentence is absent.

## 6. Validation, docs, and archive prep

- [x] 6.1 Run lint (`npm run lint`) and fix failures introduced by this slice.
- [x] 6.2 Run unit tests (`npm run test:run`) and confirm the section 5 unit tests now pass, including the 30000 deadline when the override is unset.
- [x] 6.3 Run the production build (`npm run build`) and confirm it succeeds.
- [x] 6.4 Run Chromium end-to-end tests (`npm run test:e2e`) and confirm they pass, including both marker tests and the existing empty, whitespace, weekly, and monthly tests.
- [x] 6.5 Run `npx --yes @fission-ai/openspec@latest validate add-generation-failure --strict` and confirm it passes. The npm package named `openspec` is a stub; use this `@fission-ai/openspec` command.
- [x] 6.6 Run `npx --yes @fission-ai/openspec@latest validate --all --strict` and confirm it passes.
- [x] 6.7 Update `docs/current-state.md` with the date and time in Europe/Kyiv, the phase, and this active change. Record the section 5 red run and only claims that have an evidence path.
- [x] 6.8 Manual browser smoke on a desktop Chromium window. Force both failures with the fake model. Do not read or require a live key. Do not create an env file. In this order: (1) start the app with `REQUIREMENTS_MODEL_MODE=fake` and `REQUIREMENTS_FAKE_DEADLINE_MS=1500`, and without `LLM_API_KEY`; (2) open the application URL and confirm no login step appears; (3) leave the field empty, activate Generate, and confirm the only message is `Enter a business request.`, Generate stays enabled, and `Generation failed. You can try Generate again.` is absent; (4) enter only spaces, activate Generate, and confirm the same inline validation behavior; (5) enter `Need a weekly sales report for the regional team`, activate Generate, and confirm the weekly labeled result appears and the generation-failure sentence is absent; (6) replace the field with text that contains `[[provider-error]]`, activate Generate, and after about one second confirm the sentence in an alert, the field text unchanged, Generate enabled again, the weekly story still visible, the page is not `Internal Server Error`, and no request went to `https://api.openai.com`; (7) replace the field with text that contains `[[timeout]]`, activate Generate, and within about 1.5 seconds confirm the same sentence, the field text unchanged, Generate enabled again, the weekly story still visible, no `Internal Server Error`, and no request to `https://api.openai.com`; (8) replace the field with `Need a monthly budget for the finance team` and confirm that request, which has neither marker, still shows the monthly success fixture. There is no database smoke and no login redirect.
- [x] 6.9 Do not create or edit `docs/qa/vision-report.json`. No vision report is required for this slice. FR-8 verification is the Chromium end-to-end test. Do not start a QA pack, a deploy, or a new slice.
- [x] 6.10 Only after step 6.8 passes, run `npx --yes @fission-ai/openspec@latest archive add-generation-failure --yes`. Do not archive if any smoke step fails. Do not archive before the smoke.
