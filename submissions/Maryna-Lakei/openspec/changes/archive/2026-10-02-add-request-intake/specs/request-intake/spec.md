# Request Intake Specification

## ADDED Requirements

### Requirement: Raw business request text field

The application SHALL provide a text field where a Business Analyst can enter a raw business request (FR-1). The UI language is English (NFR-1). The demo is public and requires no login (NFR-2, NFR-5, TC-3).

#### Scenario: Text field is available without login

- **GIVEN** the Business Analyst opens the application on desktop
- **WHEN** the page is ready
- **THEN** a text field for entering a raw business request is visible and editable
- **AND** no login or account step is required to use the text field

### Requirement: Generate control

The application SHALL provide a Generate control that the Business Analyst can use to request structured requirement output from the entered raw business request (FR-2).

#### Scenario: Generate control is available

- **GIVEN** the Business Analyst is on the application page with no request in flight
- **WHEN** the page is ready
- **THEN** a Generate control is visible and can be activated

### Requirement: Reject empty or whitespace-only input

When the raw business request is empty or whitespace-only, the application SHALL show an inline validation message and SHALL NOT call the LLM (FR-7). Any non-empty input after trim is eligible for Generate. There is no minimum character count and no minimum word count.

#### Scenario: Empty input shows inline validation and skips LLM

- **GIVEN** the raw business request text field is empty
- **WHEN** the Business Analyst activates Generate
- **THEN** an inline validation message is shown
- **AND** the LLM is not called

#### Scenario: Whitespace-only input shows inline validation and skips LLM

- **GIVEN** the raw business request text field contains only whitespace characters (for example spaces or tabs)
- **WHEN** the Business Analyst activates Generate
- **THEN** an inline validation message is shown
- **AND** the LLM is not called

#### Scenario: Short non-empty input is not rejected by validation

- **GIVEN** the raw business request text field contains a short non-empty value after trim (for example a single word such as "reports")
- **WHEN** the Business Analyst activates Generate
- **THEN** validation does not reject the input for being too short
- **AND** no empty-or-whitespace inline validation message is shown for that reason
- **AND** the request is eligible to proceed (no character-count or word-count rule applies)

### Requirement: Disable Generate while request in flight

While a Generate request is in flight, the Generate control SHALL be disabled (FR-13).

#### Scenario: Generate is disabled during an in-flight request

- **GIVEN** the Business Analyst has activated Generate with a non-empty raw business request
- **AND** the Generate request is still in flight
- **WHEN** the Business Analyst views the Generate control
- **THEN** the Generate control is disabled
- **AND** the Business Analyst cannot start another Generate until the in-flight request completes or fails

### Requirement: English public desktop page

The intake page added by this slice SHALL be a public desktop web page in English. Visible UI copy SHALL be English (NFR-1). A Business Analyst SHALL reach the text field and Generate without logging in or creating an account (NFR-2, TC-3). The page SHALL be a desktop web page, not a native mobile application (NFR-5).

#### Scenario: Intake copy is English

- **GIVEN** the Business Analyst opens the application in a desktop browser
- **WHEN** the page is ready
- **THEN** the visible label for the raw business request text field and the visible label for the Generate control are in English

#### Scenario: Intake page has no login

- **GIVEN** the Business Analyst has no account and is not authenticated
- **WHEN** the Business Analyst opens the application URL in a desktop browser
- **THEN** the raw business request text field and the Generate control are reachable
- **AND** no login, sign-up, or other authentication challenge is shown

#### Scenario: Intake page is a desktop web page

- **GIVEN** the Business Analyst uses a desktop web browser
- **WHEN** the Business Analyst opens the application
- **THEN** the raw business request text field and the Generate control are shown on a desktop web page
- **AND** the application is not presented as a native mobile app

### Requirement: Slice exclusions

This slice SHALL NOT return a User Story, Acceptance Criteria, or Clarifying Questions, and SHALL NOT enforce their shapes (FR-3, FR-4, FR-5, FR-9, FR-10, FR-11 are owned by a later slice). This slice SHALL NOT present labeled generated-result sections and SHALL NOT replace a previous result (FR-6, FR-12 are owned by a later slice). This slice SHALL NOT show an LLM or API failure message (FR-8 is owned by a later slice). This slice SHALL NOT add a minimum character count, a minimum word count, a login, a separate copy-to-clipboard control, or an in-page editor. This slice SHALL NOT read or require an API key.

#### Scenario: Eligible Generate shows no structured output

- **GIVEN** the raw business request text field contains a short non-empty value after trim (for example "reports")
- **WHEN** the Business Analyst activates Generate and that in-flight request completes
- **THEN** the page does not show a User Story, Acceptance Criteria, or Clarifying Questions
- **AND** the page does not show a labeled generated-result section

#### Scenario: No login, copy control, or editor

- **GIVEN** the Business Analyst is on the intake page
- **WHEN** the Business Analyst looks for a login form, a copy-to-clipboard control, or an editor for generated text
- **THEN** none of those controls are present

#### Scenario: Generate does not require an API key

- **GIVEN** no LLM API key is configured for the application
- **WHEN** the Business Analyst opens the page and activates Generate with a short non-empty raw business request
- **THEN** the in-flight behavior still runs
- **AND** the Business Analyst is not asked to supply an API key
