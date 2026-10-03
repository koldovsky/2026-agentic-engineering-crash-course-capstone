# Tasks: add-requirement-generation

Execution order: finish section 1, then write and run the section 5 tests and confirm they fail, then implement sections 2–4 until those tests pass, then section 6. Do not implement the parser, the generation call, or the result region before the section 5 tests have been observed red.

## 1. Dependencies and database schema

- [x] 1.1 Do not add a database, an ORM, a migration, or a `db/` directory. There is no database schema (TC-3). The dependency for this slice is one server-side HTTPS POST, not a committed API key (TC-2, ADR-0003).
- [x] 1.2 Call `POST https://api.openai.com/v1/chat/completions` with `fetch` on the live path. Do not add a provider SDK. Model id `gpt-4.1-mini`. Read `LLM_API_KEY` and `LLM_MODEL` only on the server. If `LLM_MODEL` is unset, use `gpt-4.1-mini`. Never use a `NEXT_PUBLIC_` name for the key (ADR-0003).
- [x] 1.3 Do not create `.env`, `.env.local`, or any file that holds an API key. `submissions/Maryna-Lakei/.env.local` is owner-provided later and must not be created by an agent. Add `.env` and `.env.local` to `.gitignore` so that file cannot be committed. Leave `LLM_API_KEY` empty in `.env.example`. Do not put a secret in any file.
- [x] 1.4 Do not add authentication, email, or payments (TC-3). Do not add a login route or a redirect.
- [x] 1.5 Before any task in sections 2–4, complete every task in section 5 and confirm those tests fail because the specified behavior is not implemented yet.

## 2. Domain logic (parse and validate the model payload)

- [x] 2.1 Add a pure parser under `lib/requirements/`, in its own file, separate from `generate.ts`. It accepts a model payload and returns the three shapes or a structured invalid-payload failure. It does not call the network, read the environment, or invent missing text.
- [x] 2.2 Accept exactly one User Story: a non-empty string with “As a”, “I want”, and “so that” in that order. Reject a missing story or a second story (FR-3, FR-9).
- [x] 2.3 Accept Acceptance Criteria as an array of 1 to 8 non-empty single-line strings. Do not require Given/When/Then (FR-4, FR-10).
- [x] 2.4 Accept Clarifying Questions only when the array length is 3, 4, or 5 and each item is a non-empty question containing `?` (FR-5, FR-11). Leave “is this about a gap?” to the eval in section 5. Do not assert an exact question string as the parser’s pass condition.
- [x] 2.5 On a missing field, a wrong type, a count outside those bounds, or a story that is not in the required form, return the structured failure and do not fill in a User Story.

## 3. Services and server actions

- [x] 3.1 Add `lib/requirements/generate.ts` for one server-side call. Accept an injected completion client so tests pass a fake. The default client performs one non-streaming POST to the endpoint in task 1.2, with a server-only module (`import "server-only"`). The fake client must not call OpenAI and must not read `LLM_API_KEY`.
- [x] 3.2 When the live client is selected and `LLM_API_KEY` is missing, return structured reason `missing-key`. Do not call the provider and do not invent a User Story.
- [x] 3.3 Bound the call at 30 seconds (NFR-4). When the deadline is reached, abort and return structured reason `timeout`. Map a non-200 or network failure to `provider-error`, and a payload the parser rejects to `invalid-payload`. Do not stream (BC-5). Do not send a follow-up call that rewrites the result (BC-2).
- [x] 3.4 Replace `holdValidatedRequest` in `lib/requirements/actions.ts`. Delete the stub. The form calls the generation action. The action returns the three shapes or a structured failure. It catches those failures and does not throw, so a missing key does not become a generic HTTP 500 (NFR-3). The return value does not include the API key.
- [x] 3.5 If the action is invoked with empty or whitespace-only input, return structured reason `empty-input` and do not call the completion client (FR-7). The form still blocks that path before the action, as it does today.
- [x] 3.6 Do not select the fake fixture when the key is missing. The fixture runs only when `REQUIREMENTS_MODEL_MODE=fake` is set for tests. That fixture does not read `LLM_API_KEY` and does not open a socket to the provider.

## 4. UI and route handlers

- [x] 4.1 After a successful action, show the three shapes in one result region on the existing form: the User Story as one paragraph, Acceptance Criteria as a bullet list, and Clarifying Questions as a list of the question strings. A Chromium test with the fake model must be able to see all three. Do not add the headings “User Story”, “Acceptance Criteria”, or “Clarifying Questions” (FR-6 belongs to `add-result-review`). `data-testid` hooks are allowed and are not those headings.
- [x] 4.2 Do not assert or implement replacement of a previous result (FR-12). Keep a single in-memory result for the shapes just returned. Do not add a history list.
- [x] 4.3 Keep Generate disabled while the action is in flight, then enable it again when the action settles, including when the action returns a structured failure.
- [x] 4.4 When the field is empty or whitespace-only, keep the existing inline message, leave Generate enabled, and do not call the server action or the model (FR-7). Do not render a generic HTTP 500.
- [x] 4.5 When the action returns a structured failure, store the reason in client state and leave the raw request in the field. Do not render the FR-8 failure sentence. Do not navigate to or render a generic HTTP 500 page. `add-generation-failure` will display the message from this same reason.
- [x] 4.6 Do not add a copy-to-clipboard control, an in-page editor, a separate Regenerate control, a streaming view, a dark theme, or a persistent quota (BC-5). Do not add a login redirect.

