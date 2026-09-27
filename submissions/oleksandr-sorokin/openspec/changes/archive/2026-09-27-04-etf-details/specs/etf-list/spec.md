# Spec Delta

## ADDED Requirements

### Requirement: Row links encode the current filter URL for round-trip navigation
The system SHALL append a `ref` query parameter to each ETF row's href. The value SHALL be the
URL-encoded string of the current list page URL (pathname + search), so the details page can
reconstruct an exact "Back to list" link. The `ref` parameter SHALL NOT affect the ETF the row
links to; clicking a row SHALL still navigate to `/etfs/[ticker]`.

#### Scenario: Row href includes a ref parameter reflecting active filters
- **WHEN** the list page is rendered with active filters (e.g. `?assetClass=equity&sortBy=ter`)
- **THEN** each row's link href is `/etfs/[ticker]?ref=%2Fetfs%3FassetClass%3Dequity%26sortBy%3Dter` (or equivalent encoding)

#### Scenario: Row href includes a ref parameter even with no filters active
- **WHEN** the list page is rendered with no filter parameters
- **THEN** each row's link href is `/etfs/[ticker]?ref=%2Fetfs` (or equivalent encoding of `/etfs`)
