# Spec Delta: helpers

Stage 3 adds two helper types, Robot (5 clicks/s) and Factory (40 clicks/s), and per-type
speed-ups that double a type's rate per level. The tick, carry and save policy stay as in Stage 2.

Scenario tags: `[unit]` = Vitest test in `lib/game/helpers.test.ts`, `[e2e]` = Playwright test in
`e2e/add-shop-v1.spec.ts` (existing) or `e2e/add-upgrades-v2.spec.ts` (noted as "new"), using the
fake clock as in design D19 ("the clock is paused", "the clock runs N ms"). Exact balances are only
asserted when no helper was owned before the pause. Notation `FRESH`, `S({...})` (helpers and
levels merged into their defaults), `V2(...)`, `V3(...)` is defined in `design.md`.

## MODIFIED Requirements

### Requirement: Helper income rate
`SPEED_UP_OF` SHALL be `{ monkey: "speed-monkey", robot: "speed-robot", factory: "speed-factory" }`.
`getHelperRate(state, id)` SHALL return `helpers[id] × clicksPerSecond(id) × 2 ** levels[SPEED_UP_OF[id]]`
and `getHelperClicksPerSecond(state)` SHALL return the sum of `getHelperRate` over monkey, robot and
factory. Click upgrades, combo, crit and the golden bonus SHALL NOT change it (DECISION
(confirmed), add-shop-v1 design D2; DECISION (confirmed), design D1).

#### Scenario: Rate per monkey count [unit]
- **WHEN** `getHelperClicksPerSecond` is evaluated for `S({ helpers: { monkey: 0 } })`, `S({ helpers: { monkey: 1 } })`, `S({ helpers: { monkey: 4 } })`
- **THEN** the results are `0`, `1`, `4`

#### Scenario: Upgrades do not boost helpers [unit]
- **WHEN** `getHelperClicksPerSecond(S({ helpers: { monkey: 2 }, upgrades: ["double-click", "triple-click", "combo", "golden-button"], levels: { crit: 3 } }))` is evaluated
- **THEN** the result is `2`

#### Scenario: Speed-up map [unit]
- **WHEN** `SPEED_UP_OF` is read
- **THEN** it equals `{ monkey: "speed-monkey", robot: "speed-robot", factory: "speed-factory" }`

#### Scenario: Rate per helper type [unit]
- **GIVEN** `H = S({ helpers: { monkey: 3, robot: 2, factory: 1 } })`
- **WHEN** `getHelperRate(H, "monkey")`, `getHelperRate(H, "robot")`, `getHelperRate(H, "factory")` and `getHelperClicksPerSecond(H)` are evaluated
- **THEN** the results are `3`, `10`, `40`, `53`

#### Scenario: Speed-ups double per level [unit]
- **GIVEN** `H = S({ helpers: { monkey: 3, robot: 2, factory: 1 }, levels: { "speed-monkey": 1, "speed-robot": 2, "speed-factory": 3 } })`
- **WHEN** the three per-type rates and the total are evaluated
- **THEN** the results are `6`, `40`, `320`, `366`

#### Scenario: A speed-up only affects its own type [unit]
- **GIVEN** `H = S({ helpers: { monkey: 1, robot: 1 }, levels: { "speed-robot": 3 } })`
- **WHEN** the three per-type rates and the total are evaluated
- **THEN** the results are `1`, `40`, `0`, `41`

### Requirement: Game tick in the page
After the saved game is loaded, the page SHALL run one 100 ms interval that calls `tickHelpers` with
the latest state, the in-memory carry and the measured elapsed time, and SHALL save the state
whenever the tick adds at least one whole click (DECISION (confirmed), add-shop-v1 design D11,
D16). The same tick SHALL also advance the golden-button runtime (see golden-button) and refresh
the combo meter (see combo); those runtime changes SHALL NOT write storage. Nothing time-related is
saved, so helpers earn only while the page is open; reloading never adds earnings for the time the
page was closed (DECISION (confirmed), add-shop-v1 design D3).

#### Scenario: One monkey earns one click per second [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 50, totalClicks: 30 }))` and the clock is paused
- **WHEN** the user clicks `[data-testid="shop-buy-monkey"]`
- **THEN** `[data-testid="balance"]` shows `0`
- **WHEN** the clock runs 3000 ms
- **THEN** `[data-testid="balance"]` shows `3`
- **AND** the saved state has `balance: 3`, `totalClicks: 33`, `helpers: { monkey: 1 }` (partial match)

