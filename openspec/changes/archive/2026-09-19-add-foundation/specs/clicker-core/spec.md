# Spec Delta: clicker-core

## Purpose

The core clicking loop of Dopamine Clicker: a centered main button that earns clicks, a spendable
balance shown above it, and a lifetime total-click counter used for unlocks in later stages.

Scenario tags: `[unit]` = Vitest test in `lib/`, `[e2e]` = Playwright test in
`e2e/add-foundation.spec.ts`. Unless stated otherwise e2e runs on the Playwright "Desktop Chrome"
viewport (1280 × 720) with empty `localStorage`.

## ADDED Requirements

### Requirement: Initial game state
A new game SHALL start with balance 0 and total clicks 0.

#### Scenario: Fresh state values [unit]
- **WHEN** the initial state is created
- **THEN** it equals `{ balance: 0, totalClicks: 0 }`

#### Scenario: Fresh state is a new object each time [unit]
- **WHEN** the initial state is created twice
- **THEN** both results are deep-equal to `{ balance: 0, totalClicks: 0 }`
- **AND** they are not the same object reference

### Requirement: Click value formula
The value of one main-button click SHALL be `1 × multiplier × combo × (crit ? 10 : 1) × goldenBonus`.
In this stage the UI SHALL always use the neutral modifiers
`{ multiplier: 1, combo: 1, crit: false, goldenBonus: 1 }`, so every click is worth exactly 1.

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
(total clicks counts presses, not earned amount). The operation SHALL return a new state and SHALL
NOT mutate its input.

#### Scenario: First click [unit]
- **GIVEN** state `{ balance: 0, totalClicks: 0 }`
- **WHEN** the main button is clicked with neutral modifiers
- **THEN** the new state is `{ balance: 1, totalClicks: 1 }`

#### Scenario: Click on an existing state [unit]
- **GIVEN** state `{ balance: 41, totalClicks: 99 }`
- **WHEN** the main button is clicked with neutral modifiers
- **THEN** the new state is `{ balance: 42, totalClicks: 100 }`

#### Scenario: Click value above 1 adds to balance but total clicks grows by 1 [unit]
- **GIVEN** state `{ balance: 5, totalClicks: 5 }`
- **WHEN** the main button is clicked with `{ multiplier: 2, combo: 1, crit: true, goldenBonus: 1 }`
- **THEN** the new state is `{ balance: 25, totalClicks: 6 }`

#### Scenario: Input state is not mutated [unit]
- **GIVEN** a frozen (`Object.freeze`) state `{ balance: 3, totalClicks: 3 }`
- **WHEN** the main button is clicked with neutral modifiers
- **THEN** no error is thrown, the returned state is `{ balance: 4, totalClicks: 4 }`
- **AND** the input object still equals `{ balance: 3, totalClicks: 3 }` and is a different reference from the result

#### Scenario: Total clicks never decreases over a click sequence [unit]
- **GIVEN** state `{ balance: 0, totalClicks: 0 }`
- **WHEN** the main button is clicked 25 times with neutral modifiers, recording total clicks after each click
- **THEN** the recorded totals are exactly `1, 2, …, 25` (strictly increasing by 1)
- **AND** the final state is `{ balance: 25, totalClicks: 25 }`

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
