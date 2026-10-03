# Change: add-request-intake

## Why

This is slice 1 of AI Requirements Assistant. A Business Analyst needs a public English desktop page where they can enter a raw business request and click Generate. No LLM output is produced here. Later slices add the model call, the labeled result sections, and provider-failure copy. This slice creates the page those slices attach to.

FR-1, FR-2, FR-7, and FR-13 are the requirements this change owns. NFR-1, NFR-2, and NFR-5 travel with the page: English copy, no login, and a desktop web page. The capability plan has no earlier slice. Nothing in this change depends on generation, review, or failure handling.

The in-flight disabled state has to be visible before a model exists. The plan proves it with a stubbed delay. The API key is not used.

## What Changes

- Add the public desktop page and a text field for a raw business request (FR-1).
- Add a Generate control the Business Analyst can activate (FR-2).
- Reject only empty or whitespace-only input. Show an inline validation message and do not call an LLM (FR-7). A short non-empty value after trim is eligible. There is no character minimum and no word minimum.
- Disable Generate while a request is in flight (FR-13). Prove that with a stubbed delay, not a live model call. This slice does not read an API key.
- Present the page in English, with no login and no account step (NFR-1, NFR-2, NFR-5, TC-3).

This change does not add a User Story, Acceptance Criteria, or Clarifying Questions (FR-3, FR-4, FR-5, FR-9, FR-10, FR-11). It does not add labeled result sections or result replacement (FR-6, FR-12). It does not add LLM or API failure messaging (FR-8).

Eligible input is any non-empty value after trim, including a single word. That input may start the stubbed delay. It must not be rejected for length.

## Impact

- Spec: `request-intake` is the capability this change adds, under `## ADDED Requirements`. `public-demo` is honored on the page (English, no login, desktop) and is not rewritten.
- Stack for the implementation that follows this folder: Next.js 16 App Router. A pure validation function. A server action that only delays. No database schema, no authentication, no API key.
- Tests: unit tests for validation, plus Chromium checks for the field, Generate, both reject cases, and the disabled control. Tests are written first and must be observed failing before implementation.
- Exclusions stay exclusions: no login, no copy-to-clipboard control, no in-page editor, no character minimum, no word minimum.
- Automated browser checks for this slice use Chromium only (TC-8). Cross-browser testing stays out of scope.
- No new ADR. ADR-0001 already records Next.js, no database, and no auth. The stubbed delay is a slice tactic, replaced when generation is implemented.
- Archive stays blocked until the manual desktop browser smoke in `tasks.md` passes. This proposal does not archive the change.
