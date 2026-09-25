# Spec Delta: shop

## Purpose

A shop box that appears after the first 10 clicks and lists items progressively, so there is always
a next goal. Buying spends balance; items the player cannot afford yet are shown disabled with their
price.

Scenario tags: `[unit]` = Vitest test in `lib/game/shop.test.ts`, `[e2e]` = Playwright test in
`e2e/add-shop-v1.spec.ts` (viewport 1280 × 720, default language Ukrainian, empty storage unless
seeded). Notation `FRESH`, `S({...})`, `V2(...)` is defined in `design.md`.

## ADDED Requirements

### Requirement: Shop catalog
`SHOP_CATALOG` SHALL list exactly these 11 items in this order (display order and canonical order
of all state arrays), with `SHOP_UNLOCK_CLICKS = 10` and `PRICE_GROWTH = 1.15`
(revealAt values: DECISION (confirmed), design D5):

| # | id | kind | category | extra | price | revealAt |
|---|---|---|---|---|---|---|
| 1 | `soft-shadow` | skin | skins | slot `stack` | 15 | 10 |
| 2 | `squish` | skin | skins | slot `stack` | 25 | 15 |
| 3 | `floating-number` | skin | skins | slot `stack` | 30 | 20 |
| 4 | `jumping-cap` | skin | skins | slot `stack` | 50 | 35 |
| 5 | `gold` | skin | skins | slot `material` | 500 | 300 |
| 6 | `sleeping-cat` | decor | decor | size 120 × 80 | 100 | 75 |
| 7 | `lava-lamp` | decor | decor | size 64 × 144 | 200 | 150 |
| 8 | `hydraulic-press` | decor | decor | size 144 × 144 | 1500 | 750 |
| 9 | `double-click` | click-upgrade | upgrades | multiplier 2, requires `null` | 100 | 60 |
| 10 | `triple-click` | click-upgrade | upgrades | multiplier 3, requires `double-click` | 500 | 250 |
| 11 | `monkey` | helper | upgrades | clicksPerSecond 1 | 50 (base) | 30 |

#### Scenario: Catalog ids and order [unit]
- **WHEN** `SHOP_CATALOG.map((i) => i.id)` is read
- **THEN** it equals `["soft-shadow", "squish", "floating-number", "jumping-cap", "gold", "sleeping-cat", "lava-lamp", "hydraulic-press", "double-click", "triple-click", "monkey"]`

#### Scenario: Catalog entries [unit]
- **WHEN** each entry of `SHOP_CATALOG` is read
- **THEN** each deep-equals its row in the table above, e.g. `getShopItem("gold")` equals `{ kind: "skin", id: "gold", category: "skins", slot: "material", price: 500, revealAt: 300 }`, `getShopItem("lava-lamp")` equals `{ kind: "decor", id: "lava-lamp", category: "decor", size: { width: 64, height: 144 }, price: 200, revealAt: 150 }`, `getShopItem("triple-click")` equals `{ kind: "click-upgrade", id: "triple-click", category: "upgrades", multiplier: 3, requires: "double-click", price: 500, revealAt: 250 }`, `getShopItem("monkey")` equals `{ kind: "helper", id: "monkey", category: "upgrades", clicksPerSecond: 1, price: 50, revealAt: 30 }`

#### Scenario: Constants [unit]
- **WHEN** the constants are read
- **THEN** `SHOP_UNLOCK_CLICKS` is `10` and `PRICE_GROWTH` is `1.15`

### Requirement: Shop visibility
The shop box SHALL be shown if and only if `totalClicks >= 10`; balance does not matter. Because
`totalClicks` never decreases (except by reset), once shown it stays shown.

#### Scenario: Unlock threshold [unit]
- **WHEN** `isShopVisible` is evaluated for `{ balance: 500, totalClicks: 9 }`, `{ balance: 0, totalClicks: 10 }`, `{ balance: 0, totalClicks: 11 }`
- **THEN** the results are `false`, `true`, `true`

#### Scenario: Shop appears on the 10th click [e2e]
- **GIVEN** the page `/` is loaded with empty storage
- **WHEN** the user clicks `[data-testid="main-button"]` 9 times
- **THEN** `[data-testid="shop"]` is not visible
- **WHEN** the user clicks the main button once more
- **THEN** `[data-testid="shop"]` is visible and contains a heading with text `Магазин`

