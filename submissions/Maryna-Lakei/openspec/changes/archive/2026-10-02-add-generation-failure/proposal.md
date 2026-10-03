# Change: add-generation-failure

## Why

This is slice 4 of AI Requirements Assistant, the last MVP slice. Slice 2 already returns structured failures (`provider-error`, `timeout`, `invalid-payload`, `missing-key`). Slice 3 stores that reason on the form (`data-generation-reason`) and keeps the last successful labeled result. `app/request-intake-form.tsx` still does not show a generation-failure sentence. The reason is stored and not shown.

FR-8 is the requirement this change owns. NFR-3 and NFR-4 travel with it: the Business Analyst sees a clear failure on the same page, with no generic HTTP 500, and a hung call ends within 30 seconds. Empty and whitespace-only input stays FR-7.

## What Changes

- After a generation failure, show this English sentence exactly: `Generation failed. You can try Generate again.` Render it in a `role="alert"` on the same page (FR-8, NFR-1, NFR-3).
- Show that sentence when the action returns `provider-error`, `timeout`, `invalid-payload`, or `missing-key`, and when the action throws (that path is already mapped to `provider-error`).
- Leave empty and whitespace-only input on the FR-7 path. That path still shows `Enter a business request.` and does not show the generation-failure sentence.
- On those generation failures, keep the raw request in the field, enable Generate again after the action settles, and keep any previous successful labeled result (FR-12 already keeps that result).
- Failure forcing exists only when `REQUIREMENTS_MODEL_MODE=fake`. A request containing `[[provider-error]]` makes the fake client fail as `provider-error` after about one second, with no fetch. A request containing `[[timeout]]` makes the fake client never settle, and the deadline still ends the call. Playwright’s webServer sets `REQUIREMENTS_FAKE_DEADLINE_MS=1500` so that end-to-end timeout finishes in about 1.5 seconds. That override is ignored unless mode is fake. `GENERATION_DEADLINE_MS` stays 30000. Production (mode unset) ignores both markers and the override.
- Weekly and monthly success fixtures stay unchanged for requests that do not contain those markers. Tests do not call OpenAI and do not read a real API key.

This change does not add a database, authentication, a new provider, an API key, or an env file. It does not start a QA pack, a deploy, or another slice.

## Impact

- Spec: `generation-failure` under `## ADDED Requirements`, with the baseline requirement and scenario text unchanged.
- Code that follows this folder: a pure helper for the sentence, an alert on the existing form, fake-mode markers, and a fake-mode deadline override. No schema.
- `@trace FR-8`, `@trace NFR-3`, and `@trace NFR-4` go in a unit test under `lib/`. The traceability walker does not scan `e2e/`.
- Tests are written first and must be observed failing before implementation.
- Archive stays blocked until the fake-model browser smoke in `tasks.md` passes. This proposal does not archive the change. Do not start a QA pack, a deploy, or a new slice from this folder.
