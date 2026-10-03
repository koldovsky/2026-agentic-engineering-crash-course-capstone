# Design: add-requirement-generation

## Goals

- Replace the slice-1 stub `holdValidatedRequest` with one server-side LLM call for an eligible raw business request (TC-2).
- Return one User Story in the form “As a / I want / so that” (FR-3, FR-9), Acceptance Criteria as a short bullet list (FR-4, FR-10), and 3 to 5 Clarifying Questions about gaps (FR-5, FR-11).
- Complete or fail within 30 seconds (NFR-4). Do not stream (BC-5). Do not rewrite the result after it is produced (BC-2).
- Keep the API key on the server (TC-2). Tests inject a fake model and do not call the live provider.
- Show the three shapes after success so a Chromium test with the fake model can see them, without the labeled sections or the replacement behavior (FR-6, FR-12).

## Non-goals

- Labeled page sections, native-selection checks, and replacement of a previous result (FR-6, FR-12). Those belong to `add-result-review`.
- The visible failure sentence, including timeout copy (FR-8). That belongs to `add-generation-failure`.
- Empty-input validation is already implemented (FR-7). This slice keeps that path and does not redesign the message.
- No login, account, session, or redirect. There is no `next` parameter because there is no authentication (TC-3).
- No database, email, payments, history, Jira, upload, workspaces, or mobile app (TC-3, BC-2).
- No copy-to-clipboard control, no in-page editor, no separate Regenerate control, no streaming, no dark theme, and no persistent quota (BC-5).
- Given/When/Then is not required for Acceptance Criteria (FR-10).
- No second model call that improves the generated requirement on its own (BC-2).

## Decisions

### 1. ADR-0003 is accepted and is not reopened

The live path calls OpenAI once, server-side, with `POST https://api.openai.com/v1/chat/completions`. The model id is `gpt-4.1-mini`. The response is one completed JSON body. The request sets streaming off. Use `fetch`. Do not add a provider SDK. ADR-0003 is the record of this choice. This design follows it and does not rewrite it.

Server environment variables, read only on the server:

- `LLM_API_KEY` — the OpenAI secret
- `LLM_MODEL` — `gpt-4.1-mini`

The owner will create `submissions/Maryna-Lakei/.env.local` later. Next.js loads that file from the project directory. An agent must not create `.env.local`, must not commit it, and must not put the secret in any file. The key must not use a `NEXT_PUBLIC_` name. `.env.example` already lists both names with empty values. Leave `LLM_API_KEY` empty there.

The current `.gitignore` does not list `.env` or `.env.local`. This slice adds those ignore rules so the owner file cannot be committed. Adding the ignore rule does not create the file.

If `LLM_MODEL` is unset, the live client uses `gpt-4.1-mini`. There is no default for `LLM_API_KEY`.

Trade-off: the requirement text stays vendor-neutral (TC-2). Changing the model later is an edit to `LLM_MODEL` or a new ADR, not a change to the requirement sentences.

### 2. Replace the stub; do not leave it beside the real call

`lib/requirements/actions.ts` exports `holdValidatedRequest`. It waits about one second and returns `void`. It does not call a model and does not read a key. `app/request-intake-form.tsx` calls it after `validateRawBusinessRequest` succeeds, then renders nothing.

This slice deletes that function. The form calls a generation action that returns the three shapes or a structured failure. The page stays a thin server component (`app/page.tsx`). The existing client form remains the only client component. It keeps the raw-request field, the inline empty-input message, and the in-flight flag.

Trade-off: the one-second stub delay goes away on the live path. A Chromium test that still needs to see Generate disabled uses a short delay inside the fake model, not a delay in production.

### 3. A pure parser owns the three shapes

Add a pure parser under `lib/requirements/`, in its own file, separate from the HTTP client (`AGENTS.md`: `generate.ts` is the call; helpers stay in their own files). It takes the model payload and returns either the three shapes or a structured invalid-payload failure. It does not read the environment, does not call the network, and does not fill in missing text.

Rules the parser enforces:

- User Story: one non-empty string that contains the clauses “As a”, “I want”, and “so that” in that order. A second story in the same string is rejected (FR-3, FR-9).
- Acceptance Criteria: an array of 1 to 8 non-empty single-line strings. The upper bound is this slice’s checkable meaning of “short” (FR-10). Given/When/Then is not required, and a bullet that happens to use that shape is still accepted.
- Clarifying Questions: an array of 3, 4, or 5 non-empty questions, each containing `?` (FR-5, FR-11). The parser checks count and question form. Whether a question is about a gap is graded by the eval, not by an exact string match.

A missing field, the wrong type, a count outside those bounds, or text that is not the story form is an invalid payload. The parser returns failure and does not invent a User Story.

Trade-off: a live model that returns nine bullets fails parsing instead of showing a long list. That keeps “short” testable. The prompt asks for a short list so the live call stays inside the bound. The fix for a too-long list is the prompt, not a silent trim.

### 4. The HTTP client is injectable

`lib/requirements/generate.ts` performs one call and accepts a completion client argument. The default client is the live POST. Unit tests pass a fake client and never use the default.

The live client module starts with `import "server-only"`. The client component imports only the server action. The action’s return value has no key field. The browser bundle must not contain `LLM_API_KEY` or a key literal.

Chromium cannot inject a function into the Next.js server. The end-to-end server is started with a test-only switch, `REQUIREMENTS_MODEL_MODE=fake`. That switch selects a built-in fixture client. The fixture returns a known valid payload, waits about one second so Generate can be seen disabled, does not open a socket, and does not read `LLM_API_KEY`. Production start does not set the switch. A missing key must not select this fixture.

Trade-off: a fixture switch turned on in a deployed environment would return the fixture story. The switch is explicit, documented as test-only, and is not the fallback for a missing key.

### 5. Missing key and other live failures stay structured

NFR-3 travels with this slice: a missing key, a non-200 response, a timeout, or an invalid payload must not surface a generic HTTP 500 page. The server action catches those cases and returns a structured failure the page can hold. Reason codes:

- `missing-key`
- `provider-error`
- `timeout`
- `invalid-payload`
- `empty-input` (only if the action is invoked with a blank request; the form does not invoke it on that path)

The page stores that reason in client state, leaves the raw request in the field, and enables Generate again when the action settles. It does not render the FR-8 sentence. `add-generation-failure` owns that wording and will read this same reason. This slice does not write that copy, so it does not satisfy the visible-message half of FR-8. It does stop the unhandled 500.

A missing key does not invent a User Story and does not call the provider.

Trade-off: until slice 4, a failed live call can look quiet on the page. That is the boundary. The structured reason is the handoff to slice 4, not a user-facing message written here.

### 6. Thirty seconds, one shot, no rewrite

The service wraps the client call in a 30-second deadline (NFR-4). At the deadline it aborts and returns `timeout`. The in-flight flag clears when that return arrives, so the request does not stay in flight past the bound. Unit tests assert the deadline constant is 30 seconds and that a fake client which does not settle becomes `timeout`, using a fake timer. They do not sleep for 30 seconds and do not call OpenAI.

The live request is a single POST with streaming off (BC-5). After a successful parse, the service returns. It does not send a follow-up call to rewrite or improve the result (BC-2).

### 7. Show the shapes without taking FR-6 or FR-12

On success, the form renders one result region:

- the User Story as one paragraph of the returned sentence
- Acceptance Criteria as a bullet list (`ul` / `li`)
- Clarifying Questions as a list of the returned question strings

The region has no headings “User Story”, “Acceptance Criteria”, or “Clarifying Questions”. Those labels are FR-6 and belong to `add-result-review`. Stable hooks such as `data-testid` may mark the three blocks so a Chromium test can find them. Hooks are not the labeled sections.

The form keeps a single result value in memory for the shapes just returned. This slice does not specify, and tests here do not assert, that a later success removes a previous result (FR-12). There is no history list. Slice 3 owns replacement and the labeled presentation.

## Data model

There is no database and no schema. Do not add tables, migrations, or a `db/` directory.