#### Scenario: Main button does not move when the shop appears [e2e]
- **GIVEN** the page `/` is loaded with empty storage and the main button was clicked 9 times
- **WHEN** the bounding box of the main button is measured, the button is clicked once (shop appears) and the box is measured again
- **THEN** x and y differ by at most 1 px

#### Scenario: Seeded save shows the shop immediately [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 0, totalClicks: 10 }))`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="shop"]` is visible

### Requirement: Progressive reveal
An item SHALL be revealed when `totalClicks >= revealAt`. `getRevealedItems(state, category?)`
SHALL return the items whose status is not `hidden`, in catalog order, optionally filtered by
category. Hidden items SHALL NOT be rendered; a category heading SHALL be rendered only when the
category has at least one revealed item.

#### Scenario: Reveal boundaries for every item [unit]
- **WHEN** `isItemRevealed(S({ totalClicks: revealAt - 1 }), id)` and `isItemRevealed(S({ totalClicks: revealAt }), id)` are evaluated for each of the 11 items with the revealAt values from the catalog table (10, 15, 20, 35, 300, 75, 150, 750, 60, 250, 30)
- **THEN** every first result is `false` and every second result is `true`

#### Scenario: Revealed items at 20 clicks [unit]
- **WHEN** `getRevealedItems(S({ totalClicks: 20 }))` is evaluated
- **THEN** the ids are `["soft-shadow", "squish", "floating-number"]`

#### Scenario: Revealed items by category [unit]
- **WHEN** `getRevealedItems(S({ totalClicks: 60 }), "upgrades")` and `getRevealedItems(S({ totalClicks: 60 }), "decor")` are evaluated
- **THEN** the ids are `["double-click", "monkey"]` and `[]`

#### Scenario: Nothing revealed before 10 [unit]
- **WHEN** `getRevealedItems(S({ totalClicks: 9 }))` is evaluated
- **THEN** the result is `[]`

#### Scenario: Items appear while clicking [e2e]
- **GIVEN** the page `/` is loaded with empty storage
- **WHEN** the user clicks the main button 10 times
- **THEN** `[data-testid="shop-item-soft-shadow"]` is visible and `[data-testid="shop-item-squish"]` has count 0
- **AND** `[data-testid="shop-category-skins"]` is visible, `[data-testid="shop-category-decor"]` and `[data-testid="shop-category-upgrades"]` have count 0
- **WHEN** the user clicks 5 more times (totalClicks 15)
- **THEN** `[data-testid="shop-item-squish"]` is visible and `[data-testid="shop-item-floating-number"]` has count 0

#### Scenario: All items at 750 clicks [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 0, totalClicks: 750 }))`
- **WHEN** the page `/` is loaded
- **THEN** the `[data-testid^="shop-item-"]` elements, in DOM order, have test ids `shop-item-soft-shadow`, `shop-item-squish`, `shop-item-floating-number`, `shop-item-jumping-cap`, `shop-item-gold`, `shop-item-sleeping-cat`, `shop-item-lava-lamp`, `shop-item-hydraulic-press`, `shop-item-double-click`, `shop-item-triple-click`, `shop-item-monkey`

#### Scenario: One click short of the press [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 0, totalClicks: 749 }))`
- **WHEN** the page `/` is loaded
- **THEN** there are exactly 10 `[data-testid^="shop-item-"]` elements and `[data-testid="shop-item-hydraulic-press"]` has count 0

### Requirement: Prices
One-time items SHALL cost their catalog price. A helper SHALL cost
`Math.round(Number((price × PRICE_GROWTH ** owned).toFixed(6)))` where `owned = state.helpers[id]`,
i.e. the mathematically intended value rounded half up, not the floating-point artefact
(DECISION (confirmed), design D6: owned 1 → 58).

#### Scenario: One-time prices ignore state [unit]
- **WHEN** `getItemPrice` is evaluated for `gold` on `FRESH` and on `S({ balance: 9999, totalClicks: 9999, upgrades: ["double-click"] })`
- **THEN** both results are `500`
- **AND** `getItemPrice(FRESH, "hydraulic-press")` is `1500` and `getItemPrice(FRESH, "soft-shadow")` is `15`

