# combo Specification

## Purpose
A one-time upgrade (400) that rewards fast clicking: presses at most 500 ms apart build a
temporary multiplier in steps of ×0.1 up to ×2; when clicking pauses it decays back to ×1. The
state is runtime-only and all time is injected, so the rules are pure and testable.

Scenario tags: `[unit]` = Vitest test in `lib/game/combo.test.ts`, `[e2e]` = Playwright test in
`e2e/add-upgrades-v2.spec.ts` (viewport 1280 × 720, Ukrainian by default). Notation `S({...})`,
`V3(...)`, `C(level, lastClickAt)`, "the clock is paused" / "the clock runs N ms" are defined in
`design.md`. "N fast clicks" in e2e = N clicks on `[data-testid="main-button"]` with the clock
running 100 ms between consecutive clicks (and not after the last one).

## Requirements

### Requirement: Combo constants and state
`COMBO_WINDOW_MS` SHALL be `500`, `COMBO_STEP` `0.1`, `COMBO_MAX_LEVEL` `10` and `COMBO_DECAY_MS`
`250` (DECISION (confirmed), design D7). `createComboState()` SHALL return a new
`{ level: 0, lastClickAt: null }` object on every call. Combo state is never saved.

#### Scenario: Constants [unit]
- **WHEN** the constants are read
- **THEN** `COMBO_WINDOW_MS` is `500`, `COMBO_STEP` is `0.1`, `COMBO_MAX_LEVEL` is `10`, `COMBO_DECAY_MS` is `250`

#### Scenario: Fresh combo state [unit]
- **WHEN** `createComboState()` is called twice
- **THEN** both results deep-equal `{ level: 0, lastClickAt: null }` and are different objects

### Requirement: Combo level and decay
`getComboLevel(combo, nowMs)` SHALL return `0` when `lastClickAt` is `null`. Otherwise, with
`idle = max(0, nowMs − lastClickAt)`, it SHALL return `level` while `idle <= COMBO_WINDOW_MS`, and
`max(0, level − ceil((idle − COMBO_WINDOW_MS) / COMBO_DECAY_MS))` afterwards.
`getComboMultiplier(combo, nowMs)` SHALL return `1 + getComboLevel(combo, nowMs) / 10`.

#### Scenario: No press yet [unit]
- **WHEN** `getComboLevel(C(0, null), 1000)` and `getComboMultiplier(C(0, null), 1000)` are evaluated
- **THEN** the results are `0` and `1`

#### Scenario: Level holds during the window [unit]
- **WHEN** `getComboLevel(C(10, 1000), n)` is evaluated for `n = 1000`, `1500`
- **THEN** both results are `10`

#### Scenario: Decay after the window [unit]
- **WHEN** `getComboLevel(C(10, 1000), n)` is evaluated for `n = 1501`, `1750`, `1751`, `2000`, `3499`, `3500`, `3501`, `10000`
- **THEN** the results are `9`, `9`, `8`, `8`, `2`, `2`, `1`, `0`

#### Scenario: Full pause returns to ×1 just after 2 750 ms [unit]
- **WHEN** `getComboMultiplier(C(10, 0), n)` is evaluated for `n = 2750` and `n = 2751`
- **THEN** the results are `1.1` and `1`

#### Scenario: Clock going backwards counts as no idle time [unit]
- **WHEN** `getComboLevel(C(7, 1000), 900)` is evaluated
- **THEN** the result is `7`

#### Scenario: Multiplier values are exact tenths [unit]
- **WHEN** `getComboMultiplier(C(k, 0), 0)` is evaluated for `k = 0 … 10`
- **THEN** the results are exactly (`toBe`) `1`, `1.1`, `1.2`, `1.3`, `1.4`, `1.5`, `1.6`, `1.7`, `1.8`, `1.9`, `2`

### Requirement: Registering a press
`registerComboClick(combo, nowMs)` SHALL return a new state with `lastClickAt: nowMs` and: if the
press is fast (`lastClickAt !== null` and `nowMs − lastClickAt <= COMBO_WINDOW_MS`),
`level = min(COMBO_MAX_LEVEL, getComboLevel(combo, nowMs) + 1)`; otherwise
`level = getComboLevel(combo, nowMs)` (a slow press keeps the decayed level and adds nothing). It
SHALL NOT mutate its input.

#### Scenario: First press starts at level 0 [unit]
- **WHEN** `registerComboClick(C(0, null), 1000)` is called
- **THEN** the result deep-equals `C(0, 1000)`

#### Scenario: Fast press boundary [unit]
- **WHEN** `registerComboClick(C(0, 1000), 1500)` and `registerComboClick(C(0, 1000), 1501)` are called
- **THEN** the results deep-equal `C(1, 1500)` and `C(0, 1501)`

