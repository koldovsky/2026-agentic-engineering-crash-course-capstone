# Spec Delta: shop

Stage 4 adds the ten video items as a fourth category (`video`, kind `video-decor`), so the catalog
grows from 19 to 29 items. Prices, the reveal rule, the status priority and the buy mechanics are
unchanged; buying a video stores it in the new `videos` state field with its placement.

Scenario tags: `[unit]` = Vitest test in `lib/game/shop.test.ts`, `[e2e]` = Playwright test in
`e2e/add-shop-v1.spec.ts` / `e2e/add-upgrades-v2.spec.ts` (existing, unchanged) or
`e2e/add-content-v3.spec.ts` (noted as "new"). `FRESH`, `S({...})`, `V2(...)`, `V3(...)`, `V4(...)`
are defined in `design.md`.

## MODIFIED Requirements

### Requirement: Shop catalog
`SHOP_CATALOG` SHALL list exactly these 29 items in this order (display order and canonical order
of all state arrays), with `SHOP_UNLOCK_CLICKS = 10` and `PRICE_GROWTH = 1.15` (revealAt of items
1–10 and 14: DECISION (confirmed), add-shop-v1 design D5; items 11–13 and 15–19: DECISION
(confirmed), add-upgrades-v2 design D6; items 20–29: DECISION (confirmed), design D4).
Items 20–29 are the new kind `video-decor` in the new category `video`, are bought once and have
`size` `VIDEO_SIZE` (192 × 108):

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
| 11 | `crit` | leveled-upgrade | upgrades | maxLevel 3, priceGrowth 3, helper `null` | 250 | 150 |
| 12 | `combo` | feature-upgrade | upgrades | — | 400 | 250 |
| 13 | `golden-button` | feature-upgrade | upgrades | — | 1000 | 700 |
| 14 | `monkey` | helper | upgrades | clicksPerSecond 1 | 50 (base) | 30 |
| 15 | `speed-monkey` | leveled-upgrade | upgrades | maxLevel 3, priceGrowth 5, helper `monkey` | 500 | 300 |
| 16 | `robot` | helper | upgrades | clicksPerSecond 5 | 1000 (base) | 600 |
| 17 | `speed-robot` | leveled-upgrade | upgrades | maxLevel 3, priceGrowth 5, helper `robot` | 10000 | 6000 |
| 18 | `factory` | helper | upgrades | clicksPerSecond 40 | 12000 (base) | 8000 |
| 19 | `speed-factory` | leveled-upgrade | upgrades | maxLevel 3, priceGrowth 5, helper `factory` | 120000 | 75000 |
| 20 | `video-runner` | video-decor | video | size 192 × 108 | 5000 | 3000 |
| 21 | `video-parkour` | video-decor | video | size 192 × 108 | 7500 | 4500 |
| 22 | `video-soap` | video-decor | video | size 192 × 108 | 10000 | 6000 |
| 23 | `video-kinetic-sand` | video-decor | video | size 192 × 108 | 12500 | 7500 |
| 24 | `video-slime` | video-decor | video | size 192 × 108 | 15000 | 9000 |
| 25 | `video-hydraulic` | video-decor | video | size 192 × 108 | 20000 | 12000 |
| 26 | `video-marble` | video-decor | video | size 192 × 108 | 25000 | 15000 |
| 27 | `video-aquarium` | video-decor | video | size 192 × 108 | 30000 | 18000 |
| 28 | `video-fireplace` | video-decor | video | size 192 × 108 | 40000 | 24000 |
| 29 | `video-rain` | video-decor | video | size 192 × 108 | 50000 | 30000 |

#### Scenario: Catalog ids and order [unit]
- **WHEN** `SHOP_CATALOG.map((i) => i.id)` is read
- **THEN** it equals `["soft-shadow", "squish", "floating-number", "jumping-cap", "gold", "sleeping-cat", "lava-lamp", "hydraulic-press", "double-click", "triple-click", "crit", "combo", "golden-button", "monkey", "speed-monkey", "robot", "speed-robot", "factory", "speed-factory", "video-runner", "video-parkour", "video-soap", "video-kinetic-sand", "video-slime", "video-hydraulic", "video-marble", "video-aquarium", "video-fireplace", "video-rain"]`
- **AND** `SHOP_CATALOG.length` is `29` and the ids of the ten `video-decor` entries equal `VIDEO_DECOR.map((v) => v.id)` (same order, `lib/game/videos.ts`)

