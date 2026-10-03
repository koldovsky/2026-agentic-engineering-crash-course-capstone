# Design: add-request-intake

## Goals

- Ship the public English desktop page for AI Requirements Assistant (slice 1).
- Let a Business Analyst type a raw business request (FR-1) and activate Generate (FR-2) with no login (NFR-2, TC-3).
- Validate input with one pure function: reject only empty or whitespace-only text, show an inline message, and do not start a request (FR-7).
- Disable Generate for the whole time a request is in flight, then enable it again (FR-13).
- Prove the in-flight state with a stubbed delay. Do not call an LLM and do not read an API key.

## Non-goals

- No User Story, Acceptance Criteria, or Clarifying Questions (FR-3, FR-4, FR-5, FR-9, FR-10, FR-11). Those belong to `add-requirement-generation`.
- No labeled result sections and no replacement of a previous result (FR-6, FR-12). Those belong to `add-result-review`.
- No LLM or API failure message, no timeout copy, and no generic-500 policy for provider errors (FR-8, NFR-3). Those belong to `add-generation-failure`.
- No 30-second generation budget (NFR-4). The stub is not that budget.
- No character minimum and no word minimum.
- No login, account, session, or redirect to a login URL. There is no `next` parameter because there is no authentication (TC-3).
- No database, email, payments, history, Jira, upload, workspaces, or mobile app (TC-3, BC-2).
- No copy-to-clipboard control, no in-page editor, no separate Regenerate control, no streaming, no dark theme, and no persistent quota (BC-5).
- No API key in server code, client code, or the browser bundle.

## Decisions

### 1. Next.js 16 App Router, no database, no auth

The page is a Next.js 16 application using the App Router (TC-1). The page component is a thin server component. A client component owns the text field, the Generate control, the inline message, and the in-flight flag. ADR-0001 already accepts this stack and rejects Postgres, Drizzle, Better Auth, and Resend (TC-7).

Trade-off: a refresh clears the typed request, because nothing is stored. That is accepted. Persistence is out of scope (TC-3). This decision does not need a new ADR.

### 2. Validation is a pure function

`lib/requirements/validation.ts` exports a pure function. It trims the raw string. If the trimmed value is empty, the input is rejected. Otherwise it is eligible, including a single word such as `reports` or a single non-whitespace character.

The function does not count characters, count words, call the network, or read the environment. The UI maps a rejection to an inline English message. The exact sentence is an implementation choice (see the residual note in `docs/requirements.md`) as long as the message is specific, visible on the page, and clearly about the empty input.

Trade-off: very short requests pass validation. Quality of the request is not judged in this slice. Adding a minimum would contradict FR-7.

### 3. In-flight disable uses a stubbed delay, not an LLM

A server action accepts an already-validated raw request, waits for a short fixed delay, and returns without producing requirement text. The client sets an in-flight flag before the call and clears it when the call settles. While the flag is set, Generate is disabled and a second activation does nothing.

The delay is a test double so FR-13 can be observed before slice 2 exists. It is on the order of one second: long enough for a Chromium test to see the disabled control, and far below any later generation budget. It is not a product timeout and does not implement NFR-4.

Trade-off: a client-only `setTimeout` would also disable the button, but it would not match the later server-side shape of Generate. A server action keeps that shape without an LLM client and without an API key. The stub must be replaced by the real generation call in `add-requirement-generation`. Leaving it in place after that slice would be a defect.

This tactic is local to the slice. It does not need a new ADR.

### 4. The API key is unused

This slice does not read `process.env` for a provider key, does not add a key to `.env.local`, and does not send any key to the browser (TC-2 starts in the next slice). The page must work with no key configured.

Trade-off: nothing in this slice can prove a live model. That proof is intentionally deferred.

### 5. Validation runs before the stub

Empty and whitespace-only input never starts the server action. Generate stays enabled on that path. The inline message appears, and the typed value stays in the field (an empty field stays empty).

Trade-off: the disabled state is therefore invisible on the reject path. FR-13 applies only when a request is actually in flight, which requires eligible input.

### 6. English desktop page, no login shell

Visible copy for the field label, the Generate control, and the validation message is English (NFR-1). The route is public. Opening the URL shows the field and Generate with no sign-in step (NFR-2). The layout is a desktop web page, not a native mobile app (NFR-5). Cross-browser testing is out of scope; automated end-to-end tests for this slice use Chromium only (TC-8).

Trade-off: there is no responsive mobile requirement to satisfy, and none is added.

## Data model

There is no database and no schema. Do not add tables, migrations, or a `db/` directory.

The only state is in the browser for the current page view:

- the raw business request string
- the inline validation message, or none
- whether a stubbed request is in flight

Nothing is written to disk, `localStorage`, or a cookie. A reload starts from an empty field, no message, and Generate enabled.

## Error handling

This slice has one specified error path.

| Condition | Behavior |
| --- | --- |
| Field empty | Inline English validation message. Stub is not called. LLM is not called. Generate stays enabled. No HTTP 500 page. |
| Field is only whitespace (spaces, tabs, or other characters removed by trim) | Same as empty. |
| Short non-empty value after trim | No empty-input validation message. Stub runs. Generate is disabled until the stub settles, then enabled. No generated sections appear. |
| Second activation while the stub is in flight | Control is disabled, so the second run does not start. |
| Stub returns | Generate is enabled again. The raw text remains in the field. No result region is rendered. |

The stub is written not to fail. Provider errors, timeouts, and retry copy are out of scope (FR-8). Do not invent that message here. Do not render a generic HTTP 500 for the empty-input path.

There is no unauthorized state and no forbidden state. Do not redirect to a login page.

## Risks and mitigations

- **The stub is mistaken for generation.** The action returns no User Story, Acceptance Criteria, or Clarifying Questions, and the UI renders none. Tasks forbid an LLM client in this slice.
- **A length rule sneaks into validation.** Unit tests cover a single word and assert that only trim-empty input is rejected. There is no character floor and no word floor.
- **The delay is too short to observe.** The delay must stay long enough for the FR-13 Chromium test to see Generate disabled, then see it enabled after the stub finishes.
- **Invalid input disables Generate.** The reject path must not set the in-flight flag and must not call the server action.
- **An API key is wired early.** Code review of this slice checks that no provider SDK and no key variable are referenced.
- **Tests are written after the code.** Section 5 of `tasks.md` is executed, and observed red, before sections 2–4 are implemented. A test that fails for the wrong reason is rewritten until it asserts the spec. A test is not weakened to match missing code.
- **Scope grows into later FRs.** The page has no result headings, no copy control, and no editor. Reviewers treat those as missing-on-purpose, not as bugs in this slice.

## Testing approach

Tests come first. They must fail because the validation module and the page do not exist yet, not because the assertion is vague.

- Unit tests on the pure function, colocated with it, annotated `@trace FR-7`. Cases: empty string, spaces, tabs, a single word, a value with surrounding whitespace that is non-empty after trim.
- Chromium end-to-end tests annotated `@trace FR-1`, `@trace FR-2`, `@trace FR-7`, and `@trace FR-13`. They open the page with no login, check English labels, reject empty and whitespace-only input, accept a short value without a length error, and observe Generate disabled during the stub.
- No database smoke. The manual check is a browser pass, written step by step in `tasks.md`.
