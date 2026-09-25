# clicker-core Specification

## Purpose

The core clicking loop of Dopamine Clicker: a centered main button that earns clicks, a spendable
balance shown above it, and a lifetime total-click counter used for unlocks in later stages.

Scenario tags: `[unit]` = Vitest test in `lib/`, `[e2e]` = Playwright test in
`e2e/add-foundation.spec.ts`. Unless stated otherwise e2e runs on the Playwright "Desktop Chrome"
viewport (1280 × 720) with empty `localStorage`.

## Requirements

### Requirement: Initial game state
A new game SHALL start with balance 0, total clicks 0 and nothing bought:
`FRESH = { balance: 0, totalClicks: 0, ownedSkins: [], enabledSkins: [], material: "classic",
decor: [], upgrades: [], helpers: { monkey: 0, robot: 0, factory: 0 }, levels: { crit: 0,
"speed-monkey": 0, "speed-robot": 0, "speed-factory": 0 } }`.

#### Scenario: Fresh state values [unit]
- **WHEN** the initial state is created
- **THEN** it deep-equals `{ balance: 0, totalClicks: 0, ownedSkins: [], enabledSkins: [], material: "classic", decor: [], upgrades: [], helpers: { monkey: 0, robot: 0, factory: 0 }, levels: { crit: 0, "speed-monkey": 0, "speed-robot": 0, "speed-factory": 0 } }`

#### Scenario: Fresh state is a new object each time [unit]
- **WHEN** the initial state is created twice
- **THEN** both results deep-equal `FRESH`
- **AND** they are not the same object reference, and neither are their `ownedSkins`, `decor`, `helpers` or `levels` members

### Requirement: Click value formula
The value of one main-button click SHALL be the exact product
`getClickValue(m) = Number((1 × multiplier × combo × (crit ? 10 : 1) × goldenBonus).toFixed(6))`
(the 6-decimal normalisation only removes float artefacts; the value is NOT rounded to an integer).
Whole clicks SHALL be credited with `creditClick(carry, value)`: `total = Number((carry +
value).toFixed(6))`, `credited = Math.floor(total)`, `carry' = Number((total − credited).toFixed(6))`,
so the balance stays an integer and fractions accumulate across presses. The main-click carry is
runtime-only: never saved, 0 after load and after reset (DECISION (confirmed), design D2, D9).
The UI SHALL obtain modifiers, value and credit through `pressMainButton` (see click-upgrades).
`NEUTRAL_CLICK_MODIFIERS` remains exported for tests.

#### Scenario: Neutral modifiers give 1 [unit]
- **WHEN** the click value is computed for `{ multiplier: 1, combo: 1, crit: false, goldenBonus: 1 }`
- **THEN** the result is `1`

#### Scenario: Exported neutral modifiers constant [unit]
- **WHEN** the exported neutral modifiers constant is read
- **THEN** it equals `{ multiplier: 1, combo: 1, crit: false, goldenBonus: 1 }`
- **AND** the click value for it is `1`

#### Scenario: Multiplier is applied [unit]
- **WHEN** the click value is computed for `{ multiplier: 3, combo: 1, crit: false, goldenBonus: 1 }`
- **THEN** the result is `3`

#### Scenario: Crit multiplies by 10 [unit]
- **WHEN** the click value is computed for `{ multiplier: 2, combo: 1, crit: true, goldenBonus: 1 }`
- **THEN** the result is `20`

#### Scenario: All factors multiply [unit]
- **WHEN** the click value is computed for `{ multiplier: 3, combo: 2, crit: true, goldenBonus: 7 }`
- **THEN** the result is `420`

#### Scenario: Combo and golden bonus are applied without crit [unit]
- **WHEN** the click value is computed for `{ multiplier: 1, combo: 2, crit: false, goldenBonus: 7 }`
- **THEN** the result is `14`

#### Scenario: Fractional values are exact, not rounded [unit]
- **WHEN** the click value is computed for `{ multiplier: 1, combo: 1.5, crit: false, goldenBonus: 1 }`, `{ multiplier: 3, combo: 1.1, crit: false, goldenBonus: 1 }` (raw float product `3.3000000000000003`) and `{ multiplier: 3, combo: 1.7, crit: false, goldenBonus: 7 }` (raw `35.699999999999996`)
- **THEN** the results are exactly (`toBe`) `1.5`, `3.3` and `35.7`