#### Scenario: Monkey price curve [unit]
- **WHEN** `getItemPrice(S({ helpers: { monkey: n } }), "monkey")` is evaluated for n = 0, 1, 2, 3, 4, 5, 10
- **THEN** the results are `50`, `58`, `66`, `76`, `87`, `101`, `202`

#### Scenario: Rounding guard for the float artefact [unit]
- **GIVEN** `50 * 1.15 ** 1` evaluates to `57.49999999999999` in JavaScript
- **WHEN** `getItemPrice(S({ helpers: { monkey: 1 } }), "monkey")` is evaluated
- **THEN** the result is exactly `58` (not `57`)

### Requirement: Item status
`getItemStatus(state, id)` SHALL return the first matching status in this order: `owned` (one-time
item already bought; never for helpers), `hidden` (`totalClicks < revealAt`), `requires` (click
upgrade whose `requires` item is not owned), `unaffordable` (`balance < price`), `available`.

#### Scenario: Affordability boundary [unit]
- **WHEN** `getItemStatus` for `soft-shadow` is evaluated on `S({ balance: 14, totalClicks: 10 })` and `S({ balance: 15, totalClicks: 10 })`
- **THEN** the results are `"unaffordable"` and `"available"`

#### Scenario: Hidden wins over affordable [unit]
- **WHEN** `getItemStatus(S({ balance: 1000, totalClicks: 9 }), "soft-shadow")` is evaluated
- **THEN** the result is `"hidden"`

#### Scenario: Owned one-time items [unit]
- **WHEN** `getItemStatus` is evaluated for `soft-shadow` on `S({ totalClicks: 20, ownedSkins: ["soft-shadow"], enabledSkins: [] })`, for `lava-lamp` on `S({ totalClicks: 200, decor: [{ id: "lava-lamp", position: null }] })`, and for `double-click` on `S({ totalClicks: 60, upgrades: ["double-click"] })`
- **THEN** every result is `"owned"`

#### Scenario: Triple click requirement [unit]
- **WHEN** `getItemStatus` for `triple-click` is evaluated on `S({ balance: 500, totalClicks: 250 })`, `S({ balance: 0, totalClicks: 250 })`, `S({ balance: 499, totalClicks: 250, upgrades: ["double-click"] })`, `S({ balance: 500, totalClicks: 250, upgrades: ["double-click"] })`, `S({ balance: 0, totalClicks: 250, upgrades: ["double-click", "triple-click"] })`
- **THEN** the results are `"requires"`, `"requires"`, `"unaffordable"`, `"available"`, `"owned"`

#### Scenario: Helpers are never owned [unit]
- **WHEN** `getItemStatus` for `monkey` is evaluated on `S({ balance: 58, totalClicks: 30, helpers: { monkey: 1 } })` and `S({ balance: 57, totalClicks: 30, helpers: { monkey: 1 } })`
- **THEN** the results are `"available"` and `"unaffordable"`

### Requirement: Buying
`buyItem(state, id, options?)` SHALL succeed only when the status is `available`, returning
`{ ok: true, state }` where `balance` is reduced by the current price and `totalClicks` is
unchanged. Effects: stack skin → added to `ownedSkins` and `enabledSkins`; Gold → added to
`ownedSkins` and `material` set to `"gold"` (DECISION (confirmed), design D7); decor →
`{ id, position: options.decorPosition ?? null }` added to `decor`; click upgrade → added to
`upgrades`; helper → `helpers[id] + 1`. All arrays stay in catalog order. Otherwise it SHALL return
`{ ok: false, reason: <status> }`. It SHALL NOT mutate its input.

#### Scenario: Buy a stack skin [unit]
- **WHEN** `buyItem(S({ balance: 20, totalClicks: 12 }), "soft-shadow")` is called
- **THEN** the result is `{ ok: true, state: S({ balance: 5, totalClicks: 12, ownedSkins: ["soft-shadow"], enabledSkins: ["soft-shadow"] }) }`

#### Scenario: Arrays keep catalog order [unit]
- **WHEN** `buyItem(S({ balance: 100, totalClicks: 50, ownedSkins: ["jumping-cap"], enabledSkins: ["jumping-cap"] }), "soft-shadow")` is called
- **THEN** the new state has `ownedSkins: ["soft-shadow", "jumping-cap"]`, `enabledSkins: ["soft-shadow", "jumping-cap"]`, `balance: 85`

