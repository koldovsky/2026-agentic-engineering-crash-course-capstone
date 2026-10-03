# Design: add-generation-failure

## Goals

- When Generate fails after a non-empty raw business request, show one visible English sentence on the same page: `Generation failed. You can try Generate again.` (FR-8, NFR-1, NFR-3).
- Show that sentence for `provider-error`, `timeout`, `invalid-payload`, and `missing-key`, including a thrown action that the form already maps to `provider-error`.
- Leave the submitted raw request in the field and leave Generate usable after the action settles (FR-8).
- Keep any previous successful labeled result on the page (FR-12 already does this).
- End a hung call with that same visible failure. The product deadline stays 30 seconds (NFR-4).
- Force provider-error and timeout in tests with the fake model only, with no OpenAI call and no real API key.

## Non-goals

- Empty and whitespace-only validation (FR-7). That path already shows `Enter a business request.` and does not call the model. This slice does not replace that sentence with the generation-failure sentence.
- Generation content shape (FR-3, FR-4, FR-5, FR-9, FR-10, FR-11) and the three result headings (FR-6).
- Changing the weekly or monthly success fixture text for a request that does not contain `[[provider-error]]` or `[[timeout]]`.
- A copy button, an in-page editor, a separate Regenerate control, streaming, a dark theme, or a persistent quota (BC-5).
- Login, accounts, sessions, redirects, or a `next` parameter. There is no authentication (TC-3).
- A database, email, payments, a history list, or a `db/` directory (TC-3).
- A new ADR, a new provider, an API key, or an env file. ADR-0003 stays as it is. Do not create `.env` or `.env.local`.
- A vision report. FR-8 is verified by Chromium end-to-end tests. Do not create or edit `docs/qa/vision-report.json`.
- A QA pack, a deploy, or a new slice. This is the last MVP slice.

## Decisions

### 1. One English sentence, owned by a pure helper

Add `lib/requirements/generation-failure.ts`. It does not call the network, read the environment, or read an API key.

It exports the sentence exactly:

`Generation failed. You can try Generate again.`

It exports one function that maps a generation outcome reason to that sentence or to no sentence:

- `provider-error`, `timeout`, `invalid-payload`, and `missing-key` return the sentence.
- `empty-input` returns no generation-failure sentence.
- No reason returns no generation-failure sentence.

The form renders that return value. It does not keep a second copy of the sentence in the JSX. The visible text is the sentence, not the reason code (`provider-error`, `timeout`, and the others stay off the page). `data-generation-reason` may stay as it is today.

Trade-off: every generation failure shares one sentence. The Business Analyst can retry. The page does not explain which provider condition occurred.

### 2. The alert is the generation failure, and the empty-input path stays FR-7

`app/request-intake-form.tsx` already shows `Enter a business request.` in a `role="alert"` when validation fails, and it returns before the server action. Keep that paragraph and that sentence (FR-7).

For a generation failure, render a separate `role="alert"` on the same page whose text is the helper’s sentence. That alert is visible. It is not `aria-hidden`, and it is not a generic HTTP 500 page (`Internal Server Error`). Do not add an error page for this path. The action still returns a structured result.

Clear the FR-7 validation message when a non-empty Generate starts, as the form does now, so a settled generation failure shows the generation sentence and does not also show `Enter a business request.` An empty or whitespace-only submit still clears any stored generation reason, still shows only the FR-7 sentence, and still does not call the server action.

Do not set `aria-invalid` on the field because generation failed. `aria-invalid` stays tied to the FR-7 message.

Trade-off: two different alerts can exist in the component, and only one is rendered for a given submit. Testers distinguish them by the sentence, not by assuming a single alert role.

### 3. Field, Generate, and the previous result stay

On `provider-error`, `timeout`, `invalid-payload`, `missing-key`, and the `catch` path that already sets `provider-error`:

- Leave `rawRequest` unchanged. Do not clear the textarea.
- Keep calling `applyGenerationOutcome` so a previous successful labeled result stays. Do not set the result back to null.
- Store the reason, then render the helper’s sentence.
- Leave Generate disabled only while `inFlight` is true (FR-13). The existing `finally` path enables Generate again when the action settles, including when it fails.

