# Spec Delta: localization

Stage 2 adds the shop, item, skin-toggle and helper copy, and updates the reset confirmation text
(reset now also wipes purchases).

Scenario tags: `[unit]` = Vitest test in `lib/i18n/i18n.test.ts`. Shop copy in the browser is
covered by `[e2e]` scenarios in the shop, button-skins, page-decor and helpers deltas.

## MODIFIED Requirements

### Requirement: Dictionaries with identical keys
There SHALL be exactly two dictionaries, `uk` and `en`, with identical key sets and no empty values.
They SHALL contain exactly these 44 keys with these values (DECISION (confirmed): Stage 2
copy, design D18). The Ukrainian apostrophe is U+2019 (`’`). `{price}` and `{count}` / `{rate}` are
interpolated already formatted with `formatNumber`.

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
| `reset.body` | `Баланс, кліки й покупки буде обнулено. Тема й мова залишаться.` | `Your balance, clicks and purchases will be reset. Theme and language stay.` |
| `reset.confirm` | `Скинути` | `Reset` |
| `reset.cancel` | `Скасувати` | `Cancel` |
| `shop.title` | `Магазин` | `Shop` |
| `shop.category.skins` | `Скіни` | `Skins` |
| `shop.category.decor` | `Декор` | `Decor` |
| `shop.category.upgrades` | `Покращення` | `Upgrades` |
| `shop.buy` | `Купити за {price}` | `Buy for {price}` |
| `shop.owned` | `Куплено` | `Owned` |
| `shop.requires` | `Потрібно: {item}` | `Requires: {item}` |
| `shop.count` | `Маєте: {count}` | `Owned: {count}` |
| `skin.on` | `Увімкнено` | `On` |
| `skin.off` | `Вимкнено` | `Off` |
| `item.soft-shadow.name` | `М’яка тінь` | `Soft shadow` |
| `item.soft-shadow.description` | `Тінь, що глибшає під курсором і при натисканні` | `A shadow that deepens on hover and press` |
| `item.squish.name` | `Желе` | `Squish` |
| `item.squish.description` | `Кнопка сплющується й пружинить після кліку` | `Jelly-like squash and spring-back on click` |
| `item.floating-number.name` | `Спливаючі +N` | `Floating +N` |
| `item.floating-number.description` | `Зароблене спливає від курсора й тане` | `The earned amount floats up from the cursor and fades` |
| `item.jumping-cap.name` | `Кепка-стрибунець` | `Jumping cap` |
| `item.jumping-cap.description` | `Кепка на кнопці підстрибує з кожним кліком` | `A cap sits on the button and hops on each click` |
| `item.gold.name` | `Золото` | `Gold` |
| `item.gold.description` | `Металева золота поверхня` | `Metallic gold surface` |
| `item.sleeping-cat.name` | `Сплячий кіт` | `Sleeping cat` |
| `item.sleeping-cat.description` | `Кіт повільно дихає, часом ворушить вухами` | `A cat that slowly breathes, ears twitch now and then` |
| `item.lava-lamp.name` | `Лава-лампа` | `Lava lamp` |
| `item.lava-lamp.description` | `Краплі воску здіймаються й зливаються` | `Blobs rising and merging` |
| `item.hydraulic-press.name` | `Гідравлічний прес` | `Hydraulic press` |
| `item.hydraulic-press.description` | `Прес повільно чавить нескінченну низку предметів` | `A press slowly crushing an endless line of objects` |
| `item.double-click.name` | `Подвійний клік` | `Double click` |
| `item.double-click.description` | `Кожен клік приносить ×2` | `Each click is worth ×2` |
| `item.triple-click.name` | `Потрійний клік` | `Triple click` |
| `item.triple-click.description` | `Кожен клік приносить ×3 (замість ×2)` | `Each click is worth ×3 (replaces ×2)` |
| `item.monkey.name` | `Мавпочка` | `Monkey` |
| `item.monkey.description` | `Сама тисне свою кнопку: 1 клік за секунду` | `Presses its own button: 1 click per second` |
| `helper.monkey.label` | `Мавпочки: {count} (+{rate} за секунду)` | `Monkeys: {count} (+{rate} per second)` |

#### Scenario: Key parity [unit]
- **WHEN** the key sets of `uk` and `en` are compared (sorted)
- **THEN** they are identical

#### Scenario: No empty values [unit]
- **WHEN** every value of `uk` and `en` is checked
- **THEN** each is a string with `trim().length > 0`

#### Scenario: Required Stage 1 keys and copy [unit]
- **WHEN** the dictionaries are read
- **THEN** the key set of each equals exactly the 44 keys in the table above
- **AND** `uk["mainButton.label"]` is `Клік` and `en["mainButton.label"]` is `Click`
- **AND** `uk["reset.button"]` is `Скинути прогрес` and `en["reset.button"]` is `Reset progress`
- **AND** `uk["reset.body"]` is `Баланс, кліки й покупки буде обнулено. Тема й мова залишаться.`

#### Scenario: Every shop item has a name and description [unit]
- **WHEN** for each of the 11 ids `soft-shadow`, `squish`, `floating-number`, `jumping-cap`, `gold`, `sleeping-cat`, `lava-lamp`, `hydraulic-press`, `double-click`, `triple-click`, `monkey` the keys `item.<id>.name` and `item.<id>.description` are looked up in `uk` and `en`
- **THEN** all 44 lookups return the values from the table above

#### Scenario: Shop interpolation [unit]
- **WHEN** `t("uk", "shop.buy", { price: "1 500" })`, `t("en", "shop.buy", { price: "1,500" })`, `t("uk", "shop.requires", { item: "Подвійний клік" })`, `t("en", "helper.monkey.label", { count: 3, rate: 3 })` are called
- **THEN** the results are `Купити за 1 500`, `Buy for 1,500`, `Потрібно: Подвійний клік`, `Monkeys: 3 (+3 per second)`
