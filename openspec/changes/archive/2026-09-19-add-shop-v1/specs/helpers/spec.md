# Spec Delta: helpers

## Purpose

Idle helpers that click automatically. Stage 2 has one type, the Monkey (1 click/s each), shown as
a small button that the monkey keeps pressing. Robot, Factory and speed-ups follow in Stage 3.

Scenario tags: `[unit]` = Vitest test in `lib/game/helpers.test.ts`, `[e2e]` = Playwright test in
`e2e/add-shop-v1.spec.ts` using Playwright's fake clock as described in design D20 ("the clock is
paused" = `page.clock.install()` before the first load, then `page.clock.pauseAt(...)` once the main
button is enabled; "the clock runs N ms" = `page.clock.runFor(N)`). Because the clock runs during
page load, exact balances are only asserted when no helper was owned before the pause. `S({...})`, `V2(...)` are
defined in `design.md`.

## ADDED Requirements

### Requirement: Helper income rate
`getHelperClicksPerSecond(state)` SHALL return `Σ helpers[type] × clicksPerSecond(type)`; in Stage 2
that is `helpers.monkey × 1`. Click upgrades SHALL NOT change it (DECISION (confirmed),
design D2).

#### Scenario: Rate per monkey count [unit]
- **WHEN** `getHelperClicksPerSecond` is evaluated for `S({ helpers: { monkey: 0 } })`, `S({ helpers: { monkey: 1 } })`, `S({ helpers: { monkey: 4 } })`
- **THEN** the results are `0`, `1`, `4`

#### Scenario: Upgrades do not boost helpers [unit]
- **WHEN** `getHelperClicksPerSecond(S({ helpers: { monkey: 2 }, upgrades: ["double-click", "triple-click"] }))` is evaluated
- **THEN** the result is `2`

### Requirement: Game tick with fractional carry
`tickHelpers(state, carry, elapsedMs)` SHALL clamp `elapsedMs` to `[0, MAX_TICK_MS]` (NaN and
negative values count as 0), compute `milli = carry + getHelperClicksPerSecond(state) × elapsed`,
add `whole = Math.floor(milli / 1000)` to both `balance` and `totalClicks` (DECISION
(confirmed), design D1), and return `{ state, carry: milli % 1000 }`. When `whole` is 0 the returned
`state` SHALL be the input object itself. Constants: `HELPER_TICK_MS = 100`, `MAX_TICK_MS = 1000`.
It SHALL NOT mutate its input.

#### Scenario: Constants [unit]
- **WHEN** the constants are read
- **THEN** `HELPER_TICK_MS` is `100` and `MAX_TICK_MS` is `1000`

#### Scenario: Partial tick only accumulates [unit]
- **GIVEN** `A = S({ balance: 5, totalClicks: 40, helpers: { monkey: 1 } })`
- **WHEN** `tickHelpers(A, 0, 100)` is called
- **THEN** the result's `state` is `A` (same object) and `carry` is `100`

#### Scenario: Carry completes a click [unit]
- **WHEN** `tickHelpers(S({ balance: 5, totalClicks: 40, helpers: { monkey: 1 } }), 900, 100)` is called
- **THEN** the result is `{ state: S({ balance: 6, totalClicks: 41, helpers: { monkey: 1 } }), carry: 0 }`

#### Scenario: Ten ticks of three monkeys, no float drift [unit]
- **GIVEN** `S({ balance: 0, totalClicks: 30, helpers: { monkey: 3 } })` and carry `0`
- **WHEN** `tickHelpers(…, carry, 100)` is applied 10 times, feeding each result's state and carry into the next call
- **THEN** the carries after each tick are `300, 600, 900, 200, 500, 800, 100, 400, 700, 0`
- **AND** the final state has `balance: 3`, `totalClicks: 33`

#### Scenario: Long gaps are clamped [unit]
- **WHEN** `tickHelpers(S({ balance: 0, totalClicks: 30, helpers: { monkey: 2 } }), 0, 60000)` is called
- **THEN** the result is `{ state: S({ balance: 2, totalClicks: 32, helpers: { monkey: 2 } }), carry: 0 }`

