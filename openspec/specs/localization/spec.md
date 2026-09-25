# localization Specification

## Purpose

Shows all interface text in Ukrainian (default) or English, lets the player switch language from the
top-right corner, remembers the choice, and formats numbers according to the selected language.

Scenario tags: `[unit]` = Vitest test in `lib/i18n/i18n.test.ts` (dictionaries, `t`, number
formatting) or `lib/game/preferences.test.ts` (language preference), `[e2e]` = Playwright test in
`e2e/add-foundation.spec.ts`.

## Requirements

### Requirement: Dictionaries with identical keys
There SHALL be exactly two dictionaries, `uk` and `en`, with identical key sets and no empty values.
They SHALL contain exactly these 68 keys with these values (rows 1–44: DECISION (confirmed),
add-shop-v1 design D18; rows 45–68: DECISION (confirmed), design D21). The Ukrainian
apostrophe is U+2019 (`’`). In Ukrainian copy a percent sign is separated from its number by a
no-break space U+00A0 (`5 %`, DECISION (confirmed)); English writes `5%`. `{price}`, `{count}`, `{rate}`, `{level}`, `{max}`, `{value}` and
`{seconds}` are interpolated already formatted with `formatNumber`.

| # | Key | uk | en |
|---|---|---|---|
| 1 | `mainButton.label` | `Клік` | `Click` |
| 2 | `balance.ariaLabel` | `Баланс: {value}` | `Balance: {value}` |
| 3 | `theme.switchToDark` | `Увімкнути темну тему` | `Switch to dark theme` |
| 4 | `theme.switchToLight` | `Увімкнути світлу тему` | `Switch to light theme` |
| 5 | `language.short` | `УКР` | `ENG` |
| 6 | `language.switch` | `Змінити мову на англійську` | `Switch language to Ukrainian` |
| 7 | `reset.button` | `Скинути прогрес` | `Reset progress` |
| 8 | `reset.title` | `Скинути весь прогрес?` | `Reset all progress?` |
| 9 | `reset.body` | `Баланс, кліки й покупки буде обнулено. Тема й мова залишаться.` | `Your balance, clicks and purchases will be reset. Theme and language stay.` |
| 10 | `reset.confirm` | `Скинути` | `Reset` |
| 11 | `reset.cancel` | `Скасувати` | `Cancel` |
| 12 | `shop.title` | `Магазин` | `Shop` |
| 13 | `shop.category.skins` | `Скіни` | `Skins` |
| 14 | `shop.category.decor` | `Декор` | `Decor` |
| 15 | `shop.category.upgrades` | `Покращення` | `Upgrades` |
| 16 | `shop.buy` | `Купити за {price}` | `Buy for {price}` |
| 17 | `shop.owned` | `Куплено` | `Owned` |
| 18 | `shop.requires` | `Потрібно: {item}` | `Requires: {item}` |
| 19 | `shop.count` | `Маєте: {count}` | `Owned: {count}` |
| 20 | `skin.on` | `Увімкнено` | `On` |
| 21 | `skin.off` | `Вимкнено` | `Off` |
| 22 | `item.soft-shadow.name` | `М’яка тінь` | `Soft shadow` |
| 23 | `item.soft-shadow.description` | `Тінь, що глибшає під курсором і при натисканні` | `A shadow that deepens on hover and press` |
| 24 | `item.squish.name` | `Желе` | `Squish` |
| 25 | `item.squish.description` | `Кнопка сплющується й пружинить після кліку` | `Jelly-like squash and spring-back on click` |
| 26 | `item.floating-number.name` | `Спливаючі +N` | `Floating +N` |
| 27 | `item.floating-number.description` | `Зароблене спливає від курсора й тане` | `The earned amount floats up from the cursor and fades` |
| 28 | `item.jumping-cap.name` | `Кепка-стрибунець` | `Jumping cap` |
| 29 | `item.jumping-cap.description` | `Кепка на кнопці підстрибує з кожним кліком` | `A cap sits on the button and hops on each click` |
| 30 | `item.gold.name` | `Золото` | `Gold` |
| 31 | `item.gold.description` | `Металева золота поверхня` | `Metallic gold surface` |
| 32 | `item.sleeping-cat.name` | `Сплячий кіт` | `Sleeping cat` |
| 33 | `item.sleeping-cat.description` | `Кіт повільно дихає, часом ворушить вухами` | `A cat that slowly breathes, ears twitch now and then` |
| 34 | `item.lava-lamp.name` | `Лава-лампа` | `Lava lamp` |
| 35 | `item.lava-lamp.description` | `Краплі воску здіймаються й зливаються` | `Blobs rising and merging` |
| 36 | `item.hydraulic-press.name` | `Гідравлічний прес` | `Hydraulic press` |
| 37 | `item.hydraulic-press.description` | `Прес повільно чавить нескінченну низку предметів` | `A press slowly crushing an endless line of objects` |
| 38 | `item.double-click.name` | `Подвійний клік` | `Double click` |
| 39 | `item.double-click.description` | `Кожен клік приносить ×2` | `Each click is worth ×2` |
| 40 | `item.triple-click.name` | `Потрійний клік` | `Triple click` |
| 41 | `item.triple-click.description` | `Кожен клік приносить ×3 (замість ×2)` | `Each click is worth ×3 (replaces ×2)` |
| 42 | `item.monkey.name` | `Мавпочка` | `Monkey` |
| 43 | `item.monkey.description` | `Сама тисне свою кнопку: 1 клік за секунду` | `Presses its own button: 1 click per second` |
| 44 | `helper.monkey.label` | `Мавпочки: {count} (+{rate} за секунду)` | `Monkeys: {count} (+{rate} per second)` |
| 45 | `item.crit.name` | `Крит` | `Crit` |
| 46 | `item.crit.description` | `Шанс, що клік зарахується ×10: 5 % → 10 % → 15 %` | `Chance for a click to count ×10: 5% → 10% → 15%` |
| 47 | `item.combo.name` | `Комбо` | `Combo` |
| 48 | `item.combo.description` | `Швидкі кліки поспіль піднімають множник до ×2; на паузі він спадає` | `Fast clicks in a row build a multiplier up to ×2; it fades when you pause` |
| 49 | `item.golden-button.name` | `Золота кнопка` | `Golden button` |
| 50 | `item.golden-button.description` | `Часом з’являється на кілька секунд: злови — і 30 с кліки ×7` | `Appears now and then for a few seconds: catch it for 30 s of ×7 clicks` |
| 51 | `item.robot.name` | `Робот` | `Robot` |
| 52 | `item.robot.description` | `Сам тисне свою кнопку: 5 кліків за секунду` | `Presses its own button: 5 clicks per second` |
| 53 | `item.factory.name` | `Фабрика` | `Factory` |
| 54 | `item.factory.description` | `Сама тисне свою кнопку: 40 кліків за секунду` | `Presses its own button: 40 clicks per second` |
| 55 | `item.speed-monkey.name` | `Прискорення мавпочок` | `Monkey speed-up` |
| 56 | `item.speed-monkey.description` | `Мавпочки клікають удвічі швидше за кожен рівень` | `Monkeys click twice as fast per level` |
| 57 | `item.speed-robot.name` | `Прискорення роботів` | `Robot speed-up` |
| 58 | `item.speed-robot.description` | `Роботи клікають удвічі швидше за кожен рівень` | `Robots click twice as fast per level` |
| 59 | `item.speed-factory.name` | `Прискорення фабрик` | `Factory speed-up` |
| 60 | `item.speed-factory.description` | `Фабрики клікають удвічі швидше за кожен рівень` | `Factories click twice as fast per level` |
| 61 | `shop.level` | `Рівень {level} з {max}` | `Level {level} of {max}` |
| 62 | `shop.maxed` | `Максимальний рівень` | `Max level` |
| 63 | `helper.robot.label` | `Роботи: {count} (+{rate} за секунду)` | `Robots: {count} (+{rate} per second)` |
| 64 | `helper.factory.label` | `Фабрики: {count} (+{rate} за секунду)` | `Factories: {count} (+{rate} per second)` |
| 65 | `crit.text` | `КРИТ ×10!` | `CRIT ×10!` |
| 66 | `combo.label` | `Комбо ×{value}` | `Combo ×{value}` |
| 67 | `golden.catch` | `Зловити золоту кнопку` | `Catch the golden button` |
| 68 | `golden.bonus` | `Золотий бонус ×7: {seconds} с` | `Golden bonus ×7: {seconds} s` |

