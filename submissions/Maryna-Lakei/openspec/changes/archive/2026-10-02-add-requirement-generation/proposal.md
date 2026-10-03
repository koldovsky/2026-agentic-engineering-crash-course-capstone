# Change: add-requirement-generation

## Why

This is slice 2 of AI Requirements Assistant. Slice 1 shipped the public page and a one-second stub, `holdValidatedRequest` in `lib/requirements/actions.ts`. The form calls that stub after validation and renders no requirement text. A Business Analyst who enters a real request still sees no User Story, Acceptance Criteria, or Clarifying Questions.

FR-3, FR-4, FR-5, FR-9, FR-10, and FR-11 are the requirements this change owns. NFR-4 travels with the call: it completes or fails within 30 seconds. Empty or whitespace-only input stays on the slice-1 path and still never calls the model (FR-7).

The provider and model are already accepted in ADR-0003. This change does not put a vendor name into the requirement sentences (TC-2). The choice is recorded in `design.md`.

## What Changes

- Replace `holdValidatedRequest` with one server-side LLM call for an eligible Generate (TC-2). The API key stays in server environment variables and is never sent to the browser.
- Return one User Story in the form “As a / I want / so that” (FR-3, FR-9).
- Return Acceptance Criteria as a short bullet list. A Given/When/Then format is not required (FR-4, FR-10).
- Return 3 to 5 Clarifying Questions about gaps in the raw business request (FR-5, FR-11).
- Finish with those shapes, or fail, within 30 seconds. Do not stream the model response (NFR-4, BC-5). Do not automatically rewrite the result afterward (BC-2).
- After success, show the three shapes on the page so a Chromium test with a fake model can see them.

This change does not add labeled result sections or replacement of a previous result (FR-6, FR-12). Those belong to `add-result-review`. It does not add the failure-message wording (FR-8). A missing key or a failed call returns a structured failure the page can hold, and must not become a generic HTTP 500 (NFR-3). The visible sentence belongs to `add-generation-failure`.

Tests use an injected fake model. They do not call the live provider and do not read a real key.

## Impact

- Spec: `requirement-generation` under `## ADDED Requirements`, with the baseline requirement and scenario text unchanged.
- Code that follows this folder: a pure parser, one server-side call with an injectable client, and a result region on the existing form. No database schema and no authentication.
- The slice-1 stub is removed. Leaving `holdValidatedRequest` in place after this slice is a defect.
- The owner creates `submissions/Maryna-Lakei/.env.local` later. Agents must not create that file and must not commit a key. The key must not use a `NEXT_PUBLIC_` name.
- Tests are written first and must be observed failing before implementation.
- Archive stays blocked until the fake-model browser smoke in `tasks.md` passes. That smoke does not need a live key. This proposal does not archive the change.
