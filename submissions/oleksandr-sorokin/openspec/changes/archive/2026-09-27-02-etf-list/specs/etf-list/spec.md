# Spec Delta

## Purpose

The `/etfs` list page lets a retail investor browse, sort, and paginate the full demo ETF
catalogue — with a disclaimer banner on every page to make clear the data is not live or
investment advice.

## ADDED Requirements

### Requirement: Root path redirects to the ETF list
The system SHALL redirect GET `/` to `/etfs` without rendering any content.

#### Scenario: Root redirect
- **WHEN** a user navigates to `/`
- **THEN** the browser is redirected to `/etfs` and the ETF list page is shown

### Requirement: ETF list page renders an 8-column table
The system SHALL render a table at `/etfs` with the columns: ticker, name, issuer, asset class,
region, TER %, AUM, and 1Y return. Every row SHALL be a link to `/etfs/[ticker]`.

#### Scenario: All required columns are present
- **WHEN** a user loads `/etfs` with data available
- **THEN** the table contains exactly the columns: ticker, name, issuer, asset class, region, TER %, AUM, 1Y return

#### Scenario: Row links to detail page
- **WHEN** a user clicks any row in the ETF table
- **THEN** the browser navigates to `/etfs/[ticker]` for that row's ETF

### Requirement: List page paginates at 20 rows
The system SHALL display at most 20 ETF rows per page and SHALL show a "Showing X–Y of N"
count beneath the table.

#### Scenario: Default page shows first 20 rows
- **WHEN** `/etfs` is loaded with no page parameter and more than 20 ETFs are available
- **THEN** at most 20 rows are displayed and the count reads "Showing 1–20 of N"

#### Scenario: Page 2 shows the next batch
- **WHEN** the user navigates to page 2 (e.g. `?page=2`)
- **THEN** rows 21–40 are displayed and the count reads "Showing 21–40 of N"

### Requirement: Any table column can be sorted ascending or descending
The system SHALL allow the user to sort by any column (ticker, name, issuer, asset class, region,
TER %, AUM, 1Y return) by clicking its header. A first click sorts ascending; a second click on
the same header sorts descending. Only one column may be active at a time. Sort state SHALL be
stored in the URL `searchParams`.

#### Scenario: Clicking a column header sorts ascending
- **WHEN** a user clicks a column header for the first time
- **THEN** the table rows are re-ordered ascending by that column and the URL reflects the active sort

#### Scenario: Clicking the active column header toggles to descending
- **WHEN** a user clicks the currently-sorted column header
- **THEN** the sort direction toggles to descending and the URL is updated accordingly

#### Scenario: Sort state survives page reload
- **WHEN** the user copies the URL with a sort parameter and opens it in a new tab
- **THEN** the same sort order is applied

### Requirement: Empty state shown when no ETFs match
The system SHALL display a "No ETFs match your filters." message and a "Clear filters" button
when the filtered result set is empty. When no filter is active and the data set itself is empty
the message SHALL read "No ETF data available."

#### Scenario: Empty filtered result
- **WHEN** active filters produce zero results
- **THEN** the table is replaced by "No ETFs match your filters." and a "Clear filters" button is visible

#### Scenario: Clear filters button resets the view
- **WHEN** a user clicks "Clear filters"
- **THEN** all filter and search URL parameters are removed and the full list is shown

### Requirement: Disclaimer banner is shown on every page
Every page in the application SHALL display a full-width banner with the text
"Demo data — not investment advice".

#### Scenario: Banner present on the list page
- **WHEN** a user loads `/etfs`
- **THEN** the disclaimer banner "Demo data — not investment advice" is visible on the page

#### Scenario: Banner present on page 2
- **WHEN** a user navigates to `/etfs?page=2`
- **THEN** the disclaimer banner is still visible
