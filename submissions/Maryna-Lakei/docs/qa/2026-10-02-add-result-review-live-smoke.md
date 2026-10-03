# Live OpenAI verification — add-result-review

- **Date:** 2026-10-02
- **Witness:** Maryna Lakei (owner), reported after a manual browser check
- **Slice:** `add-result-review`
- **Provider:** OpenAI, live model from local `.env.local` (ADR-0003 records `gpt-4.1-mini`)
- **Credentials:** a local `.env.local` only. The key is not in this file, not in source, and not in Git.

## What was observed

Without reloading the page, the owner ran Generate twice on the live model.

1. The first request displayed three labeled sections: User Story, Acceptance Criteria, and Clarifying Questions.
2. The owner changed the source request and clicked Generate again.
3. The previous result was replaced. Only the new User Story, Acceptance Criteria, and Clarifying Questions remained.

## What this record does not contain

The raw requests and the generated sentences were not pasted into the project. They are not reconstructed here. The API key is not recorded.

## Relation to the automated smoke

The repeatable check remains the fake-model Chromium suite (`REQUIREMENTS_MODEL_MODE=fake`), which does not call OpenAI. This note is the owner’s live confirmation of labeled sections (FR-6) and replacement of the previous result (FR-12).
