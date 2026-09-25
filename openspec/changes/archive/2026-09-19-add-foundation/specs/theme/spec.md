# Spec Delta: theme

## Purpose

Lets the player switch between a light and a dark theme from the top-right corner, defaulting to
the operating system preference and remembering an explicit choice across reloads and resets.

Scenario tags: `[unit]` = Vitest test in `lib/game/preferences.test.ts`, `[e2e]` = Playwright test
in `e2e/add-foundation.spec.ts` (system preference emulated with `colorScheme` /
`page.emulateMedia`).

## ADDED Requirements

### Requirement: Theme resolution
The effective theme SHALL be the saved choice if one exists, otherwise `dark` when the system
prefers a dark color scheme and `light` otherwise. The saved value SHALL be read from
`dopamine-clicker:theme`; only the exact strings `"light"` and `"dark"` are valid, anything else
counts as "no saved choice".

#### Scenario: Parse saved theme [unit]
- **WHEN** the raw values `"light"`, `"dark"`, `null`, `""`, `"Dark"`, `"blue"`, `"system"` are parsed
- **THEN** the results are `"light"`, `"dark"`, `null`, `null`, `null`, `null`, `null` respectively

#### Scenario: No saved choice follows system [unit]
- **WHEN** the theme is resolved with saved `null` and system-prefers-dark `true`
- **THEN** the result is `"dark"`
- **WHEN** the theme is resolved with saved `null` and system-prefers-dark `false`
- **THEN** the result is `"light"`

#### Scenario: Saved choice wins over system [unit]
- **WHEN** the theme is resolved with saved `"light"` and system-prefers-dark `true`
- **THEN** the result is `"light"`
- **WHEN** the theme is resolved with saved `"dark"` and system-prefers-dark `false`
- **THEN** the result is `"dark"`

#### Scenario: Toggle [unit]
- **WHEN** `"light"` is toggled **THEN** the result is `"dark"`
- **WHEN** `"dark"` is toggled **THEN** the result is `"light"`

#### Scenario: Load and save theme preference [unit]
- **GIVEN** an empty in-memory storage
- **WHEN** preferences are loaded
- **THEN** the result is `{ theme: null, language: "uk" }`
- **WHEN** theme `"dark"` is saved
- **THEN** the save returns `true`, `getItem("dopamine-clicker:theme")` is `"dark"`, and loading preferences gives `theme: "dark"`

#### Scenario: Theme storage errors never throw [unit]
- **GIVEN** a storage whose `getItem` and `setItem` throw
- **WHEN** preferences are loaded
- **THEN** the result is `{ theme: null, language: "uk" }`
- **WHEN** theme `"light"` is saved
- **THEN** the save returns `false` and nothing is thrown

### Requirement: Theme toggle in the UI
The page SHALL apply the effective theme as `data-theme="light"|"dark"` on `<html>` before or at
first paint and style the page from it. A toggle button `[data-testid="theme-toggle"]` in the
top-right corner SHALL switch to the other theme, save the choice to `dopamine-clicker:theme`, and
have a localized `aria-label` describing the action ("Увімкнути темну тему" / "Увімкнути світлу
тему" in Ukrainian). While no choice is saved, the page SHALL follow live changes of the system
preference.

#### Scenario: Default follows system dark [e2e]
- **GIVEN** the browser emulates `colorScheme: "dark"` and storage is empty
- **WHEN** the page `/` is loaded
- **THEN** `<html>` has `data-theme="dark"`
- **AND** `localStorage["dopamine-clicker:theme"]` is `null`

#### Scenario: Default follows system light [e2e]
- **GIVEN** the browser emulates `colorScheme: "light"` and storage is empty
- **WHEN** the page `/` is loaded
- **THEN** `<html>` has `data-theme="light"`

#### Scenario: Live system change without saved choice [e2e]
- **GIVEN** the browser emulates `colorScheme: "light"`, storage is empty, the page `/` is loaded
- **WHEN** the test calls `page.emulateMedia({ colorScheme: "dark" })`
- **THEN** `<html>` has `data-theme="dark"` without a reload

#### Scenario: Toggle saves the choice and survives reload [e2e]
- **GIVEN** the browser emulates `colorScheme: "dark"` and the page `/` is loaded
- **WHEN** the user clicks `[data-testid="theme-toggle"]`
- **THEN** `<html>` has `data-theme="light"` and `localStorage["dopamine-clicker:theme"]` is `"light"`
- **AND** the toggle's `aria-label` is `Увімкнути темну тему`
- **WHEN** the page is reloaded (system still dark)
- **THEN** `<html>` has `data-theme="light"`

#### Scenario: Saved choice ignores later system changes [e2e]
- **GIVEN** the browser emulates `colorScheme: "light"`, the page is loaded and the user clicked the theme toggle once (now `dark`)
- **WHEN** the test calls `page.emulateMedia({ colorScheme: "light" })` again and then `page.emulateMedia({ colorScheme: "dark" })` and back to `"light"`
- **THEN** `<html>` still has `data-theme="dark"`

#### Scenario: Background color differs between themes [e2e]
- **GIVEN** the page `/` is loaded with `colorScheme: "light"`
- **WHEN** the computed `background-color` of `<body>` is read, then the theme toggle is clicked and it is read again
- **THEN** the two values are different