#### Scenario: Catalog entries [unit]
- **WHEN** each entry of `SHOP_CATALOG` is read
- **THEN** each deep-equals its row in the table above, e.g. `getShopItem("gold")` equals `{ kind: "skin", id: "gold", category: "skins", slot: "material", price: 500, revealAt: 300 }`, `getShopItem("lava-lamp")` equals `{ kind: "decor", id: "lava-lamp", category: "decor", size: { width: 64, height: 144 }, price: 200, revealAt: 150 }`, `getShopItem("triple-click")` equals `{ kind: "click-upgrade", id: "triple-click", category: "upgrades", multiplier: 3, requires: "double-click", price: 500, revealAt: 250 }`, `getShopItem("monkey")` equals `{ kind: "helper", id: "monkey", category: "upgrades", clicksPerSecond: 1, price: 50, revealAt: 30 }`
- **AND** `getShopItem("video-runner")` equals `{ kind: "video-decor", id: "video-runner", category: "video", size: { width: 192, height: 108 }, price: 5000, revealAt: 3000 }` and `getShopItem("video-rain")` equals `{ kind: "video-decor", id: "video-rain", category: "video", size: { width: 192, height: 108 }, price: 50000, revealAt: 30000 }`
- **AND** `getShopItem("crit")` equals `{ kind: "leveled-upgrade", id: "crit", category: "upgrades", maxLevel: 3, priceGrowth: 3, helper: null, price: 250, revealAt: 150 }`, `getShopItem("combo")` equals `{ kind: "feature-upgrade", id: "combo", category: "upgrades", price: 400, revealAt: 250 }`, `getShopItem("robot")` equals `{ kind: "helper", id: "robot", category: "upgrades", clicksPerSecond: 5, price: 1000, revealAt: 600 }`, `getShopItem("speed-factory")` equals `{ kind: "leveled-upgrade", id: "speed-factory", category: "upgrades", maxLevel: 3, priceGrowth: 5, helper: "factory", price: 120000, revealAt: 75000 }`

#### Scenario: Constants [unit]
- **WHEN** the constants are read
- **THEN** `SHOP_UNLOCK_CLICKS` is `10` and `PRICE_GROWTH` is `1.15`

### Requirement: Progressive reveal
An item SHALL be revealed when `totalClicks >= revealAt`; a speed-up (`leveled-upgrade` with a
non-null `helper`) additionally requires `helpers[helper] >= 1` (DECISION (confirmed),
design D5). `getRevealedItems(state, category?)` SHALL return the items whose status is not
`hidden`, in catalog order, optionally filtered by category. Hidden items SHALL NOT be rendered; a
category heading SHALL be rendered only when the category has at least one revealed item.

#### Scenario: Reveal boundaries for every item [unit]
- **WHEN** `isItemRevealed(S({ totalClicks: revealAt - 1 }), id)` and `isItemRevealed(S({ totalClicks: revealAt }), id)` are evaluated for each of the 26 items that are not speed-ups, with the revealAt values from the catalog table (10, 15, 20, 35, 300, 75, 150, 750, 60, 250, 150, 250, 700, 30, 600, 8000, 3000, 4500, 6000, 7500, 9000, 12000, 15000, 18000, 24000, 30000)
- **THEN** every first result is `false` and every second result is `true`

#### Scenario: Speed-ups need their helper [unit]
- **WHEN** `isItemRevealed` for `speed-monkey` is evaluated on `S({ totalClicks: 300 })`, `S({ totalClicks: 299, helpers: { monkey: 1 } })`, `S({ totalClicks: 300, helpers: { monkey: 1 } })`
- **THEN** the results are `false`, `false`, `true`
- **WHEN** it is evaluated for `speed-robot` on `S({ totalClicks: 6000, helpers: { monkey: 9 } })` and `S({ totalClicks: 6000, helpers: { robot: 1 } })`, and for `speed-factory` on `S({ totalClicks: 74999, helpers: { factory: 1 } })` and `S({ totalClicks: 75000, helpers: { factory: 1 } })`
- **THEN** the results are `false`, `true`, `false`, `true`

#### Scenario: Revealed items at 20 clicks [unit]
- **WHEN** `getRevealedItems(S({ totalClicks: 20 }))` is evaluated
- **THEN** the ids are `["soft-shadow", "squish", "floating-number"]`

