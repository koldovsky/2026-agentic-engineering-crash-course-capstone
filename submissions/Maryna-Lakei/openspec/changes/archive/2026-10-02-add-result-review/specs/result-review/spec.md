# Result Review Specification

## ADDED Requirements

### Requirement: Structured labeled result sections

After a successful Generate, the application SHALL present the User Story, Acceptance Criteria, and Clarifying Questions as clearly structured, labeled sections of readable text on the page (FR-6). The Business Analyst SHALL be able to select that text with native browser selection (FR-6).

#### Scenario: Successful Generate shows three labeled sections

- **GIVEN** the Business Analyst has entered a non-empty raw business request
- **WHEN** Generate completes successfully
- **THEN** the page shows three clearly structured sections labeled for User Story, Acceptance Criteria, and Clarifying Questions
- **AND** each section contains readable text for that part of the result

#### Scenario: Generated text supports native browser selection

- **GIVEN** a successful Generate result is visible on the page as labeled sections
- **WHEN** the Business Analyst uses the browser’s native text-selection gesture on that result text
- **THEN** the selected text is highlighted by the browser as selected content
- **AND** no separate copy-to-clipboard control is required for this behavior

### Requirement: No copy, in-page editor, or Regenerate control

The application SHALL NOT provide a separate copy-to-clipboard control for the generated result (BC-5). The application SHALL NOT provide an in-page editor for the generated text; the Business Analyst refines by editing the raw business request and clicking Generate again (BC-5). The application SHALL NOT provide a distinct Regenerate control separate from Generate (BC-5).

#### Scenario: Result UI excludes copy, editor, and Regenerate

- **GIVEN** a successful Generate result is visible on the page
- **WHEN** the Business Analyst reviews the result UI
- **THEN** there is no separate copy-to-clipboard control
- **AND** there is no in-page editor for editing the generated User Story, Acceptance Criteria, or Clarifying Questions in place
- **AND** there is no separate Regenerate control distinct from Generate

### Requirement: Successful Generate replaces previous result

When Generate completes successfully again, the application SHALL replace the previous result on the page with the new User Story, Acceptance Criteria, and Clarifying Questions (FR-12). Only the latest successful result SHALL remain visible as the current result.

#### Scenario: New successful Generate replaces previous result

- **GIVEN** a successful Generate result is already visible on the page
- **AND** the Business Analyst has a non-empty raw business request ready for another Generate
- **WHEN** Generate completes successfully again
- **THEN** the previous result is no longer shown as the current result
- **AND** the page shows the new User Story, Acceptance Criteria, and Clarifying Questions in the labeled sections
