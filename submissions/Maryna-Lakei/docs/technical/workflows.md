# Workflows

One actor, the Business Analyst. One page, `/`. Specs: [request-intake](../../openspec/specs/request-intake/spec.md), [requirement-generation](../../openspec/specs/requirement-generation/spec.md), [result-review](../../openspec/specs/result-review/spec.md), [generation-failure](../../openspec/specs/generation-failure/spec.md), [public-demo](../../openspec/specs/public-demo/spec.md). Code map: [architecture](architecture.md). Shapes: [data model](data-model.md).

The form handler is `onSubmit` in `app/request-intake-form.tsx`.

## 1. Open the page

The layout title is `AI Requirements Assistant` and `lang` is `en` (`app/layout.tsx`, NFR-1). The page shows that heading and the form (`app/page.tsx`). No login step (NFR-2). Desktop web only (NFR-5). Automated browsers are Chromium (TC-8, `playwright.config.ts`).

## 2. Reject empty input

The BA clicks Generate with an empty field or a whitespace-only field.

1. `validateRawBusinessRequest` returns not ok.
2. The page shows `Enter a business request.` in an alert (`role="alert"`).
3. `generateFromRequest` is not called.
4. Generate stays enabled.
5. Any previous failure reason is cleared.

FR-7. If the server action is called with a blank string anyway, `generateRequirements` returns `empty-input` and the failure sentence stays hidden (`lib/requirements/generation-failure.ts`).

## 3. Generate

The BA enters any non-empty text after trim and clicks Generate.

1. The validation message and the failure reason clear.
2. Generate disables until the action settles (FR-13).
3. `generateFromRequest` runs on the server (`lib/requirements/actions.ts`).
4. Live mode posts once to OpenAI. Fake mode returns a fixture. See [actions](apis-actions.md).
5. The call must finish or fail within 30 seconds (`GENERATION_DEADLINE_MS` in `lib/requirements/generate.ts`, NFR-4).

## 4. Show a success

On `ok: true`, `applyGenerationOutcome` replaces any stored result (`lib/requirements/result-review.ts`, FR-12). The form renders three headings and the text (`app/request-intake-form.tsx`, FR-6):

| Heading | Element |
| --- | --- |
| User Story | One paragraph, `data-testid="user-story"` |
| Acceptance Criteria | A bullet list, `data-testid="acceptance-criteria"` |
| Clarifying Questions | A bullet list, `data-testid="clarifying-questions"` |

The BA selects that text with the browser. There is no copy button, no editor, and no second button named Regenerate (BC-5). The raw request stays in the field. To change the result, the BA edits that field and clicks Generate again.

Production example, 2026-10-03: request `Need a weekly sales report for the regional team.` returned one user story, 5 criteria, and 5 questions, with the field preserved and no failure sentence ([docs/qa/deploy-verification.json](../qa/deploy-verification.json)). That output is not the fake weekly fixture (`matchesFakeWeeklyFixture: false`).

## 5. Show a failure

On `ok: false` with reason `missing-key`, `provider-error`, `timeout`, or `invalid-payload`, the page shows:

`Generation failed. You can try Generate again.`

The field is not cleared. Generate is enabled again in `finally`. A previous successful result stays on the page (`applyGenerationOutcome`). A thrown error is mapped to `provider-error` in both the action and the form `catch`. The visitor does not get a generic HTTP 500 page for these paths (FR-8, NFR-3).

Fake-mode drills use the markers `[[provider-error]]` and `[[timeout]]`. Playwright shortens the hang with `REQUIREMENTS_FAKE_DEADLINE_MS=1500` (`playwright.config.ts`). Production does not set fake mode ([operations](operations.md)).

## 6. Replace after a failure

A later success clears the failure sentence and replaces the three sections. The owner fake-model note is [docs/qa/2026-10-02-add-generation-failure-owner-smoke.md](../qa/2026-10-02-add-generation-failure-owner-smoke.md). The Chromium sequence is `e2e/cross-slice.spec.ts`.
