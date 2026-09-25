# Spec Delta: localization

## Purpose

Shows all interface text in Ukrainian (default) or English, lets the player switch language from the
top-right corner, remembers the choice, and formats numbers according to the selected language.

Scenario tags: `[unit]` = Vitest test in `lib/i18n/i18n.test.ts` (dictionaries, `t`, number
formatting) or `lib/game/preferences.test.ts` (language preference), `[e2e]` = Playwright test in
`e2e/add-foundation.spec.ts`.

## ADDED Requirements

### Requirement: Dictionaries with identical keys
There SHALL be exactly two dictionaries, `uk` and `en`, with identical key sets and no empty values.
Stage 1 SHALL contain exactly these keys with these values (DECISION: copy needs human confirm):

| Key | uk | en |
|---|---|---|
| `mainButton.label` | `Клік` | `Click` |
| `balance.ariaLabel` | `Баланс: {value}` | `Balance: {value}` |
| `theme.switchToDark` | `Увімкнути темну тему` | `Switch to dark theme` |
| `theme.switchToLight` | `Увімкнути світлу тему` | `Switch to light theme` |
| `language.short` | `УКР` | `ENG` |
| `language.switch` | `Змінити мову на англійську` | `Switch language to Ukrainian` |
| `reset.button` | `Скинути прогрес` | `Reset progress` |
| `reset.title` | `Скинути весь прогрес?` | `Reset all progress?` |
| `reset.body` | `Баланс і кліки буде обнулено. Тема й мова залишаться.` | `Your balance and clicks will be set to zero. Theme and language stay.` |
| `reset.confirm` | `Скинути` | `Reset` |
| `reset.cancel` | `Скасувати` | `Cancel` |

#### Scenario: Key parity [unit]
- **WHEN** the key sets of `uk` and `en` are compared (sorted)
- **THEN** they are identical

#### Scenario: No empty values [unit]
- **WHEN** every value of `uk` and `en` is checked
- **THEN** each is a string with `trim().length > 0`

#### Scenario: Required Stage 1 keys and copy [unit]
- **WHEN** the dictionaries are read
- **THEN** the key set equals exactly the 11 keys in the table above
- **AND** `uk["mainButton.label"]` is `Клік` and `en["mainButton.label"]` is `Click`
- **AND** `uk["reset.button"]` is `Скинути прогрес` and `en["reset.button"]` is `Reset progress`

### Requirement: Translation function
`t(language, key, params?)` SHALL return the dictionary value for the language and replace every
`{name}` placeholder with `String(params[name])`. Placeholders without a matching param SHALL stay
unchanged.

#### Scenario: Plain lookup [unit]
- **WHEN** `t("uk", "mainButton.label")` and `t("en", "mainButton.label")` are called
- **THEN** the results are `Клік` and `Click`

#### Scenario: Interpolation [unit]
- **WHEN** `t("en", "balance.ariaLabel", { value: "1,234" })` is called
- **THEN** the result is `Balance: 1,234`
- **WHEN** `t("uk", "balance.ariaLabel", { value: 7 })` is called
- **THEN** the result is `Баланс: 7`

#### Scenario: Missing param keeps placeholder [unit]
- **WHEN** `t("en", "balance.ariaLabel")` is called
- **THEN** the result is `Balance: {value}`

### Requirement: Number formatting
The balance SHALL be formatted with the grouping rules of the current language: `uk` uses U+00A0
(no-break space) as the thousands separator, `en` uses a comma.

#### Scenario: Format numbers [unit]
- **WHEN** `formatNumber(0, "uk")`, `formatNumber(999, "uk")`, `formatNumber(1234, "uk")`, `formatNumber(1234567, "uk")` are called
- **THEN** the results are `"0"`, `"999"`, `"1 234"`, `"1 234 567"`
- **WHEN** `formatNumber(1234, "en")` and `formatNumber(1234567, "en")` are called
- **THEN** the results are `"1,234"` and `"1,234,567"`