#### Scenario: Crit and golden products stay exact integers [unit]
- **WHEN** the click value is computed for `{ multiplier: 3, combo: 1.4, crit: true, goldenBonus: 1 }` (raw `41.99999999999999`), `{ multiplier: 3, combo: 1.9, crit: true, goldenBonus: 7 }` (raw `398.99999999999994`), `{ multiplier: 2, combo: 1.3, crit: true, goldenBonus: 1 }` and `{ multiplier: 3, combo: 1.5, crit: true, goldenBonus: 7 }`
- **THEN** the results are exactly `42`, `399`, `26` and `315`

#### Scenario: Combo levels with Triple click [unit]
- **WHEN** the click value is computed for `{ multiplier: 3, combo: 1 + k / 10, crit: false, goldenBonus: 1 }` for `k = 0 … 10`
- **THEN** the results are exactly `3, 3.3, 3.6, 3.9, 4.2, 4.5, 4.8, 5.1, 5.4, 5.7, 6`

#### Scenario: Carry credits whole clicks at combo ×1.3 [unit]
- **GIVEN** carry `0` and value `getClickValue({ multiplier: 1, combo: 1.3, crit: false, goldenBonus: 1 })` = `1.3`
- **WHEN** `creditClick` is applied 4 times, feeding each result's `carry` into the next call
- **THEN** the `credited` values are `1, 1, 1, 2` and the carries are exactly `0.3, 0.6, 0.9, 0.2`

#### Scenario: Carry over ten Triple ×1.1 presses [unit]
- **GIVEN** carry `0` and value `3.3`
- **WHEN** `creditClick` is applied 10 times, feeding each carry into the next call
- **THEN** the `credited` values are `3, 3, 3, 4, 3, 3, 4, 3, 3, 4` (sum `33`) and the final carry is exactly `0`

#### Scenario: Integer values pass the carry through [unit]
- **WHEN** `creditClick(0, 20)`, `creditClick(0.5, 7)` and `creditClick(0, 42)` are called
- **THEN** the results are `{ credited: 20, carry: 0 }`, `{ credited: 7, carry: 0.5 }` and `{ credited: 42, carry: 0 }`

#### Scenario: Float tolerance completes a click [unit]
- **GIVEN** `0.7 + 0.3` and `0.9 + 0.1` are evaluated in JavaScript
- **WHEN** `creditClick(0.7, 0.3)` and `creditClick(0.9, 0.1)` are called
- **THEN** both results are `{ credited: 1, carry: 0 }`

### Requirement: Main-button click updates balance and total clicks
A main-button press SHALL add the credited whole clicks to the balance and add exactly 1 to total
clicks (total clicks counts presses, not earned amount). `clickMainButton(state, modifiers)` is the
carry-free form: it SHALL add `Math.floor(getClickValue(modifiers))` to the balance and 1 to total
clicks; the UI uses the carry-aware `pressMainButton` (click-upgrades). Every other state field
SHALL be copied unchanged. The operation SHALL return a new state and SHALL NOT mutate its input.

#### Scenario: First click [unit]
- **GIVEN** state `FRESH`
- **WHEN** the main button is clicked with neutral modifiers
- **THEN** the new state is `S({ balance: 1, totalClicks: 1 })`

#### Scenario: Click on an existing state [unit]
- **GIVEN** state `S({ balance: 41, totalClicks: 99 })`
- **WHEN** the main button is clicked with neutral modifiers
- **THEN** the new state is `S({ balance: 42, totalClicks: 100 })`

#### Scenario: Click value above 1 adds to balance but total clicks grows by 1 [unit]
- **GIVEN** state `S({ balance: 5, totalClicks: 5 })`
- **WHEN** the main button is clicked with `{ multiplier: 2, combo: 1, crit: true, goldenBonus: 1 }`
- **THEN** the new state is `S({ balance: 25, totalClicks: 6 })`

#### Scenario: Carry-free click floors a fractional value [unit]
- **GIVEN** state `S({ balance: 5, totalClicks: 5 })`
- **WHEN** `clickMainButton` is called with `{ multiplier: 3, combo: 1.5, crit: false, goldenBonus: 1 }` (value `4.5`)
- **THEN** the new state is `S({ balance: 9, totalClicks: 6 })`

