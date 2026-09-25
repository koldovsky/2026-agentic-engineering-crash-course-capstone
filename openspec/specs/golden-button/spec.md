# golden-button Specification

## Purpose
A one-time upgrade (1 000): every 30–90 s a small golden button appears at a random free spot for
5 s; catching it gives 30 s of main-button click value ×7. Timing and spawning are pure functions of
the game tick's elapsed time and an injected `RandomSource`; the state is runtime-only.

Scenario tags: `[unit]` = Vitest test in `lib/game/golden.test.ts`, `[e2e]` = Playwright test in
`e2e/add-upgrades-v2.spec.ts` (viewport 1280 × 720, Ukrainian by default). Notation `S({...})`,
`V3(...)`, `seq(...)`, `G(...)`, `VIS(...)`, `P`, `place(P)`, `placeNull`, "the clock is paused",
"the clock runs N ms" and "the random hook is fixed to r" are defined in `design.md`. Unless a
scenario says otherwise, `random` is `seq()` (throws if called) and `place` is `place(P)`.

## Requirements

### Requirement: Golden button constants and interval roll
`GOLDEN_MIN_INTERVAL_MS` SHALL be `30000`, `GOLDEN_MAX_INTERVAL_MS` `90000`, `GOLDEN_LIFETIME_MS`
`5000`, `GOLDEN_BONUS` `7`, `GOLDEN_BONUS_MS` `30000` and `GOLDEN_SIZE` `{ width: 64, height: 64 }`
(DECISION (confirmed), design D8). `rollGoldenInterval(random)` SHALL call `random`
exactly once and return `GOLDEN_MIN_INTERVAL_MS + Math.floor(random() × (GOLDEN_MAX_INTERVAL_MS −
GOLDEN_MIN_INTERVAL_MS + 1))`. `createGoldenState(random)` SHALL return `{ nextSpawnMs:
rollGoldenInterval(random), visible: null, bonusMs: 0 }`.

#### Scenario: Constants [unit]
- **WHEN** the constants are read
- **THEN** `GOLDEN_MIN_INTERVAL_MS` is `30000`, `GOLDEN_MAX_INTERVAL_MS` is `90000`, `GOLDEN_LIFETIME_MS` is `5000`, `GOLDEN_BONUS` is `7`, `GOLDEN_BONUS_MS` is `30000` and `GOLDEN_SIZE` equals `{ width: 64, height: 64 }`

#### Scenario: Interval roll [unit]
- **WHEN** `rollGoldenInterval` is called with `seq(0)`, `seq(0.25)`, `seq(0.5)`, `seq(0.75)`, `seq(0.999999)`
- **THEN** the results are `30000`, `45000`, `60000`, `75000`, `90000`, each with exactly one random call

#### Scenario: Initial golden state [unit]
- **WHEN** `createGoldenState(seq(0.5))` is called
- **THEN** the result deep-equals `G(60000, null, 0)`

### Requirement: Golden button timing
`tickGolden({ golden, elapsedMs, random, place })` SHALL clamp `elapsedMs` to `[0, MAX_TICK_MS]`
(NaN and negative count as 0; call it `e`) and, when `e` is 0, return the input object. Otherwise
it SHALL return a new state computed in this order: (1) `bonusMs = max(0, bonusMs − e)`; (2) if a
button is visible: `remainingMs − e`; if that is ≤ 0 the button disappears and `nextSpawnMs =
rollGoldenInterval(random)`, else it stays with the new remaining time; (3) if no button was
visible: `nextSpawnMs − e`; if that is ≤ 0, `place()` is called exactly once — a position spawns
`{ position, remainingMs: GOLDEN_LIFETIME_MS }` with `nextSpawnMs = 0`, `null` skips the spawn and
sets `nextSpawnMs = rollGoldenInterval(random)`; otherwise it just counts down. Leftover time is not
carried into the next phase. At most one golden button exists at a time and missing it has no
penalty (DECISION (confirmed), design D3, D8). It SHALL NOT mutate its input.

#### Scenario: Countdown [unit]
- **WHEN** `tickGolden({ golden: G(1000, null, 0), elapsedMs: 100, random: seq(), place: place(P) })` is called
- **THEN** the result deep-equals `G(900, null, 0)` and `place` was called 0 times

#### Scenario: Spawn when the countdown ends [unit]
- **WHEN** `tickGolden` is called with `G(100, null, 0)` and with `G(50, null, 0)`, each with `elapsedMs: 100`, `random: seq()`, `place: place(P)`
- **THEN** both results deep-equal `G(0, VIS(0.5, 0.25, 5000), 0)`
- **AND** each `place` stub was called exactly once and no random value was consumed