### Requirement: Language preference
The language SHALL default to `uk`. The saved value SHALL be read from `dopamine-clicker:lang`;
only the exact strings `"uk"` and `"en"` are valid, anything else counts as "no saved choice"
(default `uk`).

#### Scenario: Parse and resolve language [unit]
- **WHEN** the raw values `"uk"`, `"en"`, `null`, `""`, `"EN"`, `"ua"`, `"de"` are parsed
- **THEN** the results are `"uk"`, `"en"`, `null`, `null`, `null`, `null`, `null` respectively
- **WHEN** language is resolved from `null`
- **THEN** the result is `"uk"`
- **WHEN** language is resolved from `"en"`
- **THEN** the result is `"en"`

#### Scenario: Toggle language [unit]
- **WHEN** `"uk"` is toggled **THEN** the result is `"en"`
- **WHEN** `"en"` is toggled **THEN** the result is `"uk"`

#### Scenario: Load and save language preference [unit]
- **GIVEN** an in-memory storage with `dopamine-clicker:lang` = `"de"`
- **WHEN** preferences are loaded
- **THEN** `language` is `"uk"`
- **WHEN** language `"en"` is saved
- **THEN** the save returns `true`, `getItem("dopamine-clicker:lang")` is `"en"`, and loading preferences gives `language: "en"`

### Requirement: Language switcher in the UI
The page SHALL render all text from the dictionaries and set `<html lang>` to the current language.
A button `[data-testid="lang-toggle"]` next to the theme toggle SHALL show `language.short` of the
current language, carry `language.switch` as its `aria-label`, switch to the other language on
click, and save the choice to `dopamine-clicker:lang`.

#### Scenario: Ukrainian by default [e2e]
- **GIVEN** empty storage and browser locale `en-US` (Playwright default)
- **WHEN** the page `/` is loaded
- **THEN** `<html>` has `lang="uk"`
- **AND** `[data-testid="main-button"]` has text `Клік`
- **AND** `[data-testid="reset"]` has text `Скинути прогрес`
- **AND** `[data-testid="lang-toggle"]` has text `УКР`

#### Scenario: Switch to English and persist [e2e]
- **GIVEN** the page `/` is loaded with empty storage
- **WHEN** the user clicks `[data-testid="lang-toggle"]`
- **THEN** `<html>` has `lang="en"`, the main button text is `Click`, the reset text is `Reset progress`, the lang toggle text is `ENG`
- **AND** `localStorage["dopamine-clicker:lang"]` is `"en"`
- **WHEN** the page is reloaded
- **THEN** `<html>` has `lang="en"` and the main button text is `Click`

#### Scenario: Switch back to Ukrainian [e2e]
- **GIVEN** `localStorage["dopamine-clicker:lang"]` is seeded with `en` before the first page load
- **WHEN** the page `/` is loaded and the user clicks `[data-testid="lang-toggle"]`
- **THEN** `<html>` has `lang="uk"`, the main button text is `Клік`, and `localStorage["dopamine-clicker:lang"]` is `"uk"`

#### Scenario: Balance formatting follows language [e2e]
- **GIVEN** `localStorage["dopamine-clicker:save"]` is seeded with `{"version":1,"state":{"balance":1234,"totalClicks":1234}}` and `localStorage["dopamine-clicker:lang"]` with `en` before the first page load
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="balance"]` has text `1,234`
- **WHEN** the user clicks `[data-testid="lang-toggle"]`
- **THEN** `[data-testid="balance"]` text with whitespace normalized to plain spaces is `1 234`

#### Scenario: Reset dialog is localized [e2e]
- **GIVEN** the page `/` is loaded in English (lang toggled once)
- **WHEN** the user clicks `[data-testid="reset"]`
- **THEN** `[data-testid="reset-confirm"]` has text `Reset` and `[data-testid="reset-cancel"]` has text `Cancel`
