# Generation Failure Specification

## Purpose

This capability defines how the AI Requirements Assistant handles LLM or API failures after a Business Analyst submits a valid Generate request. When the provider errors or a hung call hits the time budget, the BA sees a specific, visible error on the same page, keeps their raw business request in the text field, and can try Generate again — without a generic HTTP 500 page or a silent failure (FR-8, NFR-3). Empty or whitespace-only input validation is intentionally owned by request-intake (FR-7) and is out of scope here.

## Requirements

### Requirement: Visible error on provider failure

When an LLM or API call fails for a Generate request that used a non-empty raw business request (after trim), the application SHALL show a specific, visible error message on the same page so the failure is not silent (FR-8, NFR-3). Exact sentence wording is an implementation choice; the message SHALL be clearly identifiable as a generation failure. The application SHALL NOT present a generic HTTP 500 error page (NFR-3).

#### Scenario: Provider error shows a clear on-page message

- **GIVEN** the Business Analyst has entered a raw business request that is not empty or whitespace-only
- **AND** the Generate control is available
- **WHEN** the Business Analyst activates Generate
- **AND** the LLM or API call fails with a provider or API error (not a client-side empty-input validation)
- **THEN** the page shows a specific, visible error message indicating that generation failed
- **AND** the Business Analyst is not shown a generic HTTP 500 error page
- **AND** the failure is not silent (no success-looking empty result with no error indication)

### Requirement: Visible error on generation timeout

When a Generate request’s LLM or API call does not complete within 30 seconds (NFR-4), the application SHALL treat that hung call as a generation failure and SHALL surface a specific, visible error message on the same page rather than spinning indefinitely (FR-8, NFR-3, NFR-4). The application SHALL NOT present a generic HTTP 500 error page for this timeout (NFR-3).

#### Scenario: Hung call surfaces as timeout failure within 30 seconds

- **GIVEN** the Business Analyst has entered a raw business request that is not empty or whitespace-only
- **AND** the Generate control is available
- **WHEN** the Business Analyst activates Generate
- **AND** the LLM or API call does not return a successful result within 30 seconds
- **THEN** within 30 seconds of activating Generate, the page shows a specific, visible error message indicating that generation failed
- **AND** the UI does not remain in an indefinite in-progress / spinning state with no error
- **AND** the Business Analyst is not shown a generic HTTP 500 error page

### Requirement: Preserve input and allow retry after failure

When generation fails because of an LLM or API error or timeout, the application SHALL leave the raw business request text in the input field unchanged and SHALL leave the Generate control usable so the Business Analyst can try Generate again (FR-8, NFR-3).

#### Scenario: Provider error keeps input and allows retry

- **GIVEN** the Business Analyst has entered a non-empty raw business request
- **WHEN** Generate fails because of an LLM or API provider error
- **THEN** the same raw business request text remains in the text field
- **AND** the Generate control is available so the Business Analyst can activate Generate again

#### Scenario: Timeout keeps input and allows retry

- **GIVEN** the Business Analyst has entered a non-empty raw business request
- **WHEN** Generate fails because the LLM or API call timed out (did not complete within 30 seconds)
- **THEN** the same raw business request text remains in the text field
- **AND** the Generate control is available so the Business Analyst can activate Generate again

### Requirement: Exclusion of empty-input validation

This capability SHALL NOT own validation of empty or whitespace-only raw business requests. That behavior (inline message, no LLM call) is owned by request-intake under FR-7. Generation-failure SHALL apply only after a valid Generate that proceeds to an LLM or API call.

#### Scenario: Empty-input path is out of scope

- **GIVEN** a tester is evaluating generation-failure behavior
- **WHEN** the raw business request is empty or whitespace-only and Generate is activated
- **THEN** that path is not covered by this specification
- **AND** it is expected to be handled by request-intake (FR-7), not by generation-failure
