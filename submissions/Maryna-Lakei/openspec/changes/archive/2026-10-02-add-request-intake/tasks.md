# Tasks: add-request-intake

Execution order: finish section 1, then write and run the section 5 tests and confirm they fail, then implement sections 2–4 until those tests pass, then section 6. Do not implement the validator, the stub, or the page before the section 5 tests have been observed red.

## 1. Dependencies and database schema

- [x] 1.1 Use the Next.js 16 App Router application for this slice (TC-1). Do not add a database, an ORM, a migration, or a `db/` directory. There is no database schema (TC-3, ADR-0001).
- [x] 1.2 Do not add authentication, email, or payments, and do not add Postgres, Drizzle, Better Auth, or Resend (TC-3, TC-7).
- [x] 1.3 Before any task in sections 2–4, complete every task in section 5 and confirm those tests fail because the specified behavior is not implemented yet.

## 2. Domain logic (validation)

- [x] 2.1 Add `lib/requirements/validation.ts`, a pure function that trims the raw business request and rejects only an empty result (FR-7). Spaces, tabs, and other trim whitespace count as empty.
- [x] 2.2 Treat any value that still has characters after trim as eligible, including a single word such as `reports`. Do not add a character minimum or a word minimum (FR-7).
- [x] 2.3 Keep the function free of network calls, LLM clients, and environment variables. Return a result the UI can render as an inline message.

## 3. Services and server actions

- [x] 3.1 Add one server action that accepts an already-validated raw business request, waits for a short fixed delay of about one second, and returns without generated text.
- [x] 3.2 The action MUST NOT call an LLM, MUST NOT import a provider SDK, and MUST NOT read an API key.
- [x] 3.3 Do not start this action for empty or whitespace-only input (FR-7). Do not implement User Story, Acceptance Criteria, Clarifying Questions, or provider-failure copy in this action.

## 4. UI and route handlers

- [x] 4.1 Add a public desktop page as a thin server component, with a client component for the Generate form (FR-1, NFR-5). Opening the URL requires no login and does not redirect to a login route (NFR-2, TC-3).
- [x] 4.2 Show an editable text field for the raw business request with an English label (FR-1, NFR-1).
- [x] 4.3 Show an English Generate control that can be activated when no request is in flight (FR-2, NFR-1).
- [x] 4.4 When Generate is activated on empty or whitespace-only input, show an inline English validation message, leave Generate enabled, and do not call the server action or an LLM (FR-7). Do not render a generic HTTP 500.
- [x] 4.5 When Generate is activated on a non-empty value after trim, disable Generate until the stubbed delay settles, then enable it again (FR-13). A second activation during the delay does not start another run.
- [x] 4.6 Do not render a User Story, Acceptance Criteria, Clarifying Questions, or a labeled result section. Do not add a copy-to-clipboard control or an in-page editor (BC-5).

## 5. Tests

Write these tests first, from this change's spec, before sections 2–4. Run them and confirm they fail for the specified behavior. Annotate each test file with the `@trace` ids below. Do not weaken a test to make it pass.

- [x] 5.1 Write unit tests for the pure validation function covering an empty string, spaces only, tabs only, a single word (`reports`), and a value that is non-empty after trim. `@trace FR-7`
- [x] 5.2 Assert the unit tests reject only trim-empty input and do not apply a character minimum or a word minimum. `@trace FR-7`
- [x] 5.3 Write a Chromium end-to-end test that opens the page with no account, finds an editable raw-request text field, and finds a Generate control that can be activated when nothing is in flight. `@trace FR-1` `@trace FR-2`
- [x] 5.4 Write a Chromium end-to-end test that activates Generate on an empty field and on a whitespace-only field, expects an inline validation message each time, and expects no LLM call. `@trace FR-7`
- [x] 5.5 Write a Chromium end-to-end test that enters `reports`, activates Generate, and expects no empty-input validation message and no length rejection. `@trace FR-7`
- [x] 5.6 Write a Chromium end-to-end test that activates Generate with a non-empty request and expects the Generate control to be disabled while the stubbed request is in flight, then usable again after it settles, with no second run started during the delay. `@trace FR-13`
- [x] 5.7 Run the new unit tests and the new Chromium tests and record that they failed before implementation of sections 2–4 began.

## 6. Validation, docs, and archive prep

- [x] 6.1 Run lint (`npm run lint`) and fix failures introduced by this slice.
- [x] 6.2 Run unit tests (`npm run test:run`) and confirm the section 5 unit tests now pass.
- [x] 6.3 Run the production build (`npm run build`) and confirm it succeeds.
- [x] 6.4 Run `npx openspec validate add-request-intake --strict` and confirm it passes.
- [x] 6.5 Run `npx openspec validate --all --strict` and confirm it passes.
- [x] 6.6 Update `docs/current-state.md` with the date and time in Europe/Kyiv, the phase, and this active change. Record only claims that have an evidence path.
- [x] 6.7 Manual browser smoke, on a desktop Chromium window, in this order: (1) open the application URL and confirm no login or sign-up step appears; (2) confirm the raw-request field label and the Generate control are English and that the field is editable; (3) leave the field empty, activate Generate, and confirm an inline validation message appears, Generate stays enabled, and no User Story, Acceptance Criteria, or Clarifying Questions appear; (4) enter only spaces, activate Generate, and confirm the same inline validation behavior; (5) enter `reports`, activate Generate, and confirm no empty-input or length validation message appears; (6) during that request, confirm Generate is disabled and cannot be activated again until the request finishes; (7) when it finishes, confirm Generate is enabled again, the text `reports` is still in the field, and the page still shows no generated sections, no copy-to-clipboard control, and no editor; (8) confirm the page never shows a generic HTTP 500.
- [x] 6.8 Only after step 6.7 passes, run `npx openspec archive add-request-intake --yes`. Do not archive if any smoke step fails.
