# Spec Delta

## Purpose

Lets a retail investor narrow the ETF catalogue on `/etfs` by text, type, region, cost, issuer,
and distribution policy — with all filter state encoded in the URL so every filtered view is
a shareable link.

## ADDED Requirements

### Requirement: Text search filters by ticker prefix or name substring
The system SHALL filter the ETF list to only those ETFs whose ticker starts with the search
string OR whose name contains the search string. The comparison SHALL be case-insensitive.
The search term SHALL be stored in the URL `search` param.

#### Scenario: Ticker prefix match
- **WHEN** a user enters "IW" in the search input
- **THEN** only ETFs whose ticker starts with "IW" (case-insensitive) OR whose name contains "IW" are shown

#### Scenario: Name substring match
- **WHEN** a user enters "Vanguard" in the search input
- **THEN** only ETFs whose name contains "Vanguard" (case-insensitive) are shown

#### Scenario: Search term persists in URL
- **WHEN** a user enters a search term
- **THEN** the URL `search` param is updated to reflect the term

### Requirement: Asset class multi-select filters ETFs by asset class
The system SHALL allow the user to select one or more asset class values. When at least one
value is selected, only ETFs matching one of those values SHALL be shown. The selected values
SHALL be stored in the URL as one or more `assetClass` params.

#### Scenario: Single asset class selected
- **WHEN** a user selects "bond" from the asset class filter
- **THEN** only ETFs with assetClass equal to "bond" are shown

#### Scenario: Multiple asset classes selected
- **WHEN** a user selects both "equity" and "bond"
- **THEN** ETFs with assetClass equal to "equity" OR "bond" are shown

#### Scenario: Asset class filter clears when deselected
- **WHEN** a user deselects all asset class values
- **THEN** no asset class filter is applied and all asset classes are shown

### Requirement: Region multi-select filters ETFs by region
The system SHALL allow the user to select one or more region values. When at least one value is
selected, only ETFs matching one of those values SHALL be shown. The selected values SHALL be
stored in the URL as one or more `region` params.

#### Scenario: Region filter restricts results
- **WHEN** a user selects "north-america" from the region filter
- **THEN** only ETFs with region equal to "north-america" are shown

### Requirement: Issuer multi-select filters ETFs by issuer
The system SHALL allow the user to select one or more issuer values. When at least one value is
selected, only ETFs matching one of those values SHALL be shown. The selected values SHALL be
stored in the URL as one or more `issuer` params.

#### Scenario: Issuer filter restricts results
- **WHEN** a user selects "Vanguard" from the issuer filter
- **THEN** only ETFs with issuer equal to "Vanguard" are shown

### Requirement: Distribution multi-select filters ETFs by distribution policy
The system SHALL allow the user to select one or more distribution policy values. When at least
one value is selected, only ETFs matching one of those values SHALL be shown. The selected values
SHALL be stored in the URL as one or more `distribution` params.

#### Scenario: Distribution filter restricts results
- **WHEN** a user selects "accumulating" from the distribution filter
- **THEN** only ETFs with distribution equal to "accumulating" are shown

### Requirement: Max TER input filters ETFs at or below a cost threshold
The system SHALL allow the user to enter a maximum TER (%) value. Only ETFs with TER less than
or equal to that value SHALL be shown. The value SHALL be stored in the URL `maxTer` param.
An ETF with TER exactly equal to the threshold SHALL be included.

#### Scenario: TER threshold excludes more expensive funds
- **WHEN** a user sets max TER to 0.20
- **THEN** only ETFs with TER ≤ 0.20 are shown; ETFs with TER > 0.20 are excluded

#### Scenario: TER threshold includes ETFs exactly at the boundary
- **WHEN** a user sets max TER to 0.20
- **THEN** an ETF with TER = 0.20 is included in the results

### Requirement: Filters combine with AND logic
The system SHALL apply multiple active filters together: a result must satisfy every active
filter simultaneously to appear in the list.

#### Scenario: Two filters applied together
- **WHEN** a user selects asset class "equity" AND issuer "iShares"
- **THEN** only ETFs that are both equity AND issued by iShares are shown

### Requirement: Reset filters button clears all filter and search params
The system SHALL display a "Reset filters" button that, when clicked, removes all filter-related
URL params (search, assetClass, region, issuer, distribution, maxTer) while preserving sort
and page params.

#### Scenario: Reset clears all active filters
- **WHEN** a user has active filters and clicks "Reset filters"
- **THEN** all filter params are removed from the URL and the full unfiltered list is shown

#### Scenario: Reset preserves sort state
- **WHEN** a user has both active filters and an active sort and clicks "Reset filters"
- **THEN** the filter params are removed but the sort params remain in the URL

### Requirement: Filter state survives page reload
All filter and search URL params SHALL be read on page load and applied to the displayed results,
so a copied URL opens the same filtered view.

#### Scenario: Shared URL restores filter state
- **WHEN** a user copies the URL with active filters and opens it in a new tab
- **THEN** the same filters are applied and the same results are shown

### Requirement: Changing any filter resets pagination to page 1
When any filter or search param changes, the `page` URL param SHALL be reset to 1 so the user
sees the first page of the new result set.

#### Scenario: Filter change resets to page 1
- **WHEN** a user is on page 2 and changes a filter
- **THEN** the `page` param is removed (or set to 1) and the first page of filtered results is shown
