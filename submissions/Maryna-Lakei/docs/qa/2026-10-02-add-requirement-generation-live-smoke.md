# Live OpenAI verification — add-requirement-generation

- **Date:** 2026-10-02
- **Witness:** Maryna Lakei (owner), reported after a manual browser check
- **Slice:** `add-requirement-generation`
- **Provider:** OpenAI, model from local `LLM_MODEL` (ADR-0003 records `gpt-4.1-mini`)
- **Credentials:** a local `.env.local` only. The key is not in this file, not in source, and not in Git.

## What was observed

The owner entered a real business request and activated Generate in the browser. The page returned:

- one User Story
- Acceptance Criteria
- 5 Clarifying Questions

The owner reported that the live OpenAI integration works.

## What this record does not contain

The raw request and the generated sentences were not pasted into the project. They are not reconstructed here. The API key is not recorded.

## Relation to the automated smoke

The repeatable check remains the fake-model Chromium suite (`REQUIREMENTS_MODEL_MODE=fake`), which does not call OpenAI. This note is the owner’s live confirmation of the same successful shape on the real provider.