#### Scenario: Key parity [unit]
- **WHEN** the key sets of `uk` and `en` are compared (sorted)
- **THEN** they are identical

#### Scenario: No empty values [unit]
- **WHEN** every value of `uk` and `en` is checked
- **THEN** each is a string with `trim().length > 0`

#### Scenario: Required Stage 1 keys and copy [unit]
- **WHEN** the dictionaries are read
- **THEN** the key set of each equals exactly the 68 keys in the table above
- **AND** `uk["mainButton.label"]` is `Клік` and `en["mainButton.label"]` is `Click`
- **AND** `uk["reset.button"]` is `Скинути прогрес` and `en["reset.button"]` is `Reset progress`
- **AND** `uk["reset.body"]` is `Баланс, кліки й покупки буде обнулено. Тема й мова залишаться.`

#### Scenario: Every shop item has a name and description [unit]
- **WHEN** for each of the 19 ids `soft-shadow`, `squish`, `floating-number`, `jumping-cap`, `gold`, `sleeping-cat`, `lava-lamp`, `hydraulic-press`, `double-click`, `triple-click`, `crit`, `combo`, `golden-button`, `monkey`, `speed-monkey`, `robot`, `speed-robot`, `factory`, `speed-factory` the keys `item.<id>.name` and `item.<id>.description` are looked up with `t` in `uk` and `en`
- **THEN** all 76 lookups return the values from the table above

