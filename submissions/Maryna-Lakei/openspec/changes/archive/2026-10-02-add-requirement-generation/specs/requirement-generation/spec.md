# Requirement Generation Specification

## ADDED Requirements

### Requirement: One server-side LLM generation call

Requirement generation SHALL use exactly one server-side LLM API call for an eligible Generate (TC-2). The LLM API key SHALL live only in server environment variables and SHALL never be sent to the browser (TC-2). The provider and model are an implementation choice; this specification SHALL NOT require a named vendor (TC-2).

#### Scenario: Eligible Generate uses one server-side LLM call

- **GIVEN** the Business Analyst has entered a raw business request that is not empty or whitespace-only
- **WHEN** the Business Analyst activates Generate
- **THEN** the application performs one server-side LLM API call to produce the requirement result
- **AND** the call is not initiated from the browser with the LLM API key

#### Scenario: API key is not part of the browser-visible result

- **GIVEN** Generate has completed for a non-empty raw business request
- **WHEN** the Business Analyst inspects the browser-visible page content and network responses delivered to the client for that result
- **THEN** the LLM API key is not present in the browser-visible result
- **AND** the LLM API key is not included in client-delivered response payloads for that Generate

### Requirement: Return a User Story in As a / I want / so that form

When the Business Analyst activates Generate with a raw business request that is not empty or whitespace-only, the application SHALL return a User Story (FR-3). The User Story SHALL be a single story in the form “As a / I want / so that” (FR-9).

#### Scenario: Successful Generate returns one As a / I want / so that User Story

- **GIVEN** the Business Analyst has entered a raw business request that is not empty or whitespace-only
- **WHEN** Generate completes successfully
- **THEN** the result includes exactly one User Story
- **AND** that User Story is expressed in the form “As a / I want / so that”

### Requirement: Return Acceptance Criteria as a short bullet list

When the Business Analyst activates Generate with a raw business request that is not empty or whitespace-only, the application SHALL return Acceptance Criteria (FR-4). Acceptance Criteria SHALL be a short bullet list (FR-10). A Given/When/Then format is not required (FR-10).

#### Scenario: Successful Generate returns Acceptance Criteria as bullets

- **GIVEN** the Business Analyst has entered a raw business request that is not empty or whitespace-only
- **WHEN** Generate completes successfully
- **THEN** the result includes Acceptance Criteria
- **AND** those Acceptance Criteria are presented as a short bullet list
- **AND** a Given/When/Then structure is not required for the Acceptance Criteria to be accepted

### Requirement: Return three to five Clarifying Questions about gaps

When the Business Analyst activates Generate with a raw business request that is not empty or whitespace-only, the application SHALL return Clarifying Questions (FR-5). Clarifying Questions SHALL be 3 to 5 questions about gaps in the raw business request only (FR-11).

#### Scenario: Successful Generate returns three to five gap-focused questions

- **GIVEN** the Business Analyst has entered a raw business request that is not empty or whitespace-only
- **WHEN** Generate completes successfully
- **THEN** the result includes Clarifying Questions
- **AND** the number of Clarifying Questions is between 3 and 5 inclusive
- **AND** each question addresses a gap in the raw business request rather than restating already-stated facts or unrelated topics

### Requirement: Generate completes or fails within 30 seconds

A Generate request SHALL complete with a result or fail within 30 seconds (NFR-4). This capability does not own the wording of failure copy (FR-8); it requires only that the request does not hang beyond the bound.

#### Scenario: Generate finishes within 30 seconds

- **GIVEN** the Business Analyst has entered a raw business request that is not empty or whitespace-only
- **WHEN** the Business Analyst activates Generate
- **THEN** within 30 seconds the request either completes with a User Story, Acceptance Criteria, and Clarifying Questions, or fails
- **AND** the request does not remain in flight longer than 30 seconds without completing or failing

### Requirement: No streaming and no automatic post-generation rewrite

The application SHALL NOT stream the model response to the Business Analyst during Generate (BC-5). After a successful generation, the application SHALL NOT automatically rewrite or improve the generated requirement on its own (BC-2).

#### Scenario: Result is not streamed and is not auto-rewritten

- **GIVEN** the Business Analyst activates Generate with a non-empty raw business request
- **WHEN** generation runs and then completes successfully
- **THEN** the model response is not delivered as a streaming partial update during the request
- **AND** after the result is produced, the application does not automatically rewrite or improve that result without another Generate activation