#### Scenario: No free spot skips the spawn [unit]
- **WHEN** `tickGolden({ golden: G(100, null, 0), elapsedMs: 100, random: seq(0.25), place: placeNull })` is called
- **THEN** the result deep-equals `G(45000, null, 0)`, `placeNull` was called once and the random source once

#### Scenario: Visible button counts down and expires [unit]
- **WHEN** `tickGolden` is called with `G(0, VIS(0.5, 0.25, 5000), 0)`, `elapsedMs: 100`, `random: seq()`
- **THEN** the result deep-equals `G(0, VIS(0.5, 0.25, 4900), 0)` and `place` was called 0 times
- **WHEN** `tickGolden` is called with `G(0, VIS(0.5, 0.25, 100), 0)`, `elapsedMs: 100`, `random: seq(0.75)`
- **THEN** the result deep-equals `G(75000, null, 0)` (missed: no bonus)

#### Scenario: Bonus runs down independently [unit]
- **WHEN** `tickGolden` is called with `G(5000, null, 30000)` and `elapsedMs: 1000`
- **THEN** the result deep-equals `G(4000, null, 29000)`
- **WHEN** `tickGolden` is called with `G(5000, null, 300)` and `elapsedMs: 1000`
- **THEN** the result deep-equals `G(4000, null, 0)`
- **WHEN** `tickGolden` is called with `G(0, VIS(0.5, 0.25, 3000), 500)` and `elapsedMs: 1000`
- **THEN** the result deep-equals `G(0, VIS(0.5, 0.25, 2000), 0)`

#### Scenario: Elapsed time is clamped [unit]
- **WHEN** `tickGolden` is called with `G(90000, null, 30000)` and `elapsedMs: 60000`
- **THEN** the result deep-equals `G(89000, null, 29000)`

#### Scenario: Zero, negative and NaN elapsed return the input [unit]
- **GIVEN** `A = G(1000, null, 500)`
- **WHEN** `tickGolden` is called with `A` and `elapsedMs` `0`, `-50` and `Number.NaN`
- **THEN** each result is `A` itself (same reference)

#### Scenario: Full cycle over 100 ms ticks [unit]
- **GIVEN** `createGoldenState(seq(0))` (= `G(30000, null, 0)`) and `random: seq(0.5)` shared by all ticks
- **WHEN** `tickGolden` with `elapsedMs: 100` and `place(P)` is applied 299 times, each on the previous result
- **THEN** the state is `G(100, null, 0)`
- **WHEN** it is applied once more
- **THEN** the state is `G(0, VIS(0.5, 0.25, 5000), 0)`
- **WHEN** it is applied 49 more times
- **THEN** the state is `G(0, VIS(0.5, 0.25, 100), 0)`
- **WHEN** it is applied once more
- **THEN** the state is `G(60000, null, 0)`, `place` was called once in total and the shared random source once

#### Scenario: Input is not mutated [unit]
- **GIVEN** a deeply frozen `G(0, VIS(0.5, 0.25, 200), 1000)`
- **WHEN** `tickGolden` is called with it and `elapsedMs: 100`
- **THEN** nothing is thrown and the result deep-equals `G(0, VIS(0.5, 0.25, 100), 900)`

### Requirement: Catching the golden button
`catchGolden(golden, random)` SHALL, when a button is visible, return `{ nextSpawnMs:
rollGoldenInterval(random), visible: null, bonusMs: GOLDEN_BONUS_MS }` — a running bonus is
restarted, not stacked (DECISION (confirmed), design D11). With nothing visible it SHALL
return the input object without calling `random`. `getGoldenBonus(golden)` SHALL return
`GOLDEN_BONUS` (7) when `golden` is not null and `bonusMs > 0`, otherwise `1`. Catching is not a
click: it SHALL NOT change `balance` or `totalClicks` (DECISION (confirmed), design D1).

#### Scenario: Catch starts the bonus [unit]
- **WHEN** `catchGolden(G(0, VIS(0.5, 0.25, 1200), 0), seq(0.5))` is called
- **THEN** the result deep-equals `G(60000, null, 30000)`

#### Scenario: Catch during a bonus restarts it [unit]
- **WHEN** `catchGolden(G(0, VIS(0.5, 0.25, 1200), 12000), seq(0))` is called
- **THEN** the result deep-equals `G(30000, null, 30000)`

#### Scenario: Nothing to catch [unit]
- **GIVEN** `A = G(20000, null, 5000)`
- **WHEN** `catchGolden(A, seq())` is called
- **THEN** the result is `A` itself and the random source was called 0 times

#### Scenario: Bonus value [unit]
- **WHEN** `getGoldenBonus` is evaluated for `null`, `G(1000, null, 0)`, `G(1000, null, 1)`, `G(0, VIS(0.5, 0.25, 100), 30000)`
- **THEN** the results are `1`, `1`, `7`, `7`

