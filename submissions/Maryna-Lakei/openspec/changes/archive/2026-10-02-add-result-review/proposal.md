# Change: add-result-review

## Why

This is slice 3 of AI Requirements Assistant. Slice 2 already renders a successful Generate as a story paragraph, an acceptance-criteria bullet list, and a clarifying-questions list, with `data-testid` values `user-story`, `acceptance-criteria`, and `clarifying-questions`. Those blocks have no headings. `app/request-intake-form.tsx` also clears that result when the action returns a structured failure.

FR-6 and FR-12 are the requirements this change owns. NFR-1 travels with the labels: the headings are English. BC-5 stays in force for the result UI.

## What Changes

- After a successful Generate, turn the existing result region into three labeled sections. Heading text is exactly "User Story", "Acceptance Criteria", and "Clarifying Questions" (FR-6, NFR-1).
- Keep the story as a paragraph, the criteria as a bullet list, and the questions as a list. Keep the three `data-testid` values.
- The result text stays selectable with native browser selection. Do not set `user-select: none` (FR-6).
- A second successful Generate replaces the stored result. Only the latest success is visible (FR-12).
- A structured failure does not erase the latest successful result. The page still does not render the FR-8 sentence. That copy stays in `add-generation-failure`.
- The fake model keeps the existing fixture for the request "Need a weekly sales report for the regional team". A different non-empty request that contains "monthly budget" returns a second distinct valid fixture. Tests do not call OpenAI.

This change does not add a copy button, an in-page editor, or a separate Regenerate control (BC-5). It does not add a database, authentication, a new ADR, an API key, or a new provider.

## Impact

- Spec: `result-review` under `## ADDED Requirements`, with the baseline requirement and scenario text unchanged.
- Code that follows this folder: a pure helper for the section labels and for applying a new success or keeping the stored result on failure, headings on the existing form, and a second fake fixture. No schema.
- Slice 2 Chromium assertions that the three headings are absent are updated in this slice, on purpose, because FR-6 now requires those labels after success. Empty and whitespace checks stay as strict as they are.
- `@trace FR-6` and `@trace FR-12` go in a test file under `lib/`. The traceability walker does not scan `e2e/`.
- Tests are written first and must be observed failing before implementation.
- Archive stays blocked until the fake-model browser smoke in `tasks.md` passes. This proposal does not archive the change. Do not start `add-generation-failure` from this folder.