A successful Generate still replaces the stored result and clears the failure reason, so the generation-failure sentence disappears on the next success.

Trade-off: a failed follow-up sits under the last good result plus the new alert. That is the FR-12 behavior slice 3 already implemented, with the FR-8 sentence added.

### 4. Markers exist only inside the fake client

`REQUIREMENTS_MODEL_MODE=fake` remains the only test switch. The fake client still does not read `LLM_API_KEY`, does not open a socket, and does not call `https://api.openai.com`.

In that fake client only:

- A raw request that contains `[[timeout]]` returns a promise that does not settle on its own. It does not resolve the weekly or monthly fixture. The deadline in decision 5 still ends `generateRequirements` as `timeout`. No fetch.
- Otherwise, a raw request that contains `[[provider-error]]` waits the existing fixture delay (about one second) and then fails so `generateRequirements` returns `provider-error`. No fetch.
- Any other non-empty request keeps today’s fixture choice: `monthly budget` selects the monthly fixture; every other request, including `Need a weekly sales report for the regional team`, selects the weekly fixture.

A request that contains both markers takes the timeout path.

When mode is unset, `resolveDefaultClient` does not use the fake client. The markers are ordinary request text. With no API key the call still returns `missing-key` before any client runs. Tests of that path delete `LLM_API_KEY` and do not read it. They must not call OpenAI. Do not add a provider SDK.

Trade-off: the markers are visible in the text field during a forced failure. They are a fake-mode test hook, not production copy. Production ignores them.

### 5. The 30 second deadline stays; a fake-mode override is for tests only

`GENERATION_DEADLINE_MS` stays `30000`. Do not change that constant.

The race inside `generateRequirements` uses `GENERATION_DEADLINE_MS` unless both of these are true: `REQUIREMENTS_MODEL_MODE` is `fake`, and `REQUIREMENTS_FAKE_DEADLINE_MS` is a base-10 integer greater than 0. Only then does the race use that integer. Any other mode, including mode unset, ignores the override and still uses 30000. A non-numeric override in fake mode also falls back to 30000.

Playwright’s `webServer.env` keeps `REQUIREMENTS_MODEL_MODE=fake` and `LLM_API_KEY` empty, and adds `REQUIREMENTS_FAKE_DEADLINE_MS=1500`. That is configuration in `playwright.config.ts`, not an env file. The fake success delay stays about one second, which is under 1500 milliseconds, so existing success tests still finish as successes. The provider-error marker also waits about one second, so with the 1500 millisecond e2e deadline it still settles as `provider-error` rather than `timeout`. The timeout marker does not settle, so the e2e race ends in about 1.5 seconds.

Unit tests that do not set `REQUIREMENTS_FAKE_DEADLINE_MS` still expect the race to end at 30000 and still use fake timers. The existing unit assertion that `GENERATION_DEADLINE_MS` is 30000 stays.

This override is a test harness on the fake mode ADR-0003 already chose. It is not a new provider decision and not a new ADR.

Trade-off: the Chromium server fails a hung fake call in about 1.5 seconds so the suite does not wait 30 seconds. The product constant and any server whose mode is unset still use 30 seconds.

## Data model

There is no database and no schema. Do not add tables, migrations, or a `db/` directory.

Browser state for the current view stays what the form already holds: the raw request, the FR-7 message or none, whether a request is in flight, the latest successful result or none, and the latest structured failure reason or none. The visible sentence is derived from that reason by the helper. Nothing is written to disk, `localStorage`, or a cookie. The API key is never part of this state.

## Error handling

