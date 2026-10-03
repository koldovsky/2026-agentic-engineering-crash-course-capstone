# Design: add-result-review

## Goals

- After a successful Generate, present the existing result as three labeled sections of readable English text (FR-6, NFR-1).
- Let the Business Analyst select that text with native browser selection (FR-6).
- When Generate succeeds again, replace the previous result. Only the latest success stays visible (FR-12).
- When a later call returns a structured failure, keep that latest success on the page.
- Prove replacement in Chromium with the fake model and two different valid fixtures. Do not call OpenAI.

## Non-goals

- The FR-8 failure sentence, including timeout copy. That stays in `add-generation-failure`. This slice does not render it.
- Empty and whitespace-only validation (FR-7). That path already shows "Enter a business request." and does not call the model. Do not weaken those checks.
- Generation content shape (FR-3, FR-4, FR-5, FR-9, FR-10, FR-11). Slice 2 already returns those shapes. This slice labels and replaces them.
- No copy-to-clipboard control, no in-page editor, no separate Regenerate control, no streaming, no dark theme, and no persistent quota (BC-5).
- No login, account, session, or redirect. There is no `next` parameter because there is no authentication (TC-3).
- No database, email, payments, history list, or `db/` directory (TC-3).
- No new ADR, no new provider, no API key, and no env file. ADR-0003 stays as it is. Do not create `.env` or `.env.local`.
- Do not start `add-generation-failure`.

## Decisions

### 1. Three English headings on the existing result region

The form in `app/request-intake-form.tsx` already renders, after success and without headings:

- the User Story as one paragraph, `data-testid="user-story"`
- Acceptance Criteria as a `ul` / `li` list, `data-testid="acceptance-criteria"`
- Clarifying Questions as a `ul` / `li` list, `data-testid="clarifying-questions"`

This slice wraps those blocks in three sections. Each section has a heading element whose accessible name is exactly one of:

- `User Story`
- `Acceptance Criteria`
- `Clarifying Questions`

Those strings are English (NFR-1). They come from the pure helper in decision 3, not from a second copy typed only in the JSX. Keep the story a paragraph, the criteria a bullet list, and the questions a list. Keep the three `data-testid` values on those same blocks. Hooks are not a substitute for the headings.

Trade-off: slice 2 Chromium tests assert these headings are absent. FR-6 now requires them after success, so this slice updates those assertions on purpose. See decision 5.

### 2. Native selection, and nothing that replaces it

The result text uses ordinary text nodes. Do not set `user-select: none` on the result region, the headings, or the story, criteria, or questions. A native selection gesture (for example a triple-click on the story paragraph) highlights that text as the browser selection.

Do not add a copy button, a `contenteditable` editor, or a button named Regenerate. The only generate control remains Generate. The Business Analyst refines by editing the raw request and clicking Generate again (BC-5).

Trade-off: there is no one-click copy. Selection is the MVP review gesture.

### 3. A pure helper owns labels and whether the stored result changes

Add `lib/requirements/result-review.ts`. It does not call the network, read the environment, or read an API key.

It exports the three heading strings from decision 1.

It exports one function that takes the stored result (or none) and a generation outcome:

- Success: return the new User Story, Acceptance Criteria, and Clarifying Questions. The previous result is dropped. There is no history list.
- Structured failure (`empty-input`, `missing-key`, `provider-error`, `timeout`, `invalid-payload`) or a thrown failure treated as `provider-error`: return the stored result unchanged. If none was stored, the result stays none.

The form calls this function. It must not keep a second rule that sets the result to null on failure. Today the failure branch and the `catch` branch in `app/request-intake-form.tsx` both do that. This slice removes that clear.

On success the form stores the helper’s new result and clears the failure reason. On failure it stores the helper’s kept result, stores the reason on the form as it does now (`data-generation-reason`), leaves the raw request in the field, and enables Generate when the action settles. It does not render the FR-8 sentence.

Do not clear the stored result when Generate is clicked. The previous success stays visible until a new success replaces it (FR-12). An empty or whitespace-only submit still returns before the action, still shows the existing inline message, and does not call the model (FR-7). That path does not wipe a result that is already showing. A fresh page with no success still has no result and no headings.

Trade-off: until slice 4, a failed follow-up call can look quiet while the last success remains. The structured reason is the handoff. The sentence is out of scope.

### 4. Two fake fixtures, same fake mode, no new provider

`REQUIREMENTS_MODEL_MODE=fake` stays the only test switch. It still does not read `LLM_API_KEY`, does not open a socket, and does not call OpenAI. Production start does not set the switch. A missing key still does not select the fixture.

The fake client today ignores the request text and always returns one payload. Keep that payload, unchanged, for every non-empty request that does not contain the substring `monthly budget`:

- User Story: `As a regional manager, I want a weekly sales report, so that I can review team performance.`
- Acceptance Criteria: `The report lists sales by region.` and `The report covers the previous week.`
- Clarifying Questions: `Which regions are included?` `Who receives the report?` `What counts as a sale?`

The request `Need a weekly sales report for the regional team` is in that group. Slice 2 tests that expect this fixture stay valid.

A non-empty request that contains `monthly budget` (the Chromium example is `Need a monthly budget for the finance team`) returns this second valid fixture instead:

