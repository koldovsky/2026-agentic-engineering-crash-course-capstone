# Public Demo Specification

## Purpose

This capability owns no functional requirements. It defines the cross-cutting access, localization, and compatibility non-functional requirements for the public desktop demo, plus the MVP technical and business exclusions so other specs do not invent them. The Generate workflow is owned by the other capability specs; this spec only requires that a Business Analyst can reach that workflow without an account. Explicit later and out-of-scope items from BC-2 and BC-5 are stated here as intentional exclusions.

## Requirements

### Requirement: English UI

The application UI SHALL be in English (NFR-1). Labels, buttons, section headings, validation messages, and error messages presented to the Business Analyst SHALL use English copy.

#### Scenario: UI copy is English

- **GIVEN** the Business Analyst opens the application in a desktop browser
- **WHEN** the Business Analyst views the page chrome and interactive controls (including Generate and any validation or error text that may appear)
- **THEN** all visible UI copy is in English

### Requirement: Public access without login

The demo SHALL be public: a Business Analyst SHALL be able to use the Generate workflow without logging in or creating an account (NFR-2). The application SHALL NOT require authentication to open the page or to reach Generate (NFR-2, TC-3).

#### Scenario: Page is usable with no login

- **GIVEN** the Business Analyst has no account and is not authenticated
- **WHEN** the Business Analyst opens the application URL in a desktop browser
- **THEN** the page loads and the Generate workflow is reachable without a login or sign-up step
- **AND** no authentication challenge is presented before the BA can enter a raw business request and use Generate

### Requirement: Desktop web application and Chromium E2E

The application SHALL be a desktop web application (NFR-5). Cross-browser testing SHALL NOT be required for this capstone (NFR-5). Automated end-to-end verification SHALL use Chromium; cross-browser end-to-end testing is out of scope (TC-8).

#### Scenario: Desktop web surface

- **GIVEN** the Business Analyst uses a desktop web browser
- **WHEN** the Business Analyst opens the application
- **THEN** the application is presented as a desktop web page (not a native mobile app)

#### Scenario: Automated E2E uses Chromium only

- **GIVEN** the project’s automated end-to-end verification suite
- **WHEN** E2E tests are run
- **THEN** they execute against Chromium
- **AND** cross-browser E2E (additional browsers beyond Chromium) is not required and is out of scope

### Requirement: No authentication, database, email, or payments

MVP SHALL include no authentication, no database, no email, and no payments (TC-3). The application SHALL NOT require user accounts, persisted requirement storage, email delivery, or payment flows to use the demo.

#### Scenario: No auth, database, email, or payment surfaces

- **GIVEN** the Business Analyst uses the public demo
- **WHEN** the Business Analyst inspects the available product surfaces for MVP
- **THEN** there is no login, registration, or account-management flow
- **AND** there is no database-backed requirement history or persisted storage UI
- **AND** there is no email-sending feature
- **AND** there is no payments or checkout feature

### Requirement: Later exclusions from BC-2

MVP SHALL NOT include the BC-2 later items: user accounts and authentication; database and requirement history; Jira integration; document upload and RAG; multiple projects/workspaces; payments; mobile application; or automatic post-generation rewriting of requirements (BC-2).

#### Scenario: BC-2 later items are absent from MVP

- **GIVEN** the MVP public demo as delivered
- **WHEN** the Business Analyst looks for accounts, history, Jira, upload/RAG, workspaces, payments, a mobile app, or automatic post-generation rewriting
- **THEN** none of those surfaces are present
- **AND** their absence is intentional scope (BC-2), not a defect

### Requirement: Outside-MVP exclusions from BC-5

MVP SHALL NOT include in-page editing of generated text, a separate copy-to-clipboard control, a distinct Regenerate control, streaming the model response, a dark theme, or any persistent rate limit or quota (BC-5). The BA SHALL refine by editing the raw business request and clicking Generate again (BC-5).

#### Scenario: BC-5 MVP exclusions are absent

- **GIVEN** a page where the Business Analyst can run Generate
- **WHEN** the Business Analyst reviews the UI for in-page editing, a copy button, a separate Regenerate control, streaming output, a dark theme, or a persistent rate-limit/quota indicator
- **THEN** none of those features are present
- **AND** their absence is intentional scope (BC-5), not a defect
- **AND** refining output means editing the raw business request and clicking Generate again