#### Scenario: Buy Gold [unit]
- **WHEN** `buyItem(S({ balance: 600, totalClicks: 300, ownedSkins: ["squish"], enabledSkins: ["squish"] }), "gold")` is called
- **THEN** the new state is `S({ balance: 100, totalClicks: 300, ownedSkins: ["squish", "gold"], enabledSkins: ["squish"], material: "gold" })`

#### Scenario: Buy decor with a position [unit]
- **WHEN** `buyItem(S({ balance: 250, totalClicks: 150 }), "lava-lamp", { decorPosition: { x: 0.5, y: 0.25 } })` is called
- **THEN** the new state is `S({ balance: 50, totalClicks: 150, decor: [{ id: "lava-lamp", position: { x: 0.5, y: 0.25 } }] })`

#### Scenario: Buy decor without a position [unit]
- **WHEN** `buyItem(S({ balance: 100, totalClicks: 75 }), "sleeping-cat")` is called
- **THEN** the new state has `decor: [{ id: "sleeping-cat", position: null }]` and `balance: 0`

#### Scenario: Decor keeps catalog order [unit]
- **WHEN** `buyItem(S({ balance: 100, totalClicks: 800, decor: [{ id: "hydraulic-press", position: { x: 0.1, y: 0.1 } }] }), "sleeping-cat", { decorPosition: { x: 0.7, y: 0.2 } })` is called
- **THEN** the new state has `decor: [{ id: "sleeping-cat", position: { x: 0.7, y: 0.2 } }, { id: "hydraulic-press", position: { x: 0.1, y: 0.1 } }]`

#### Scenario: Buy click upgrades [unit]
- **WHEN** `buyItem(S({ balance: 100, totalClicks: 60 }), "double-click")` is called
- **THEN** the new state is `S({ balance: 0, totalClicks: 60, upgrades: ["double-click"] })`
- **WHEN** `buyItem(S({ balance: 600, totalClicks: 250, upgrades: ["double-click"] }), "triple-click")` is called
- **THEN** the new state is `S({ balance: 100, totalClicks: 250, upgrades: ["double-click", "triple-click"] })`

#### Scenario: Buy monkeys until broke [unit]
- **GIVEN** state `S({ balance: 200, totalClicks: 30 })`
- **WHEN** `buyItem(…, "monkey")` is applied 3 times, each time on the previous result's state
- **THEN** the balances after each purchase are `150`, `92`, `26` and `helpers` is `{ monkey: 3 }`, `totalClicks` is still `30`
- **WHEN** a 4th purchase is attempted (price 76)
- **THEN** the result is `{ ok: false, reason: "unaffordable" }`

#### Scenario: Failure reasons [unit]
- **WHEN** `buyItem` is called with `(S({ balance: 1000, totalClicks: 9 }), "soft-shadow")`, `(S({ balance: 1000, totalClicks: 20, ownedSkins: ["soft-shadow"], enabledSkins: ["soft-shadow"] }), "soft-shadow")`, `(S({ balance: 1000, totalClicks: 250 }), "triple-click")`, `(S({ balance: 14, totalClicks: 10 }), "soft-shadow")`
- **THEN** the results are `{ ok: false, reason: "hidden" }`, `{ ok: false, reason: "owned" }`, `{ ok: false, reason: "requires" }`, `{ ok: false, reason: "unaffordable" }`

#### Scenario: Input is not mutated [unit]
- **GIVEN** a deeply frozen state `S({ balance: 20, totalClicks: 12 })` (every nested array/object frozen)
- **WHEN** `buyItem(state, "soft-shadow")` is called
- **THEN** nothing is thrown, the input still deep-equals `S({ balance: 20, totalClicks: 12 })` and the returned state is a different object