#### Scenario: Revealed items by category [unit]
- **WHEN** `getRevealedItems(S({ totalClicks: 60 }), "upgrades")` and `getRevealedItems(S({ totalClicks: 60 }), "decor")` are evaluated
- **THEN** the ids are `["double-click", "monkey"]` and `[]`

#### Scenario: Revealed upgrades at 750 clicks [unit]
- **WHEN** `getRevealedItems(S({ totalClicks: 750 }), "upgrades")` is evaluated
- **THEN** the ids are `["double-click", "triple-click", "crit", "combo", "golden-button", "monkey", "robot"]`

#### Scenario: Everything revealed late in the game [unit]
- **WHEN** `getRevealedItems(S({ totalClicks: 100000, helpers: { monkey: 1, robot: 1, factory: 1 } }))` is evaluated
- **THEN** the ids are all 29 catalog ids in catalog order

#### Scenario: Videos are revealed one by one [unit]
- **WHEN** `getRevealedItems(S({ totalClicks: 2999 }), "video")`, `getRevealedItems(S({ totalClicks: 3000 }), "video")` and `getRevealedItems(S({ totalClicks: 9000 }), "video")` are evaluated
- **THEN** the ids are `[]`, `["video-runner"]` and `["video-runner", "video-parkour", "video-soap", "video-kinetic-sand", "video-slime"]`
- **WHEN** `getRevealedItems(S({ totalClicks: 30000 }), "video")` is evaluated
- **THEN** the ids are all ten video ids in catalog order

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
Updated test in `e2e/add-shop-v1.spec.ts`.
- **GIVEN** storage is seeded with `V2(S({ balance: 0, totalClicks: 750 }))`
- **WHEN** the page `/` is loaded
- **THEN** the `[data-testid^="shop-item-"]` elements, in DOM order, have test ids `shop-item-soft-shadow`, `shop-item-squish`, `shop-item-floating-number`, `shop-item-jumping-cap`, `shop-item-gold`, `shop-item-sleeping-cat`, `shop-item-lava-lamp`, `shop-item-hydraulic-press`, `shop-item-double-click`, `shop-item-triple-click`, `shop-item-crit`, `shop-item-combo`, `shop-item-golden-button`, `shop-item-monkey`, `shop-item-robot`

#### Scenario: One click short of the press [e2e]
Updated test in `e2e/add-shop-v1.spec.ts`.
- **GIVEN** storage is seeded with `V2(S({ balance: 0, totalClicks: 749 }))`
- **WHEN** the page `/` is loaded
- **THEN** there are exactly 14 `[data-testid^="shop-item-"]` elements and `[data-testid="shop-item-hydraulic-press"]` has count 0

#### Scenario: Speed-up is listed right after its helper [e2e]
New test in `e2e/add-upgrades-v2.spec.ts`.
- **GIVEN** storage is seeded with `V3(S({ balance: 0, totalClicks: 700, helpers: { monkey: 1 } }))`
- **WHEN** the page `/` is loaded
- **THEN** the last four `[data-testid^="shop-item-"]` elements in DOM order are `shop-item-golden-button`, `shop-item-monkey`, `shop-item-speed-monkey`, `shop-item-robot`
- **AND** `[data-testid="shop-item-speed-robot"]` has count 0

