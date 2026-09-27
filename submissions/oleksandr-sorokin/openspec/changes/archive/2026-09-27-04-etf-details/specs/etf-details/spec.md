# Spec Delta

## Purpose

Provides a dedicated page at `/etfs/[ticker]` where a user can inspect a single ETF's identity,
key performance indicators, price history, holdings, and allocation breakdowns.

## ADDED Requirements

### Requirement: Details page renders full ETF information for a known ticker
The system SHALL render a details page at `/etfs/[ticker]` containing: a header with name, ticker,
issuer badge, asset class, region, and distribution policy; KPI cards for TER, AUM, 1Y / 3Y / 5Y
return, 1Y volatility, and inception date; a price chart; a top-10 holdings table; and sector and
country allocation bar charts.

#### Scenario: Known ticker renders all page sections
- **WHEN** a user navigates to `/etfs/IWDA`
- **THEN** the page shows the ETF name and ticker, KPI cards, a price chart, a holdings table, and allocation charts

#### Scenario: KPI cards display correct values with proper formatting
- **WHEN** the details page is rendered
- **THEN** TER is shown as a percentage (e.g. "0.20%"), AUM is shown in abbreviated form (e.g. "$12.5B"), returns are shown as signed percentages, and inception date is shown as a human-readable date

#### Scenario: Positive return has a green tint, negative return has a red tint
- **WHEN** a return KPI card is rendered
- **THEN** a positive value carries a green visual indicator and a negative value carries a red indicator, and the sign is always included so color is not the only signal

### Requirement: Price chart shows historical prices with selectable range
The system SHALL render a Recharts `LineChart` with 1M, 6M, and 1Y range tabs. The default range
SHALL be 1Y. The chart region SHALL have `role="img"` and `aria-label="Price chart for [TICKER]"`.
Only one range tab SHALL be active at a time; the active tab SHALL have `aria-selected="true"`.

#### Scenario: Default range is 1Y showing all 252 data points
- **WHEN** the details page loads
- **THEN** the price chart renders with the 1Y tab selected and all available daily prices visible

#### Scenario: Selecting 1M tab filters the chart to the last ~21 data points
- **WHEN** a user clicks the "1M" tab
- **THEN** the chart updates to show approximately the last 21 trading days and the 1M tab is marked active

#### Scenario: Selecting 6M tab filters the chart to the last ~126 data points
- **WHEN** a user clicks the "6M" tab
- **THEN** the chart updates to show approximately the last 126 trading days and the 6M tab is marked active

#### Scenario: Chart is accessible
- **WHEN** the price chart is rendered
- **THEN** its container has `role="img"` and `aria-label` containing the ETF ticker

### Requirement: Top-10 holdings table displays rank, name, and weight
The system SHALL render a table listing up to 10 holdings, each with a rank number, holding name,
and weight displayed as a percentage.

#### Scenario: Holdings table renders all provided holdings in rank order
- **WHEN** the ETF has holdings data
- **THEN** the holdings table shows each holding with its rank (1-based), name, and weight formatted as a percentage

#### Scenario: Table has accessible column headers
- **WHEN** the holdings table is rendered
- **THEN** each column header has `scope="col"`

### Requirement: Allocation charts display sector and country weights as horizontal bars
The system SHALL render two separate horizontal Recharts `BarChart` components — one for sector
weights and one for country weights — each showing label and percentage.

#### Scenario: Sector chart renders bars proportional to sector weights
- **WHEN** the details page renders an ETF with sector weight data
- **THEN** a horizontal bar chart displays each sector with a bar proportional to its weight

#### Scenario: Country chart renders bars proportional to country weights
- **WHEN** the details page renders an ETF with country weight data
- **THEN** a horizontal bar chart displays each country with a bar proportional to its weight

### Requirement: Unknown ticker renders a styled 404 page
The system SHALL render a styled not-found page when `getByTicker()` returns null. The page SHALL
display the text "ETF not found" and include a "Back to list" link to `/etfs`.

#### Scenario: Unknown ticker shows 404 page
- **WHEN** a user navigates to `/etfs/UNKNOWN`
- **THEN** the page shows a not-found message and a "Back to list" link, not a crash or blank page

#### Scenario: 404 page still shows the disclaimer banner
- **WHEN** a user navigates to `/etfs/UNKNOWN`
- **THEN** the "Demo data — not investment advice" banner is visible

### Requirement: Back-to-list link preserves the referring filter URL
The system SHALL include a "Back to list" link on the details page. When the referring list URL
is available via the `ref` query parameter, the link SHALL point to that URL; otherwise it SHALL
fall back to `/etfs`.

#### Scenario: Back link uses the ref parameter when present
- **WHEN** the user navigated to the details page from `/etfs?assetClass=equity` and the list encoded that URL as `?ref=…`
- **THEN** the "Back to list" link on the details page navigates back to `/etfs?assetClass=equity`

#### Scenario: Back link falls back to /etfs when ref is absent
- **WHEN** the user opens the details page directly with no `ref` parameter
- **THEN** the "Back to list" link navigates to `/etfs`