#### Scenario: Invalid elapsed counts as zero [unit]
- **GIVEN** `B = S({ helpers: { monkey: 5 } })`
- **WHEN** `tickHelpers(B, 250, -50)` and `tickHelpers(B, 250, Number.NaN)` are called
- **THEN** both results have `state` equal to `B` (same object) and `carry` `250`

#### Scenario: No helpers keeps the carry [unit]
- **GIVEN** `Z = S({ balance: 7, totalClicks: 7 })`
- **WHEN** `tickHelpers(Z, 400, 1000)` is called
- **THEN** the result's `state` is `Z` (same object) and `carry` is `400`

#### Scenario: Multipliers are ignored [unit]
- **WHEN** `tickHelpers(S({ balance: 0, totalClicks: 250, upgrades: ["double-click", "triple-click"], helpers: { monkey: 1 } }), 0, 1000)` is called
- **THEN** the new state has `balance: 1` and `totalClicks: 251`

#### Scenario: Other fields are preserved and input is not mutated [unit]
- **GIVEN** a deeply frozen `S({ balance: 0, totalClicks: 30, ownedSkins: ["squish"], enabledSkins: ["squish"], helpers: { monkey: 10 } })`
- **WHEN** `tickHelpers(state, 0, 100)` is called
- **THEN** nothing is thrown and the result is `{ state: S({ balance: 1, totalClicks: 31, ownedSkins: ["squish"], enabledSkins: ["squish"], helpers: { monkey: 10 } }), carry: 0 }`

### Requirement: Game tick in the page
After the saved game is loaded, the page SHALL run one 100 ms interval that calls `tickHelpers` with
the latest state, the in-memory carry and the measured elapsed time, and SHALL save the state
whenever the tick adds at least one whole click (DECISION (confirmed), design D11, D16).
Nothing time-related is saved, so helpers earn only while the page is open; reloading never adds
earnings for the time the page was closed (DECISION (confirmed), design D3).

#### Scenario: One monkey earns one click per second [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 50, totalClicks: 30 }))` and the clock is paused
- **WHEN** the user clicks `[data-testid="shop-buy-monkey"]`
- **THEN** `[data-testid="balance"]` shows `0`
- **WHEN** the clock runs 3000 ms
- **THEN** `[data-testid="balance"]` shows `3`
- **AND** the saved state has `balance: 3`, `totalClicks: 33`, `helpers: { monkey: 1 }`

#### Scenario: Helper earnings reveal items [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 337, totalClicks: 55 }))` and the clock is paused
- **WHEN** the user clicks `[data-testid="shop-buy-monkey"]` 5 times (prices 50, 58, 66, 76, 87)
- **THEN** `[data-testid="balance"]` shows `0`, `[data-testid="helper-monkey-count"]` has text `×5` and `[data-testid="shop-item-double-click"]` has count 0
- **WHEN** the clock runs 1000 ms
- **THEN** `[data-testid="balance"]` shows `5` and `[data-testid="shop-item-double-click"]` is visible (totalClicks 60)

#### Scenario: No catch-up for closed time [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 0, totalClicks: 100, helpers: { monkey: 5 } }))`, the clock is installed at `2026-01-01T00:00:00Z` before the first load, and after load the clock is paused and the shown balance is recorded as `B`
- **WHEN** the clock's system time is set 1 hour later (`page.clock.setSystemTime`), the page is reloaded and the clock is paused again
- **THEN** the shown balance is ≤ `B + 10` (no 18 000-click catch-up)
- **AND** the saved envelope has exactly the keys `version`, `state` and the state has exactly the keys `balance`, `totalClicks`, `ownedSkins`, `enabledSkins`, `material`, `decor`, `upgrades`, `helpers` (no timestamp)

### Requirement: Helper zone
The page SHALL render a fixed helper zone `[data-testid="helpers"]` in the bottom-left corner
(left 16 px, bottom 16 px, 288 × 96 px), always present in the layout. When at least one monkey is
owned it SHALL contain `[data-testid="helper-monkey"]`: the monkey character pressing a small
button, `role="img"`, `aria-label` from `helper.monkey.label`, with
`[data-testid="helper-monkey-count"]` showing `×<count>`. The helper element is purely visual:
clicking it SHALL NOT change the game (DECISION (confirmed), design D12).

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