#### Scenario: The video category appears in the shop [e2e]
New test in `e2e/add-content-v3.spec.ts`.
- **GIVEN** storage is seeded with `V4(S({ balance: 0, totalClicks: 2999 }))`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="shop-category-video"]` has count 0 and `[data-testid="shop-item-video-runner"]` has count 0
- **WHEN** storage is seeded with `V4(S({ balance: 0, totalClicks: 4500 }))` and the page is reloaded
- **THEN** `[data-testid="shop-category-video"]` is visible with text `Відео` and the `[data-testid^="shop-item-video-"]` elements, in DOM order, are `shop-item-video-runner` and `shop-item-video-parkour`
- **AND** `[data-testid="shop-buy-video-runner"]` is disabled with normalized text `Купити за 5 000`

### Requirement: Buying
`buyItem(state, id, options?)` SHALL succeed only when the status is `available`, returning
`{ ok: true, state }` where `balance` is reduced by the current price and `totalClicks` is
unchanged. Effects: stack skin → added to `ownedSkins` and `enabledSkins`; Gold → added to
`ownedSkins` and `material` set to `"gold"` (DECISION (confirmed), add-shop-v1 design D7); decor →
`{ id, position: options.decorPosition ?? null }` added to `decor`; video decor →
`{ id, position: options.videoPosition ?? null }` added to `videos`; click or feature upgrade →
added to `upgrades`; helper → `helpers[id] + 1`; leveled upgrade → `levels[id] + 1`. All arrays stay
in catalog order. Otherwise it SHALL return `{ ok: false, reason: <status> }`. It SHALL NOT mutate
its input.

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

#### Scenario: Buy feature upgrades in catalog order [unit]
- **WHEN** `buyItem(S({ balance: 400, totalClicks: 250, upgrades: ["double-click"] }), "combo")` is called
- **THEN** the new state is `S({ balance: 0, totalClicks: 250, upgrades: ["double-click", "combo"] })`
- **WHEN** `buyItem(S({ balance: 1100, totalClicks: 700, upgrades: ["golden-button"] }), "combo")` is called
- **THEN** the new state has `upgrades: ["combo", "golden-button"]` and `balance: 700`
- **WHEN** `buyItem(S({ balance: 100, totalClicks: 700, upgrades: ["combo", "golden-button"] }), "double-click")` is called
- **THEN** the new state has `upgrades: ["double-click", "combo", "golden-button"]`

#### Scenario: Buy crit levels until maxed [unit]
- **GIVEN** state `S({ balance: 3250, totalClicks: 150 })`
- **WHEN** `buyItem(…, "crit")` is applied 3 times, each time on the previous result's state
- **THEN** the balances after each purchase are `3000`, `2250`, `0` and `levels.crit` is `1`, `2`, `3`; `totalClicks` stays `150`
- **WHEN** a 4th purchase is attempted
- **THEN** the result is `{ ok: false, reason: "maxed" }`

#### Scenario: Buy robots until broke [unit]
- **GIVEN** state `S({ balance: 3000, totalClicks: 600 })`
- **WHEN** `buyItem(…, "robot")` is applied 2 times, each time on the previous result's state
- **THEN** the balances after each purchase are `2000`, `850` and `helpers` is `{ monkey: 0, robot: 2, factory: 0 }`
- **WHEN** a 3rd purchase is attempted (price 1323)
- **THEN** the result is `{ ok: false, reason: "unaffordable" }`

#### Scenario: Buy a speed-up [unit]
- **WHEN** `buyItem(S({ balance: 10000, totalClicks: 6000, helpers: { robot: 1 } }), "speed-robot")` is called
- **THEN** the result is `{ ok: true, state: S({ balance: 0, totalClicks: 6000, helpers: { robot: 1 }, levels: { "speed-robot": 1 } }) }`
- **WHEN** `buyItem(S({ balance: 10000, totalClicks: 6000 }), "speed-robot")` is called
- **THEN** the result is `{ ok: false, reason: "hidden" }`

#### Scenario: Buy monkeys until broke [unit]
- **GIVEN** state `S({ balance: 200, totalClicks: 30 })`
- **WHEN** `buyItem(…, "monkey")` is applied 3 times, each time on the previous result's state
- **THEN** the balances after each purchase are `150`, `92`, `26` and `helpers` is `{ monkey: 3, robot: 0, factory: 0 }`, `totalClicks` is still `30`
- **WHEN** a 4th purchase is attempted (price 76)
- **THEN** the result is `{ ok: false, reason: "unaffordable" }`

#### Scenario: Buy a video with a position [unit]
- **WHEN** `buyItem(S({ balance: 6000, totalClicks: 3000 }), "video-runner", { videoPosition: { x: 0.25, y: 0.75 } })` is called
- **THEN** the result is `{ ok: true, state: S({ balance: 1000, totalClicks: 3000, videos: [{ id: "video-runner", position: { x: 0.25, y: 0.75 } }] }) }`

#### Scenario: Videos keep catalog order and can be owned only once [unit]
- **WHEN** `buyItem(S({ balance: 20000, totalClicks: 30000, videos: [{ id: "video-soap", position: null }] }), "video-parkour")` is called
- **THEN** the new state has `videos: [{ id: "video-parkour", position: null }, { id: "video-soap", position: null }]` and `balance: 12500`
- **WHEN** `buyItem` is called on that new state with `"video-soap"`
- **THEN** the result is `{ ok: false, reason: "owned" }`

#### Scenario: Failure reasons [unit]
- **WHEN** `buyItem` is called with `(S({ balance: 1000, totalClicks: 9 }), "soft-shadow")`, `(S({ balance: 1000, totalClicks: 20, ownedSkins: ["soft-shadow"], enabledSkins: ["soft-shadow"] }), "soft-shadow")`, `(S({ balance: 1000, totalClicks: 250 }), "triple-click")`, `(S({ balance: 14, totalClicks: 10 }), "soft-shadow")`, `(S({ balance: 99999, totalClicks: 150, levels: { crit: 3 } }), "crit")`
- **THEN** the results are `{ ok: false, reason: "hidden" }`, `{ ok: false, reason: "owned" }`, `{ ok: false, reason: "requires" }`, `{ ok: false, reason: "unaffordable" }`, `{ ok: false, reason: "maxed" }`

#### Scenario: Input is not mutated [unit]
- **GIVEN** deeply frozen states `S({ balance: 20, totalClicks: 12 })` and `S({ balance: 1000, totalClicks: 700, helpers: { monkey: 1 } })` (every nested array/object frozen)
- **WHEN** `buyItem(first, "soft-shadow")`, `buyItem(second, "crit")`, `buyItem(second, "combo")` and `buyItem(second, "speed-monkey")` are called
- **THEN** nothing is thrown, both inputs still deep-equal their original values and every returned state is a different object

### Requirement: Shop UI
The shop box (`[data-testid="shop"]`) SHALL render, per revealed item, `[data-testid="shop-item-<id>"]`
with the localized name and description. An item that is not owned or maxed SHALL have a buy
button `[data-testid="shop-buy-<id>"]` with text `shop.buy` (price formatted with the current
language) that is `disabled` unless the status is `available`. Owned decor, video decor, click upgrades
and feature upgrades SHALL show `[data-testid="shop-owned-<id>"]` with `shop.owned` and no buy
button. The four category headings SHALL be `[data-testid="shop-category-<skins|decor|upgrades|video>"]`
in that order, each rendered only when its category has at least one revealed item.
Owned skins SHALL show a toggle (see button-skins) instead of the buy button. Status `requires`
SHALL show `[data-testid="shop-requires-<id>"]` with `shop.requires`. Helpers SHALL always keep
their buy button (current price) and show `[data-testid="shop-count-<id>"]` with `shop.count` once
at least one is owned. A leveled upgrade at level ≥ 1 SHALL show `[data-testid="shop-level-<id>"]`
with `shop.level` (`level`, `max`); at max level it SHALL show `[data-testid="shop-maxed-<id>"]`
with `shop.maxed` instead of the buy button. Buttons SHALL update live as balance changes.

#### Scenario: Unaffordable item is disabled with its price [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 10, totalClicks: 10 }))`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="shop-buy-soft-shadow"]` is disabled and has text `Купити за 15`
- **WHEN** the user clicks `[data-testid="lang-toggle"]`
- **THEN** it has text `Buy for 15`

#### Scenario: Buying a skin through the UI [e2e]
Updated test in `e2e/add-shop-v1.spec.ts` (expected envelope is now v3).
- **GIVEN** the page `/` is loaded with empty storage
- **WHEN** the user clicks the main button 14 times
- **THEN** `[data-testid="shop-buy-soft-shadow"]` is disabled
- **WHEN** the user clicks the main button once more
- **THEN** `[data-testid="shop-buy-soft-shadow"]` is enabled
- **WHEN** the user clicks `[data-testid="shop-buy-soft-shadow"]`
- **THEN** `[data-testid="balance"]` shows `0`, `[data-testid="shop-buy-soft-shadow"]` has count 0 and `[data-testid="skin-toggle-soft-shadow"]` is visible with `aria-pressed="true"`
- **AND** `localStorage["dopamine-clicker:save"]` parsed deep-equals `{ version: 3, state: S({ balance: 0, totalClicks: 15, ownedSkins: ["soft-shadow"], enabledSkins: ["soft-shadow"] }) }`

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

#### Scenario: Crit levels in the shop [e2e]
New test in `e2e/add-upgrades-v2.spec.ts`.
- **GIVEN** storage is seeded with `V3(S({ balance: 1000, totalClicks: 150 }))`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="shop-buy-crit"]` is enabled with text `Купити за 250` and `[data-testid="shop-level-crit"]` has count 0
- **WHEN** the user clicks `[data-testid="shop-buy-crit"]`
- **THEN** `[data-testid="balance"]` shows `750`, `[data-testid="shop-level-crit"]` has text `Рівень 1 з 3` and `[data-testid="shop-buy-crit"]` is enabled with text `Купити за 750`
- **WHEN** the user clicks `[data-testid="shop-buy-crit"]`
- **THEN** `[data-testid="balance"]` shows `0`, `[data-testid="shop-level-crit"]` has text `Рівень 2 з 3` and `[data-testid="shop-buy-crit"]` is disabled with normalized text `Купити за 2 250`
- **AND** the saved state has `levels.crit` = `2`