- User Story: `As a finance lead, I want a monthly budget summary, so that I can compare planned and actual spend.`
- Acceptance Criteria: `The summary lists planned spend by category.` and `The summary lists actual spend for the month.`
- Clarifying Questions: `Which month does the budget cover?` `Which categories are in scope?` `Who approves a variance?`

The second story sentence, the criteria, and the questions are all different from the first fixture. The story is one “As a / I want / so that” sentence. The criteria are two non-empty lines. The questions are three non-empty strings that each contain `?`. The fake client still waits about one second so Generate can be seen disabled. Do not add a provider SDK or a new model id.

Trade-off: the second fixture is keyed off a substring so the test request can vary as long as it contains `monthly budget`. Any other text, including the weekly sales sentence, keeps the original fixture.

### 5. Update the old “headings absent” assertions on purpose

These assertions were correct while FR-6 was out of scope. They are wrong once this slice ships:

- `e2e/requirement-generation.spec.ts`: after the weekly sales fixture is visible, the three headings are expected to be absent.
- `e2e/request-intake.spec.ts`: after the in-flight weekly sales Generate finishes and Generate is enabled again, the three headings are expected to be absent.

Change those success-path assertions so each heading is present once, with the exact names in decision 1. Keep the weekly fixture text, the criteria list, the 3-to-5 question checks, the in-flight disable, the single-request check, the field value, and the check that a Copy button is absent.

Empty and whitespace-only tests still expect the inline message, an enabled Generate control, no generation request, and no story. They also expect the three headings to be absent, because those runs never succeed. Do not delete or loosen those checks.

`@trace FR-6` and `@trace FR-12` go on the unit test file under `lib/`. The walker does not scan `e2e/`.

## Data model

There is no database and no schema. Do not add tables, migrations, or a `db/` directory.

The stored result stays the slice 2 success value: `userStory` (string), `acceptanceCriteria` (string array), `clarifyingQuestions` (string array), or none. Browser state for the current view only: the raw request, the inline validation message or none, whether a request is in flight, the latest successful result or none, and the latest structured failure reason or none.

Nothing is written to disk, `localStorage`, or a cookie. A reload clears the result. The API key is never part of this state.

## Error handling

| Condition | Behavior |
| --- | --- |
| Field empty or whitespace-only on a fresh page | Existing inline message “Enter a business request.” The server action is not called. No headings, no story. Generate stays enabled. No HTTP 500. |
| Eligible input, call in flight | Generate stays disabled until the action settles. A result already on the page stays until a new success replaces it. |
| Success payload | The helper stores that result, replacing any previous one. Three English headings, paragraph, bullet list, question list. Generate is enabled again. The raw text stays in the field. |
| Structured failure after a success | The helper keeps the previous result and its headings. The reason is stored. The raw text stays in the field. Generate is enabled again. No FR-8 sentence. No generic HTTP 500. |
| Structured failure with no prior success | No result and no headings. The reason is stored. No FR-8 sentence. No generic HTTP 500. |
| Action throws | Treat as `provider-error`. Keep any stored result. No FR-8 sentence. No generic HTTP 500. |

The action still returns these outcomes. It does not throw them to the page as a 500. There is no unauthorized state and no forbidden state. Do not redirect to a login page.

## Risks and mitigations

- **The weekly sales fixture changes and slice 2 tests break.** Only a request that contains `monthly budget` gets the second fixture. The original payload stays byte-for-byte for every other request.
- **Headings land and the old absence assertions fail.** Decision 5 updates those success-path assertions on purpose and leaves the empty-input checks in place.
- **Failure still calls `setResult(null)`.** The form uses the helper’s return value and deletes that clear.
- **`user-select: none` or a copy button is added to make selection “easier”.** Tasks forbid both. The Chromium check looks for native selection and for the absent controls.
- **The FR-8 sentence is written here.** The page holds the reason and renders no generation-failure copy.
- **Traces live only under `e2e/`.** The label and replacement tests under `lib/` carry `@trace FR-6` and `@trace FR-12`.
- **Tests are written after the code.** Section 5 of `tasks.md` is executed, and observed red, before sections 2–4.
- **An agent creates an env file, a new ADR, or a new provider.** Tasks forbid all three. This slice does not start `add-generation-failure`.
- **A vision report is invented.** The implementer does not write `docs/qa/vision-report.json` and does not set `met: true`. The orchestrator writes that file after a fresh judge looks at the settled result.

## Testing approach

Tests come first. They must fail because the headings, the helper, and the second fixture are not implemented yet, not because the assertion is vague.

- Unit tests in `lib/requirements/result-review.test.ts`. Assert the three heading strings. Assert a new success replaces the stored result and a failure keeps it, including when nothing was stored. File header carries `@trace FR-6` and `@trace FR-12`. The test does not call OpenAI.
- A Chromium test with `REQUIREMENTS_MODEL_MODE=fake` and no live key: the weekly sales request shows the three headings and the existing readable fixture text; the story text can be selected natively; computed `user-select` is not `none`.
- A Chromium test: after that first success, a second request that contains `monthly budget` shows the second fixture and the weekly story sentence is gone.
- A Chromium check on the visible result: no copy control, no `contenteditable` editor, no Regenerate control. Generate remains.
- Update the slice 2 heading-absence assertions as in decision 5. Empty and whitespace paths still show no result headings.
- No database smoke. The manual check is a desktop browser pass with the fake model, written step by step in `tasks.md`. It does not require a live key.