#### Scenario: Stage 3 copy [unit]
- **WHEN** `t` is called for keys 61–68 of the table without params in `uk` and `en`
- **THEN** each result equals the table value (placeholders kept), e.g. `t("uk", "crit.text")` is `КРИТ ×10!`, `t("en", "shop.maxed")` is `Max level`

#### Scenario: Shop interpolation [unit]
- **WHEN** `t("uk", "shop.buy", { price: "1 500" })`, `t("en", "shop.buy", { price: "1,500" })`, `t("uk", "shop.requires", { item: "Подвійний клік" })`, `t("en", "helper.monkey.label", { count: 3, rate: 3 })` are called
- **THEN** the results are `Купити за 1 500`, `Buy for 1,500`, `Потрібно: Подвійний клік`, `Monkeys: 3 (+3 per second)`

#### Scenario: Percentages use a no-break space in Ukrainian [unit]
- **WHEN** `t("uk", "item.crit.description")` and `t("en", "item.crit.description")` are read
- **THEN** the Ukrainian text is `"Шанс, що клік зарахується ×10: 5\u00A0% → 10\u00A0% → 15\u00A0%"` (each `%` preceded by U+00A0, never by U+0020 or directly by a digit)
- **AND** the English text is `"Chance for a click to count ×10: 5% → 10% → 15%"`

#### Scenario: Stage 3 interpolation [unit]
- **WHEN** `t("uk", "shop.level", { level: 1, max: 3 })`, `t("en", "shop.level", { level: 3, max: 3 })`, `t("uk", "combo.label", { value: "1,5" })`, `t("en", "combo.label", { value: "2" })`, `t("uk", "golden.bonus", { seconds: 30 })`, `t("en", "golden.bonus", { seconds: 29 })`, `t("uk", "helper.robot.label", { count: 1, rate: 5 })`, `t("en", "helper.factory.label", { count: 2, rate: 80 })` are called
- **THEN** the results are `Рівень 1 з 3`, `Level 3 of 3`, `Комбо ×1,5`, `Combo ×2`, `Золотий бонус ×7: 30 с`, `Golden bonus ×7: 29 s`, `Роботи: 1 (+5 за секунду)`, `Factories: 2 (+80 per second)`

#### Scenario: Decimal formatting for the combo meter [unit]
- **WHEN** `formatNumber(1.5, "uk")`, `formatNumber(1.9, "uk")`, `formatNumber(1.5, "en")`, `formatNumber(2, "uk")` are called
- **THEN** the results are `"1,5"`, `"1,9"`, `"1.5"`, `"2"`

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
