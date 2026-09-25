# Spec Delta: click-upgrades

## Purpose

Permanent upgrades that raise the value of a main-button click: Double click (×2) and Triple click
(×3, replaces ×2, requires Double). Crit, Combo and Golden button follow in Stage 3.

Scenario tags: `[unit]` = Vitest test in `lib/game/click-value.test.ts` (new `describe` blocks),
`[e2e]` = Playwright test in `e2e/add-shop-v1.spec.ts`. `S({...})`, `V2(...)` are defined in
`design.md`.

## ADDED Requirements

### Requirement: Click multiplier from upgrades
`getClickMultiplier(state)` SHALL return `3` if `upgrades` contains `"triple-click"`, otherwise `2` if
it contains `"double-click"`, otherwise `1` (Triple replaces Double; they do not multiply together).
`getClickModifiers(state)` SHALL return `{ multiplier: getClickMultiplier(state), combo: 1, crit:
false, goldenBonus: 1 }`. Multipliers SHALL apply to main-button clicks only, never to helper income
(DECISION (confirmed), design D2).

#### Scenario: Multiplier per upgrade set [unit]
- **WHEN** `getClickMultiplier` is evaluated for `S({ upgrades: [] })`, `S({ upgrades: ["double-click"] })`, `S({ upgrades: ["double-click", "triple-click"] })`
- **THEN** the results are `1`, `2`, `3`

#### Scenario: Modifiers derived from state [unit]
- **WHEN** `getClickModifiers(S({ upgrades: ["double-click", "triple-click"] }))` is evaluated
- **THEN** it equals `{ multiplier: 3, combo: 1, crit: false, goldenBonus: 1 }`
- **WHEN** `getClickModifiers(S({}))` is evaluated
- **THEN** it equals `{ multiplier: 1, combo: 1, crit: false, goldenBonus: 1 }` (deep-equal to `NEUTRAL_CLICK_MODIFIERS`)

#### Scenario: Other state does not affect the multiplier [unit]
- **WHEN** `getClickMultiplier(S({ balance: 9999, totalClicks: 9999, ownedSkins: ["gold"], material: "gold", helpers: { monkey: 50 } }))` is evaluated
- **THEN** the result is `1`

#### Scenario: Double click doubles a press [unit]
- **GIVEN** `D = S({ balance: 0, totalClicks: 60, upgrades: ["double-click"] })`
- **WHEN** `clickMainButton(D, getClickModifiers(D))` is called
- **THEN** the result is `S({ balance: 2, totalClicks: 61, upgrades: ["double-click"] })`

#### Scenario: Triple replaces double [unit]
- **GIVEN** `T = S({ balance: 10, totalClicks: 250, upgrades: ["double-click", "triple-click"] })`
- **WHEN** `clickMainButton(T, getClickModifiers(T))` is called 3 times in sequence
- **THEN** the final state has `balance: 19` and `totalClicks: 253`

### Requirement: Upgrades in the UI
The main button SHALL apply `clickMainButton(state, getClickModifiers(state))` on every press, so a
bought upgrade takes effect on the next click and after reloads.

#### Scenario: Buy Double click and click [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 100, totalClicks: 60 }))`
- **WHEN** the user clicks `[data-testid="shop-buy-double-click"]`
- **THEN** `[data-testid="balance"]` shows `0`
- **WHEN** the user clicks the main button once
- **THEN** `[data-testid="balance"]` shows `2`
- **AND** the saved state has `balance: 2`, `totalClicks: 61`, `upgrades: ["double-click"]`

#### Scenario: Buy Triple click and click [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 500, totalClicks: 250, upgrades: ["double-click"] }))`
- **WHEN** the user clicks `[data-testid="shop-buy-triple-click"]` and then clicks the main button twice
- **THEN** `[data-testid="balance"]` shows `6`
- **AND** `[data-testid="shop-owned-double-click"]` and `[data-testid="shop-owned-triple-click"]` both have text `Куплено`

#### Scenario: Upgrade survives reload [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 0, totalClicks: 250, upgrades: ["double-click", "triple-click"] }))`
- **WHEN** the page `/` is loaded and the main button is clicked once
- **THEN** `[data-testid="balance"]` shows `3`