#### Scenario: Other fields are copied unchanged [unit]
- **GIVEN** state `S({ balance: 5, totalClicks: 70, ownedSkins: ["squish", "gold"], enabledSkins: ["squish"], material: "gold", decor: [{ id: "sleeping-cat", position: { x: 0.1, y: 0.2 } }], upgrades: ["double-click"], helpers: { monkey: 2 } })`
- **WHEN** the main button is clicked with `{ multiplier: 2, combo: 1, crit: false, goldenBonus: 1 }`
- **THEN** the new state equals the input with `balance: 7` and `totalClicks: 71`, all other fields deep-equal

#### Scenario: Input state is not mutated [unit]
- **GIVEN** a deeply frozen state `S({ balance: 3, totalClicks: 3 })`
- **WHEN** the main button is clicked with neutral modifiers
- **THEN** no error is thrown, the returned state is `S({ balance: 4, totalClicks: 4 })`
- **AND** the input object still equals `S({ balance: 3, totalClicks: 3 })` and is a different reference from the result

#### Scenario: Total clicks never decreases over a click sequence [unit]
- **GIVEN** state `FRESH`
- **WHEN** the main button is clicked 25 times with neutral modifiers, recording total clicks after each click
- **THEN** the recorded totals are exactly `1, 2, …, 25` (strictly increasing by 1)
- **AND** the final state is `S({ balance: 25, totalClicks: 25 })`

#### Scenario: Clicking in the browser increments the counter [e2e]
- **GIVEN** the page `/` is loaded with empty storage
- **WHEN** the user clicks `[data-testid="main-button"]` 3 times
- **THEN** `[data-testid="balance"]` shows the text `3`

### Requirement: Balance counter visibility
The balance counter SHALL be hidden until the first main-button click (total clicks ≥ 1) and SHALL
be visible from then on, including when the balance is 0.

#### Scenario: Visibility rule — no clicks [unit]
- **WHEN** balance visibility is evaluated for `{ balance: 0, totalClicks: 0 }`
- **THEN** the result is `false`

#### Scenario: Visibility rule — after one click [unit]
- **WHEN** balance visibility is evaluated for `{ balance: 1, totalClicks: 1 }`
- **THEN** the result is `true`

#### Scenario: Visibility rule — zero balance but clicks made [unit]
- **WHEN** balance visibility is evaluated for `{ balance: 0, totalClicks: 12 }`
- **THEN** the result is `true`

#### Scenario: Counter hidden before first click, shown after [e2e]
- **GIVEN** the page `/` is loaded with empty storage
- **THEN** `[data-testid="main-button"]` is visible and enabled
- **AND** `[data-testid="balance"]` is not visible
- **WHEN** the user clicks the main button once
- **THEN** `[data-testid="balance"]` is visible with text `1`

### Requirement: Main screen layout
The main button SHALL be centered in the viewport, the balance counter SHALL sit directly above it,
and the theme and language controls SHALL be in the top-right corner. The main button SHALL NOT
move when the counter appears (space for the counter is reserved). The main button SHALL be a real
`<button>` whose visible label is the localized "Клік" / "Click". The page SHALL keep a `<main>`
landmark (required by `e2e/smoke.spec.ts`).

#### Scenario: Button is centered and does not jump [e2e]
- **GIVEN** the page `/` is loaded with empty storage at viewport 1280 × 720
- **WHEN** the bounding box of `[data-testid="main-button"]` is measured before any click
- **THEN** its center is within 40 px of x = 640 and within 60 px of y = 360
- **WHEN** the user clicks the main button once and the box is measured again
- **THEN** its x and y each differ by at most 1 px from the first measurement

#### Scenario: Counter above button, switchers top-right [e2e]
- **GIVEN** the page `/` is loaded and the main button was clicked once (viewport 1280 × 720)
- **THEN** the bottom edge of `[data-testid="balance"]` is at or above the top edge of `[data-testid="main-button"]`
- **AND** the horizontal center of the balance is within 40 px of the main button's horizontal center
- **AND** `[data-testid="theme-toggle"]` and `[data-testid="lang-toggle"]` each have a box with left edge > 640 and top edge < 100

#### Scenario: Main button is disabled until saved state is loaded [e2e]
- **GIVEN** `localStorage["dopamine-clicker:save"]` is seeded with `{"version":1,"state":{"balance":7,"totalClicks":7}}` before the page loads
- **WHEN** the page `/` is loaded and the user clicks the main button once (Playwright waits for it to be enabled)
- **THEN** `[data-testid="balance"]` shows `8` (the click was applied on top of the loaded state, not lost or overwritten)