#### Scenario: Helper earnings reveal items [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 337, totalClicks: 55 }))` and the clock is paused
- **WHEN** the user clicks `[data-testid="shop-buy-monkey"]` 5 times (prices 50, 58, 66, 76, 87)
- **THEN** `[data-testid="balance"]` shows `0`, `[data-testid="helper-monkey-count"]` has text `×5` and `[data-testid="shop-item-double-click"]` has count 0
- **WHEN** the clock runs 1000 ms
- **THEN** `[data-testid="balance"]` shows `5` and `[data-testid="shop-item-double-click"]` is visible (totalClicks 60)

#### Scenario: No catch-up for closed time [e2e]
Updated test in `e2e/add-shop-v1.spec.ts` (the saved state now has the v3 keys).
- **GIVEN** storage is seeded with `V2(S({ balance: 0, totalClicks: 100, helpers: { monkey: 5 } }))`, the clock is installed at `2026-01-01T00:00:00Z` before the first load, and after load the clock is paused and the shown balance is recorded as `B`
- **WHEN** the clock's system time is set 1 hour later (`page.clock.setSystemTime`), the page is reloaded and the clock is paused again
- **THEN** the shown balance is ≤ `B + 10` (no 18 000-click catch-up)
- **AND** the saved envelope has exactly the keys `version`, `state` and the state has exactly the keys `balance`, `totalClicks`, `ownedSkins`, `enabledSkins`, `material`, `decor`, `upgrades`, `helpers`, `levels` (no timestamp)

### Requirement: Helper zone
The page SHALL render a fixed helper zone `[data-testid="helpers"]` in the bottom-left corner
(left 16 px, bottom 16 px, 288 × 96 px), always present in the layout. For each helper type with a
count ≥ 1 it SHALL contain, in the order monkey, robot, factory, `[data-testid="helper-<id>"]`: the
character (monkey, robot, factory) pressing a small button, `role="img"`, `aria-label` from
`helper.<id>.label` with `count` = that type's count and `rate` = `getHelperRate(state, id)` (both
formatted), and `[data-testid="helper-<id>-count"]` showing `×<count>`. All helper elements SHALL fit
inside the zone. Helper elements are purely visual: clicking them SHALL NOT change the game
(DECISION (confirmed), add-shop-v1 design D12).

#### Scenario: Monkey appears after purchase [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 50, totalClicks: 30 }))`
- **THEN** `[data-testid="helper-monkey"]` has count 0
- **WHEN** the user clicks `[data-testid="shop-buy-monkey"]`
- **THEN** `[data-testid="helper-monkey"]` is visible, `[data-testid="helper-monkey-count"]` has text `×1`, and the element has role `img` with accessible name `Мавпочки: 1 (+1 за секунду)`

#### Scenario: Count and English label [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 0, totalClicks: 100, helpers: { monkey: 3 } }))` and `dopamine-clicker:lang` = `en`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="helper-monkey-count"]` has text `×3` and `[data-testid="helper-monkey"]` has accessible name `Monkeys: 3 (+3 per second)`

#### Scenario: Helper zone placement [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 0, totalClicks: 750, helpers: { monkey: 1 } }))`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="helpers"]` has x ≤ 24 and bottom edge ≥ 720 − 24
- **AND** it does not strictly overlap `main-button`, `balance`, `shop` or `reset`

#### Scenario: Clicking the monkey does nothing [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 10, totalClicks: 100, helpers: { monkey: 1 } }))`, the clock is paused and the shown balance is recorded as `B`
- **WHEN** the user clicks `[data-testid="helper-monkey"]`
- **THEN** `[data-testid="balance"]` still shows `B`

#### Scenario: Three helper types in the zone [e2e]
New test in `e2e/add-upgrades-v2.spec.ts`.
- **GIVEN** storage is seeded with `V3(S({ balance: 0, totalClicks: 9000, helpers: { monkey: 2, robot: 3, factory: 1 }, levels: { "speed-robot": 1 } }))` and `dopamine-clicker:lang` = `en`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="helper-monkey"]`, `[data-testid="helper-robot"]`, `[data-testid="helper-factory"]` are visible in this left-to-right order, with accessible names `Monkeys: 2 (+2 per second)`, `Robots: 3 (+30 per second)`, `Factories: 1 (+40 per second)`
- **AND** `[data-testid="helper-robot-count"]` has text `×3` and `[data-testid="helper-factory-count"]` has text `×1`
- **AND** each of the three boxes lies inside the box of `[data-testid="helpers"]` (±1 px)

#### Scenario: Robot and factory labels in Ukrainian [e2e]
New test in `e2e/add-upgrades-v2.spec.ts`.
- **GIVEN** storage is seeded with `V3(S({ totalClicks: 9000, helpers: { robot: 1, factory: 2 } }))`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="helper-robot"]` has accessible name `Роботи: 1 (+5 за секунду)` and `[data-testid="helper-factory"]` has accessible name `Фабрики: 2 (+80 за секунду)`
- **AND** `[data-testid="helper-monkey"]` has count 0

