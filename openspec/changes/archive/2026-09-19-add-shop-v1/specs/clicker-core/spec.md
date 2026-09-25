# Spec Delta: clicker-core

Stage 2 grows the game state to the v2 shape (shop fields) and makes the main button use the click
modifiers derived from owned upgrades.

Scenario tags: `[unit]` = Vitest test in `lib/game/state.test.ts` / `lib/game/click-value.test.ts`,
`[e2e]` = Playwright test in `e2e/add-foundation.spec.ts` (existing, unchanged unless stated).
Notation `FRESH`, `S({...})` is defined in `design.md`.

## MODIFIED Requirements

### Requirement: Initial game state
A new game SHALL start with balance 0, total clicks 0 and nothing bought:
`FRESH = { balance: 0, totalClicks: 0, ownedSkins: [], enabledSkins: [], material: "classic",
decor: [], upgrades: [], helpers: { monkey: 0 } }`.

#### Scenario: Fresh state values [unit]
- **WHEN** the initial state is created
- **THEN** it deep-equals `{ balance: 0, totalClicks: 0, ownedSkins: [], enabledSkins: [], material: "classic", decor: [], upgrades: [], helpers: { monkey: 0 } }`

#### Scenario: Fresh state is a new object each time [unit]
- **WHEN** the initial state is created twice
- **THEN** both results deep-equal `FRESH`
- **AND** they are not the same object reference, and neither are their `ownedSkins`, `decor` or `helpers` members

### Requirement: Click value formula
The value of one main-button click SHALL be `1 × multiplier × combo × (crit ? 10 : 1) × goldenBonus`.
In this stage the UI SHALL pass `getClickModifiers(state)` (see click-upgrades), i.e. the multiplier
comes from owned click upgrades and `combo: 1, crit: false, goldenBonus: 1` stay neutral.
`NEUTRAL_CLICK_MODIFIERS` remains exported for tests and later stages.

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

### Requirement: Main-button click updates balance and total clicks
A main-button click SHALL add the click value to the balance and add exactly 1 to total clicks
(total clicks counts presses, not earned amount). Every other state field SHALL be copied
unchanged. The operation SHALL return a new state and SHALL NOT mutate its input.

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
