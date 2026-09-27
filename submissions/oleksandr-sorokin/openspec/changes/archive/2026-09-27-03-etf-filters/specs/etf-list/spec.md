# Spec Delta

## MODIFIED Requirements

### Requirement: ETF list page applies filter and search params from URL
The system SHALL read filter and search URL params (`search`, `assetClass`, `region`, `issuer`,
`distribution`, `maxTer`) from `searchParams` and pass them to the `list()` call, so the
rendered table reflects all active filters. When no filter params are present, the full
unfiltered catalogue is shown.

#### Scenario: Filter params forwarded to list query
- **WHEN** a user loads `/etfs?assetClass=equity&region=global`
- **THEN** the table shows only ETFs with assetClass "equity" AND region "global"

#### Scenario: No filter params shows full catalogue
- **WHEN** a user loads `/etfs` with no filter params
- **THEN** the full catalogue (subject to pagination) is displayed
