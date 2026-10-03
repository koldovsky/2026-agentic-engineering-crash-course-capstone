# Owner browser verification — add-generation-failure

- **Date:** 2026-10-02
- **Witness:** Maryna Lakei (owner), reported after a manual browser check
- **Slice:** `add-generation-failure`
- **Model:** factory fake model (`REQUIREMENTS_MODEL_MODE=fake`). This check did not use the live OpenAI API.
- **Credentials:** none. No API key was read, pasted, or stored for this check.

## What was observed

1. The provider-error scenario showed `Generation failed. You can try Generate again.`
2. The timeout scenario showed the same failure message.
3. Empty input showed only `Enter a business request.`
4. After those failure scenarios, a normal request showed a new User Story, Acceptance Criteria, and Clarifying Questions, and that result replaced the previous one.

## What this record does not contain

The raw requests and the generated sentences were not pasted into the project. They are not reconstructed here. No API key is recorded.

## Relation to the automated smoke

The repeatable check remains the fake-model Chromium suite. This note is the owner’s confirmation of the failure sentence (FR-8, NFR-3), the empty-input message (FR-7), and replacement by a later success (FR-12).