#### Scenario: Maxed crit [e2e]
New test in `e2e/add-upgrades-v2.spec.ts`.
- **GIVEN** storage is seeded with `V3(S({ balance: 99999, totalClicks: 150, levels: { crit: 3 } }))`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="shop-maxed-crit"]` has text `Максимальний рівень`, `[data-testid="shop-level-crit"]` has text `Рівень 3 з 3` and `[data-testid="shop-buy-crit"]` has count 0
- **WHEN** the user clicks `[data-testid="lang-toggle"]`
- **THEN** `[data-testid="shop-maxed-crit"]` has text `Max level` and `[data-testid="shop-level-crit"]` has text `Level 3 of 3`

#### Scenario: Buying Combo and Golden button marks them owned [e2e]
New test in `e2e/add-upgrades-v2.spec.ts`.
- **GIVEN** storage is seeded with `V3(S({ balance: 1400, totalClicks: 700 }))`
- **WHEN** the user clicks `[data-testid="shop-buy-combo"]` and then `[data-testid="shop-buy-golden-button"]`
- **THEN** `[data-testid="balance"]` shows `0`, `[data-testid="shop-owned-combo"]` and `[data-testid="shop-owned-golden-button"]` have text `Куплено`, and neither buy button exists
- **AND** the saved state has `upgrades: ["combo", "golden-button"]`

#### Scenario: Robot count label [e2e]
New test in `e2e/add-upgrades-v2.spec.ts`.
- **GIVEN** storage is seeded with `V3(S({ balance: 2150, totalClicks: 600 }))`
- **WHEN** the user clicks `[data-testid="shop-buy-robot"]` twice
- **THEN** `[data-testid="shop-count-robot"]` has text `Маєте: 2` and `[data-testid="shop-buy-robot"]` is disabled with normalized text `Купити за 1 323`

#### Scenario: Buying a video marks it owned [e2e]
New test in `e2e/add-content-v3.spec.ts`.
- **GIVEN** storage is seeded with `V4(S({ balance: 5000, totalClicks: 3000 }))`
- **WHEN** the user clicks `[data-testid="shop-buy-video-runner"]`
- **THEN** `[data-testid="balance"]` shows `0`, `[data-testid="shop-buy-video-runner"]` has count 0 and `[data-testid="shop-owned-video-runner"]` has text `Куплено`
- **AND** the saved state's `videos` deep-equals `[{ id: "video-runner", position: { x: X, y: Y } }]` with `0 ≤ X ≤ 1` and `0 ≤ Y ≤ 1`

#### Scenario: Video name and description are localized [e2e]
New test in `e2e/add-content-v3.spec.ts`.
- **GIVEN** storage is seeded with `V4(S({ balance: 0, totalClicks: 30000 }))`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="shop-item-video-soap"]` contains the texts `Різання мила` and `Гіпнотичні нарізки мила`
- **WHEN** the user clicks `[data-testid="lang-toggle"]`
- **THEN** it contains `Soap cutting` and `Hypnotic soap-cutting loops` and `[data-testid="shop-category-video"]` has text `Video`

## MODIFIED Requirements

### Requirement: Expedition videos replace three shop rows
Supersedes the D23 video rows for `video-marble`, `video-aquarium`, and `video-fireplace` (design D24). The video category SHALL list, in order, `video-music` (price 2500, revealAt 1500), then `video-runner` through `video-hydraulic` at their D23 prices, then `video-trailer` (25000 / 15000), `video-combat` (30000 / 18000), `video-rain` (50000 / 30000), `video-seal` (60000 / 36000). Catalog length stays 30.

#### Scenario: Music reveals before Subway Surfers [unit]
- **WHEN** revealed video ids are read at 1499, 1500, and 3000 clicks
- **THEN** they are `[]`, `["video-music"]`, and `["video-music", "video-runner"]`