## ADDED Requirements

### Requirement: Robot, Factory and speed-ups earn through the tick
`tickHelpers` SHALL use the Stage 3 `getHelperClicksPerSecond` (all helper types, speed-ups
included) with the same milli-click carry and clamp; nothing else in the tick changes.

#### Scenario: Robot partial and completed click [unit]
- **GIVEN** `A = S({ balance: 0, totalClicks: 600, helpers: { robot: 1 } })`
- **WHEN** `tickHelpers(A, 0, 100)` is called
- **THEN** the result's `state` is `A` (same object) and `carry` is `500`
- **WHEN** `tickHelpers(A, 500, 100)` is called
- **THEN** the result is `{ state: S({ balance: 1, totalClicks: 601, helpers: { robot: 1 } }), carry: 0 }`

#### Scenario: Fully sped-up factory for one second [unit]
- **WHEN** `tickHelpers(S({ balance: 0, totalClicks: 80000, helpers: { factory: 1 }, levels: { "speed-factory": 3 } }), 0, 1000)` is called
- **THEN** the result is `{ state: S({ balance: 320, totalClicks: 80320, helpers: { factory: 1 }, levels: { "speed-factory": 3 } }), carry: 0 }`

#### Scenario: Mixed helpers over ten ticks, no float drift [unit]
- **GIVEN** `S({ balance: 0, totalClicks: 1000, helpers: { monkey: 1, robot: 1, factory: 1 }, levels: { "speed-monkey": 1 } })` (47 clicks/s) and carry `0`
- **WHEN** `tickHelpers(…, carry, 100)` is applied 10 times, feeding each result's state and carry into the next call
- **THEN** the carries after each tick are `700, 400, 100, 800, 500, 200, 900, 600, 300, 0`
- **AND** the final state has `balance: 47`, `totalClicks: 1047`

### Requirement: Robot, Factory and speed-ups in the page
Buying a Robot, a Factory or a speed-up SHALL take effect on the next game tick. The shop SHALL
show the speed-up of a helper type only after at least one helper of that type is owned
(DECISION (confirmed), design D5).

#### Scenario: Robot earns five clicks per second [e2e]
New test in `e2e/add-upgrades-v2.spec.ts`.
- **GIVEN** storage is seeded with `V3(S({ balance: 1000, totalClicks: 600 }))` and the clock is paused
- **WHEN** the user clicks `[data-testid="shop-buy-robot"]`
- **THEN** `[data-testid="balance"]` shows `0`, `[data-testid="helper-robot-count"]` has text `×1`, `[data-testid="helper-robot"]` has accessible name `Роботи: 1 (+5 за секунду)` and `[data-testid="shop-buy-robot"]` text with whitespace normalized is `Купити за 1 150`
- **WHEN** the clock runs 1000 ms
- **THEN** `[data-testid="balance"]` shows `5`

#### Scenario: Factory earns forty clicks per second [e2e]
New test in `e2e/add-upgrades-v2.spec.ts`.
- **GIVEN** storage is seeded with `V3(S({ balance: 12000, totalClicks: 8000 }))` and the clock is paused
- **WHEN** the user clicks `[data-testid="shop-buy-factory"]` and the clock runs 1000 ms
- **THEN** `[data-testid="balance"]` shows `40` and `[data-testid="helper-factory"]` has accessible name `Фабрики: 1 (+40 за секунду)`

#### Scenario: Speed-up doubles the monkey [e2e]
New test in `e2e/add-upgrades-v2.spec.ts`.
- **GIVEN** storage is seeded with `V3(S({ balance: 550, totalClicks: 300 }))` and the clock is paused
- **THEN** `[data-testid="shop-item-speed-monkey"]` has count 0
- **WHEN** the user clicks `[data-testid="shop-buy-monkey"]`
- **THEN** `[data-testid="balance"]` shows `500` and `[data-testid="shop-item-speed-monkey"]` is visible
- **WHEN** the user clicks `[data-testid="shop-buy-speed-monkey"]`
- **THEN** `[data-testid="balance"]` shows `0`, `[data-testid="shop-level-speed-monkey"]` has text `Рівень 1 з 3`, `[data-testid="shop-buy-speed-monkey"]` is disabled with normalized text `Купити за 2 500`, and `[data-testid="helper-monkey"]` has accessible name `Мавпочки: 1 (+2 за секунду)`
- **WHEN** the clock runs 1000 ms
- **THEN** `[data-testid="balance"]` shows `2`