### Requirement: Golden button in the page
When "golden-button" is owned, the page SHALL keep a runtime golden state: created with
`createGoldenState(pageRandom)` right after the purchase, or on the first game tick after load when
none exists (that tick does not count down), advanced by `tickGolden` on every game tick, and reset
by reload and by reset (DECISION (confirmed), design D2). `place` SHALL call
`placeDecor({ viewport, size: GOLDEN_SIZE, reserved, random: pageRandom })` with the reserved
rects of design D8 (main button, balance area, shop at max height, switchers, helper zone, reset,
click-status slot, every placed decor). A visible golden button SHALL render as
`<button data-testid="golden-button">` with `position: fixed` at `decorRect(position, GOLDEN_SIZE,
viewport)` and `aria-label` `golden.catch`; clicking it SHALL call `catchGolden`. While the bonus
runs, `[data-testid="golden-bonus"]` inside `[data-testid="click-status"]` SHALL show `golden.bonus`
with `seconds = Math.ceil(bonusMs / 1000)`, and every main-button press SHALL use `goldenBonus: 7`.
Runtime changes SHALL NOT write storage. Without the upgrade no golden button ever appears.

#### Scenario: Golden button appears after the rolled interval [e2e]
- **GIVEN** the random hook is fixed to `0.75`, storage is seeded with `V3(S({ balance: 1000, totalClicks: 700 }))` and the clock is paused
- **WHEN** the user clicks `[data-testid="shop-buy-golden-button"]`
- **THEN** `[data-testid="balance"]` shows `0`, `[data-testid="shop-owned-golden-button"]` has text `Куплено` and `[data-testid="golden-button"]` has count 0
- **WHEN** the clock runs 74 900 ms
- **THEN** `[data-testid="golden-button"]` has count 0
- **WHEN** the clock runs 100 ms more
- **THEN** `[data-testid="golden-button"]` is visible with a bounding box x = 904, y = 484, width = 64, height = 64 (each ±1 px) and accessible name `Зловити золоту кнопку`
- **AND** it does not strictly overlap `main-button`, `balance`, `shop`, `theme-toggle`, `lang-toggle`, `reset`, `helpers` or `click-status`

#### Scenario: Missed golden button disappears without penalty [e2e]
- **GIVEN** the state right after the golden button appeared in "Golden button appears after the rolled interval"
- **WHEN** the clock runs 4 900 ms
- **THEN** `[data-testid="golden-button"]` is visible
- **WHEN** the clock runs 100 ms more
- **THEN** `[data-testid="golden-button"]` has count 0, `[data-testid="golden-bonus"]` has count 0 and `[data-testid="balance"]` shows `0`

#### Scenario: Catching gives 30 s of ×7 [e2e]
- **GIVEN** the state right after the golden button appeared in "Golden button appears after the rolled interval"
- **WHEN** the user clicks `[data-testid="golden-button"]`
- **THEN** `[data-testid="golden-button"]` has count 0, `[data-testid="golden-bonus"]` has text `Золотий бонус ×7: 30 с` and `[data-testid="balance"]` shows `0`
- **AND** the saved state has `totalClicks: 700` (catching is not a click)
- **WHEN** the user clicks the main button once
- **THEN** `[data-testid="balance"]` shows `7`
- **WHEN** the clock runs 1 000 ms
- **THEN** `[data-testid="golden-bonus"]` has text `Золотий бонус ×7: 29 с`
- **WHEN** the clock runs 28 900 ms and the user clicks the main button once
- **THEN** `[data-testid="balance"]` shows `14`
- **WHEN** the clock runs 100 ms
- **THEN** `[data-testid="golden-bonus"]` has count 0
- **WHEN** the user clicks the main button once
- **THEN** `[data-testid="balance"]` shows `15`

#### Scenario: Bonus is lost on reload [e2e]
- **GIVEN** the golden button was caught as in "Catching gives 30 s of ×7" (balance `0`)
- **WHEN** the page is reloaded and the clock is paused again
- **THEN** `[data-testid="golden-bonus"]` and `[data-testid="golden-button"]` have count 0
- **WHEN** the user clicks the main button once
- **THEN** `[data-testid="balance"]` shows `1`

#### Scenario: Golden button in English [e2e]
- **GIVEN** the random hook is fixed to `0.75`, storage is seeded with `V3(S({ balance: 1000, totalClicks: 700 }))` and `dopamine-clicker:lang` = `en`, the clock is paused
- **WHEN** the user buys the golden button, the clock runs 75 000 ms and the user clicks `[data-testid="golden-button"]`
- **THEN** before the catch the golden button had accessible name `Catch the golden button`
- **AND** `[data-testid="golden-bonus"]` has text `Golden bonus ×7: 30 s`