Success value: `userStory` (string), `acceptanceCriteria` (string array), `clarifyingQuestions` (string array). Failure value: `ok: false` and one reason code from decision 5.

Browser state, for the current page view only: the raw business request, the inline validation message or none, whether a request is in flight, the latest successful three shapes or none, and the latest structured failure reason or none.

Nothing is written to disk, `localStorage`, or a cookie. A reload clears the result. The API key is never part of this state.

## Error handling

| Condition | Behavior |
| --- | --- |
| Field empty or whitespace-only | Existing inline message “Enter a business request.” The server action is not called. The model is not called. Generate stays enabled. No HTTP 500. |
| Eligible input, call in flight | Generate stays disabled until the action settles. |
| Success payload parses | The three shapes are shown as in decision 7. Generate is enabled again. The raw text stays in the field. |
| `LLM_API_KEY` missing on the live path | Structured `missing-key`. No invented story. No provider HTTP call. No generic HTTP 500. No FR-8 sentence. |
| Provider non-200, network error, or invalid payload | Structured `provider-error` or `invalid-payload`. No invented story. No generic HTTP 500. No FR-8 sentence. |
| Call still in flight at 30 seconds | Abort. Structured `timeout`. The in-flight flag clears. No generic HTTP 500. No FR-8 sentence. |
| Action invoked with blank input | Structured `empty-input`. The completion client is not called. |

The action returns these outcomes. It does not throw them. There is no unauthorized state and no forbidden state. Do not redirect to a login page.

## Risks and mitigations

- **The stub remains and the model is never called.** Tasks delete `holdValidatedRequest` and point the form at the generation action.
- **A missing key is papered over with a fixture story.** The fake switch is opt-in. The missing-key unit test fails if the provider is called or a story is returned.
- **Tests read a real key or call OpenAI.** Unit tests pass a fake client. The Chromium server uses `REQUIREMENTS_MODEL_MODE=fake`. Neither path reads `LLM_API_KEY`.
- **The key reaches the browser.** The live client is server-only. The action return has no key field. A check asserts the client form source does not reference `LLM_API_KEY`.
- **An unhandled throw becomes a Next.js 500 page.** The action catches provider, timeout, and parse failures and returns the structured reason.
- **Slice 4’s sentence is written early.** The page holds the reason and renders no generation-failure copy.
- **FR-6 headings or an FR-12 test sneak in.** The result region omits those headings, and this slice’s tests do not assert replacement. Reviewers treat missing labels as out of scope.
- **The 30-second test waits on the wall clock.** The deadline is asserted with a fake timer and a constant check.
- **Tests are written after the code.** Section 5 of `tasks.md` is executed, and observed red, before sections 2–4. A test is not weakened to match missing code.
- **An agent creates `.env.local`.** Tasks forbid creating it. Ignore rules are added so a later owner file is not committed.

## Testing approach

Tests come first. They must fail because the parser, the generation action, and the result region do not exist yet, not because the assertion is vague.

- Unit tests for the parser, colocated under `lib/requirements/`, with a fake payload. The file header carries `@trace FR-3`, `@trace FR-4`, `@trace FR-5`, `@trace FR-9`, `@trace FR-10`, and `@trace FR-11`. The traceability checker scans `lib/`, `tests/`, `app/`, `src/`, `components/`, and `evals/`. It does not scan `e2e/`. These `lib/` annotations are what trace those FR ids.
- Unit tests for the generation service: one fake call, missing key, the 30-second bound, and no key in the result. They must not call OpenAI and must not read a real key.
- A Chromium test starts with the fake model, enters a non-empty request, sees Generate disabled while the fake is in flight, then sees the three shapes. Another Chromium check keeps empty input off the server. Those files cover the browser. They are not the trace source.
- An eval case under `evals/cases/` grades whether the clarifying questions are about gaps in the request. The rubric must not demand an exact question string. The case uses a fake payload and does not call OpenAI. Put `@trace FR-5` and `@trace FR-11` on that case as well.
- No database smoke. The manual check is a browser pass with the fake model, written step by step in `tasks.md`. It does not require a live key.