### Requirement: Shop UI
The shop box (`[data-testid="shop"]`) SHALL render, per revealed item, `[data-testid="shop-item-<id>"]`
with the localized name and description. An item that is not owned SHALL have a buy button
`[data-testid="shop-buy-<id>"]` with text `shop.buy` (price formatted with the current language) that
is `disabled` unless the status is `available`. Owned decor and click upgrades SHALL show
`[data-testid="shop-owned-<id>"]` with `shop.owned` and no buy button. Owned skins SHALL show a toggle
(see button-skins) instead of the buy button. Status `requires` SHALL show
`[data-testid="shop-requires-<id>"]` with `shop.requires`. The Monkey SHALL always keep its buy
button (current price) and show `[data-testid="shop-count-monkey"]` with `shop.count`. Buttons
SHALL update live as balance changes.

#### Scenario: Unaffordable item is disabled with its price [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 10, totalClicks: 10 }))`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="shop-buy-soft-shadow"]` is disabled and has text `Купити за 15`
- **WHEN** the user clicks `[data-testid="lang-toggle"]`
- **THEN** it has text `Buy for 15`

#### Scenario: Buying a skin through the UI [e2e]
- **GIVEN** the page `/` is loaded with empty storage
- **WHEN** the user clicks the main button 14 times
- **THEN** `[data-testid="shop-buy-soft-shadow"]` is disabled
- **WHEN** the user clicks the main button once more
- **THEN** `[data-testid="shop-buy-soft-shadow"]` is enabled
- **WHEN** the user clicks `[data-testid="shop-buy-soft-shadow"]`
- **THEN** `[data-testid="balance"]` shows `0`, `[data-testid="shop-buy-soft-shadow"]` has count 0 and `[data-testid="skin-toggle-soft-shadow"]` is visible with `aria-pressed="true"`
- **AND** `localStorage["dopamine-clicker:save"]` parsed deep-equals `{ version: 2, state: S({ balance: 0, totalClicks: 15, ownedSkins: ["soft-shadow"], enabledSkins: ["soft-shadow"] }) }`

#### Scenario: Prices use locale formatting [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 0, totalClicks: 750 }))`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="shop-buy-hydraulic-press"]` text with whitespace normalized to plain spaces is `Купити за 1 500`
- **WHEN** the user clicks `[data-testid="lang-toggle"]`
- **THEN** it has text `Buy for 1,500`

#### Scenario: Requirement is shown [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 500, totalClicks: 250 }))`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="shop-buy-triple-click"]` is disabled and `[data-testid="shop-requires-triple-click"]` has text `Потрібно: Подвійний клік`

#### Scenario: Owned upgrade is labelled [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 100, totalClicks: 60 }))`
- **WHEN** the user clicks `[data-testid="shop-buy-double-click"]`
- **THEN** `[data-testid="shop-buy-double-click"]` has count 0 and `[data-testid="shop-owned-double-click"]` has text `Куплено`

#### Scenario: Monkey keeps a buy button with the next price [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 200, totalClicks: 30 }))`
- **WHEN** the user clicks `[data-testid="shop-buy-monkey"]`
- **THEN** `[data-testid="balance"]` shows `150`, `[data-testid="shop-buy-monkey"]` has text `Купити за 58` and is enabled, `[data-testid="shop-count-monkey"]` has text `Маєте: 1`

#### Scenario: Item name and description are localized [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 0, totalClicks: 10 }))`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="shop-item-soft-shadow"]` contains the texts `М’яка тінь` and `Тінь, що глибшає під курсором і при натисканні`
- **WHEN** the user clicks `[data-testid="lang-toggle"]`
- **THEN** it contains `Soft shadow` and `A shadow that deepens on hover and press`

### Requirement: Shop box placement
The shop box SHALL be fixed in the top-left corner, 288 px wide, with `max-height: 60vh` and
internal vertical scrolling, and SHALL NOT overlap the main button, the balance counter or the
top-right switchers (DECISION (confirmed), design D15).

#### Scenario: Shop box geometry [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 0, totalClicks: 750 }))` (all items revealed), viewport 1280 × 720
- **WHEN** the page `/` is loaded and bounding boxes are measured
- **THEN** the shop box has x ≤ 24, y ≤ 24, width within 1 px of 288, height ≤ 432 + 1
- **AND** its `scrollHeight` is ≥ its `clientHeight` and its computed `overflow-y` is `auto` or `scroll`
- **AND** it does not strictly overlap `[data-testid="main-button"]`, `[data-testid="balance"]`, `[data-testid="theme-toggle"]` or `[data-testid="lang-toggle"]`