#### Scenario: Eleven fast presses reach ×2 [unit]
- **GIVEN** `C(0, null)`
- **WHEN** `registerComboClick` is applied at `nowMs = 0, 100, 200, …, 1000` (11 presses), each on the previous result
- **THEN** the levels after each press are `0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10`
- **AND** the final state deep-equals `C(10, 1000)`

#### Scenario: Cap at the maximum level [unit]
- **WHEN** `registerComboClick(C(10, 0), 100)` is called
- **THEN** the result deep-equals `C(10, 100)`

#### Scenario: Slow press keeps the decayed level [unit]
- **WHEN** `registerComboClick(C(10, 0), 750)` and `registerComboClick(C(10, 0), 4000)` are called
- **THEN** the results deep-equal `C(9, 750)` and `C(0, 4000)`

#### Scenario: Input is not mutated [unit]
- **GIVEN** a frozen `C(3, 100)`
- **WHEN** `registerComboClick(combo, 200)` is called
- **THEN** nothing is thrown, the result deep-equals `C(4, 200)` and the input still deep-equals `C(3, 100)`

### Requirement: Combo meter in the page
While "combo" is owned and the displayed combo level is > 0, the page SHALL show
`[data-testid="combo"]` inside `[data-testid="click-status"]` with the text `combo.label`
(multiplier formatted with `formatNumber` for the current language) and `data-combo-level` = the
displayed level. The displayed level SHALL be `getComboLevel(runtime.combo, now)` refreshed at
least on every game tick (100 ms) and after every press. At level 0, or without the upgrade, the
meter SHALL NOT be rendered. The combo SHALL apply to main-button presses only and SHALL reset on
reload (DECISION (confirmed), design D1, D2, D13).

#### Scenario: Fast clicks build the combo [e2e]
- **GIVEN** storage is seeded with `V3(S({ balance: 0, totalClicks: 300, upgrades: ["combo"] }))` and the clock is paused
- **THEN** `[data-testid="combo"]` has count 0
- **WHEN** the user makes 11 fast clicks
- **THEN** `[data-testid="balance"]` shows `16` (values 1.0, 1.1, …, 2.0 credited through the main-click carry as 1, 1, 1, 1, 2, 1, 2, 1, 2, 2, 2; carry 0.5 left)
- **AND** `[data-testid="combo"]` has text `Комбо ×2` and `data-combo-level="10"`

#### Scenario: Combo decays when clicking pauses [e2e]
- **GIVEN** the state after "Fast clicks build the combo" (clock still paused)
- **WHEN** the clock runs 500 ms
- **THEN** `[data-testid="combo"]` has text `Комбо ×2`
- **WHEN** the clock runs 250 ms more
- **THEN** `[data-testid="combo"]` has text `Комбо ×1,9` and `data-combo-level="9"`
- **WHEN** the clock runs 2 250 ms more
- **THEN** `[data-testid="combo"]` has count 0
- **WHEN** the user clicks the main button once
- **THEN** `[data-testid="balance"]` shows `17` (value 1 plus carry 0.5)

#### Scenario: Combo in English [e2e]
- **GIVEN** storage is seeded with `V3(S({ balance: 0, totalClicks: 300, upgrades: ["combo"] }))`, `dopamine-clicker:lang` = `en`, and the clock is paused
- **WHEN** the user makes 6 fast clicks
- **THEN** `[data-testid="balance"]` shows `7` (values 1.0 … 1.5 sum to 7.5) and `[data-testid="combo"]` has text `Combo ×1.5`

#### Scenario: Without the upgrade there is no combo [e2e]
- **GIVEN** storage is seeded with `V3(S({ balance: 0, totalClicks: 300 }))` and the clock is paused
- **WHEN** the user makes 11 fast clicks
- **THEN** `[data-testid="balance"]` shows `11` and `[data-testid="combo"]` has count 0

#### Scenario: Combo resets on reload [e2e]
- **GIVEN** the state after "Fast clicks build the combo"
- **WHEN** the page is reloaded and the clock is paused again
- **THEN** `[data-testid="combo"]` has count 0 and `[data-testid="balance"]` shows `16`
- **WHEN** the user makes 6 fast clicks
- **THEN** `[data-testid="balance"]` shows `23` (values 1.0 … 1.5 sum to 7.5 on a carry of 0, credited 7; a carry of 0.5 kept across the reload would have given `24`)

#### Scenario: Meter does not move the main button [e2e]
- **GIVEN** storage is seeded with `V3(S({ balance: 0, totalClicks: 300, upgrades: ["combo"] }))`, the clock is paused and the main button's bounding box is recorded
- **WHEN** the user makes 3 fast clicks
- **THEN** `[data-testid="combo"]` is visible and the main button's x and y differ by at most 1 px from the recorded box
- **AND** `[data-testid="click-status"]` has x within 1 px of main-button right edge + 24, width 160 and height 64 (±1 px), and does not strictly overlap the main button