| Condition | Behavior |
| --- | --- |
| Field empty or whitespace-only | Inline message `Enter a business request.` The server action is not called. The generation-failure sentence is absent. Generate stays enabled. No HTTP 500. |
| Eligible input, call in flight | Generate stays disabled until the action settles. A result already on the page stays. |
| Success payload | The helper from slice 3 stores that result. The failure reason is cleared, so the generation-failure sentence is absent. Generate is enabled again. The raw text stays in the field. |
| `provider-error`, `timeout`, `invalid-payload`, or `missing-key` | The sentence is in a `role="alert"` on the same page. The raw text stays in the field. Generate is enabled again. Any previous labeled result stays. No generic HTTP 500. |
| Action throws | The form already stores `provider-error`. The same sentence, field, Generate, and previous result behavior applies. No generic HTTP 500. |
| Fake mode and `[[provider-error]]` | After about one second, `provider-error`. No fetch. |
| Fake mode and `[[timeout]]` | The fake client does not settle. The deadline ends the call as `timeout`. |
| Mode unset, markers present, no API key | `missing-key`. Markers do not select the fake client. No fetch. |
| Mode unset, override set | The race still uses 30000. |

There is no unauthorized state and no forbidden state. Do not redirect to a login page.

## Risks and mitigations

- **The sentence is typed twice and drifts.** The form renders the helper’s string only.
- **Empty input shows the generation sentence.** The FR-7 branch returns before the action, clears the generation reason, and the helper returns no sentence for `empty-input`.
- **A failure still clears the field or the last result.** Tasks keep the current field state and the slice 3 `applyGenerationOutcome` failure path.
- **Markers run in production.** The fake client is selected only when mode is exactly `fake`. Mode unset never reads the markers as failures.
- **The override shortens production.** The race reads `REQUIREMENTS_FAKE_DEADLINE_MS` only in fake mode. `GENERATION_DEADLINE_MS` stays 30000.
- **The 1500 millisecond e2e deadline turns the provider-error marker into a timeout.** The provider-error wait stays about one second, under 1500 milliseconds.
- **The 1500 millisecond e2e deadline turns weekly and monthly successes into timeouts.** Those fixtures still resolve after about one second. Requests without the markers keep their current payloads.
- **A timeout test waits 30 seconds or calls OpenAI.** The timeout marker never settles, the Playwright server sets the fake deadline to 1500, and tests assert no request to `api.openai.com`.
- **Traces live only under `e2e/`.** `@trace FR-8`, `@trace NFR-3`, and `@trace NFR-4` go on the unit test under `lib/`.
- **Tests are written after the code.** Section 5 of `tasks.md` is executed, and observed red, before sections 2–4.
- **An agent creates an env file, a vision report, or a new slice.** Tasks forbid all three.

## Testing approach

Tests come first. The new failure tests must fail because the sentence, the markers, and the fake deadline override are not implemented yet.

- Unit tests in `lib/requirements/generation-failure.test.ts`. The file header carries `@trace FR-8`, `@trace NFR-3`, and `@trace NFR-4`. Assert the four generation reasons return the exact sentence and `empty-input` returns no generation-failure sentence. Assert fake mode: `[[provider-error]]` returns `provider-error` after about one second with no fetch; `[[timeout]]` does not settle and, with fake timers and no override, returns `timeout` at 30000. Assert fake mode with `REQUIREMENTS_FAKE_DEADLINE_MS=1500` returns `timeout` at 1500 for `[[timeout]]`. Assert mode unset ignores the markers and the override and still times out an unsettled client at 30000. These tests delete `LLM_API_KEY` without reading it and do not call OpenAI.
- Chromium tests with the Playwright server’s fake mode, empty `LLM_API_KEY`, and `REQUIREMENTS_FAKE_DEADLINE_MS=1500`. One test submits a request containing `[[provider-error]]` and one submits a request containing `[[timeout]]`. Each asserts the exact sentence in an alert, the field value unchanged, Generate enabled again, no `Internal Server Error`, and no request to `api.openai.com`. The timeout case expects the sentence within a few seconds, so a 30 second wait fails the test.
- A Chromium check that a weekly success is still on the page after one of those failures.
- Empty and whitespace-only Chromium tests still expect `Enter a business request.` and expect the generation-failure sentence to be absent.
- Existing weekly and monthly success tests stay. Do not rewrite them into failure cases.
- No database smoke. No vision report. The manual check is a desktop browser pass with the fake model, written step by step in `tasks.md`. It does not read or require a live key.