## 5. Tests

Write these tests first, from this change's spec, before sections 2–4. Run them and confirm they fail for the specified behavior. Do not weaken a test to make it pass. The traceability checker scans `lib/`, `tests/`, `app/`, `src/`, `components/`, and `evals/`. It does not scan `e2e/`. Put the `@trace` annotations for FR-3, FR-4, FR-5, FR-9, FR-10, and FR-11 in the unit tests under `lib/` so those ids are traced. The Chromium tests still cover the browser behavior.

- [x] 5.1 Write unit tests for the pure parser using a fake payload. Cover a valid story, a story missing one of “As a” / “I want” / “so that”, a second story, a bullet list, an empty bullet list, a list longer than 8, 3 questions, 2 questions, and 6 questions. `@trace FR-3` `@trace FR-4` `@trace FR-5` `@trace FR-9` `@trace FR-10` `@trace FR-11`
- [x] 5.2 Assert the parser does not require Given/When/Then, does not call the network, and does not invent a User Story for a malformed payload. `@trace FR-3` `@trace FR-4` `@trace FR-10`
- [x] 5.3 Write unit tests for the generation service with an injected fake client: one call returns the three shapes; a missing `LLM_API_KEY` on the live client returns `missing-key`, does not call `fetch`, and does not return a User Story; the deadline constant is 30 seconds; a client that never settles returns `timeout` under a fake timer; the result object has no API key. These tests must not call OpenAI and must not read a real key.
- [x] 5.4 Write a Chromium test that starts the server with `REQUIREMENTS_MODEL_MODE=fake` and no live key, enters a non-empty request, sees Generate disabled while the fake call is in flight, then sees the story text, the acceptance-criteria bullets, and 3 to 5 questions. The test must not call OpenAI.
- [x] 5.5 Write a Chromium test that activates Generate on an empty field and on a whitespace-only field, expects the existing inline validation message, and expects no generation request and no story text. `@trace` for FR-7 may stay on the existing `lib/requirements/validation.test.ts` annotation. Do not rely on the `e2e/` file for FR-3 through FR-11.
- [x] 5.6 Add an eval case under `evals/cases/` that grades whether Clarifying Questions are about gaps in the raw request. The rubric must not require an exact question string. `produce()` uses a fake payload and does not call OpenAI. Include `@trace FR-5` and `@trace FR-11` on the case. The `lib/` unit tests in 5.1 remain the trace source for the checker if this case is graded later.
- [x] 5.7 Run the new unit tests, the new Chromium tests, and confirm the eval case file is in place. Record that the new tests failed before implementation of sections 2–4 began.

## 6. Validation, docs, and archive prep

- [x] 6.1 Run lint (`npm run lint`) and fix failures introduced by this slice.
- [x] 6.2 Run unit tests (`npm run test:run`) and confirm the section 5 unit tests now pass.
- [x] 6.3 Run the production build (`npm run build`) and confirm it succeeds.
- [x] 6.4 Run `npx --yes @fission-ai/openspec@latest validate add-requirement-generation --strict` and confirm it passes.
- [x] 6.5 Run `npx --yes @fission-ai/openspec@latest validate --all --strict` and confirm it passes.
- [x] 6.6 Update `docs/current-state.md` with the date and time in Europe/Kyiv, the phase, and this active change. Record only claims that have an evidence path.
- [x] 6.7 Manual browser smoke with the fake model, on a desktop Chromium window, with no live API key required, in this order: (1) start the app with `REQUIREMENTS_MODEL_MODE=fake` and without `LLM_API_KEY`; (2) open the application URL and confirm no login step appears; (3) leave the field empty, activate Generate, and confirm the inline validation message appears, Generate stays enabled, and no story, bullets, or questions appear; (4) enter only spaces, activate Generate, and confirm the same inline validation behavior; (5) enter a non-empty raw business request, activate Generate, and confirm Generate is disabled while the fake call is in flight; (6) when it finishes, confirm the page shows one “As a / I want / so that” story, a short bullet list of acceptance criteria, and 3 to 5 questions, and confirm the page is not a generic HTTP 500; (7) confirm the raw request is still in the field and Generate is enabled again; (8) confirm there is no copy-to-clipboard control, no in-page editor, and no separate Regenerate control; (9) confirm the smoke did not call `https://api.openai.com`. There is no database smoke.
- [x] 6.8 Only after step 6.7 passes, run `npx --yes @fission-ai/openspec@latest archive add-requirement-generation --yes`. Do not archive if any smoke step fails.
