# Spec Delta: click-upgrades

Stage 3 lets the click modifiers take runtime inputs (combo, crit, golden bonus) and adds a single
pure press pipeline, `pressMainButton`, which the UI calls on every main-button press. It credits
fractional values through the runtime-only main-click carry (design D9).

Scenario tags: `[unit]` = Vitest test in `lib/game/click-value.test.ts` (modifiers) or
`lib/game/press.test.ts` (press pipeline), `[e2e]` = Playwright test in `e2e/add-shop-v1.spec.ts`
(existing, unchanged) or `e2e/add-upgrades-v2.spec.ts` (noted as "new"). Notation `FRESH`,
`S({...})`, `V2(...)`, `V3(...)`, `seq(...)`, `C(...)`, `G(...)`, `VIS(...)` is defined in
`design.md`. `R0` = `createClickRuntime()`.

## MODIFIED Requirements

### Requirement: Click multiplier from upgrades
`getClickMultiplier(state)` SHALL return `3` if `upgrades` contains `"triple-click"`, otherwise `2` if
it contains `"double-click"`, otherwise `1` (Triple replaces Double; they do not multiply together).
`getClickModifiers(state, context?)` SHALL return `{ multiplier: getClickMultiplier(state), combo,
crit, goldenBonus }` where `combo = context.comboMultiplier` only if `upgrades` contains `"combo"`,
`crit = context.crit` only if `levels.crit >= 1`, `goldenBonus = context.goldenBonus` only if
`upgrades` contains `"golden-button"`, and each is neutral (`1`, `false`, `1`) otherwise or when
`context` is omitted. Multipliers, combo, crit and golden bonus SHALL apply to main-button clicks
only, never to helper income (DECISION (confirmed), add-shop-v1 design D2 and design D1).

#### Scenario: Multiplier per upgrade set [unit]
- **WHEN** `getClickMultiplier` is evaluated for `S({ upgrades: [] })`, `S({ upgrades: ["double-click"] })`, `S({ upgrades: ["double-click", "triple-click"] })`
- **THEN** the results are `1`, `2`, `3`

#### Scenario: Modifiers derived from state [unit]
- **WHEN** `getClickModifiers(S({ upgrades: ["double-click", "triple-click"] }))` is evaluated
- **THEN** it equals `{ multiplier: 3, combo: 1, crit: false, goldenBonus: 1 }`
- **WHEN** `getClickModifiers(S({}))` is evaluated
- **THEN** it equals `{ multiplier: 1, combo: 1, crit: false, goldenBonus: 1 }` (deep-equal to `NEUTRAL_CLICK_MODIFIERS`)

#### Scenario: Other state does not affect the multiplier [unit]
- **WHEN** `getClickMultiplier(S({ balance: 9999, totalClicks: 9999, ownedSkins: ["gold"], material: "gold", upgrades: ["combo", "golden-button"], helpers: { monkey: 50, robot: 5 }, levels: { crit: 3 } }))` is evaluated
- **THEN** the result is `1`

#### Scenario: Context is used when the upgrades are owned [unit]
- **WHEN** `getClickModifiers(S({ upgrades: ["combo", "golden-button"], levels: { crit: 1 } }), { comboMultiplier: 1.5, crit: true, goldenBonus: 7 })` is evaluated
- **THEN** it equals `{ multiplier: 1, combo: 1.5, crit: true, goldenBonus: 7 }`

#### Scenario: Context is ignored for upgrades that are not owned [unit]
- **WHEN** `getClickModifiers(S({}), { comboMultiplier: 1.5, crit: true, goldenBonus: 7 })` is evaluated
- **THEN** it equals `{ multiplier: 1, combo: 1, crit: false, goldenBonus: 1 }`
- **WHEN** `getClickModifiers(S({ upgrades: ["double-click", "combo"] }), { comboMultiplier: 1.5, crit: true, goldenBonus: 7 })` is evaluated
- **THEN** it equals `{ multiplier: 2, combo: 1.5, crit: false, goldenBonus: 1 }`

#### Scenario: Owned upgrades without context stay neutral [unit]
- **WHEN** `getClickModifiers(S({ upgrades: ["double-click", "combo", "golden-button"], levels: { crit: 3 } }))` is evaluated
- **THEN** it equals `{ multiplier: 2, combo: 1, crit: false, goldenBonus: 1 }`

#### Scenario: Double click doubles a press [unit]
- **GIVEN** `D = S({ balance: 0, totalClicks: 60, upgrades: ["double-click"] })`
- **WHEN** `clickMainButton(D, getClickModifiers(D))` is called
- **THEN** the result is `S({ balance: 2, totalClicks: 61, upgrades: ["double-click"] })`

#### Scenario: Triple replaces double [unit]
- **GIVEN** `T = S({ balance: 10, totalClicks: 250, upgrades: ["double-click", "triple-click"] })`
- **WHEN** `clickMainButton(T, getClickModifiers(T))` is called 3 times in sequence
- **THEN** the final state has `balance: 19` and `totalClicks: 253`

### Requirement: Upgrades in the UI
The main button SHALL apply `pressMainButton({ state, runtime, carry, nowMs: performance.now(),
random: pageRandom })` on every press (through `game-store`'s `press`), save the returned state,
keep the returned runtime and carry in memory (never saved, reset on reload and reset), and start
the crit effect when `crit` is true. A bought upgrade takes effect on the next click and after
reloads.

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

#### Scenario: Every Stage 3 factor combines in the browser [e2e]
New test in `e2e/add-upgrades-v2.spec.ts`.
- **GIVEN** the random hook is fixed to `0.01`, storage is seeded with `V3(S({ balance: 0, totalClicks: 5000, upgrades: ["double-click", "triple-click", "combo"], levels: { crit: 1 } }))` and the clock is paused
- **WHEN** the user makes 6 clicks on the main button with the clock running 100 ms between consecutive clicks
- **THEN** `[data-testid="balance"]` shows `225` (every press crits; values `round(3 × (1 + k / 10) × 10)` for k = 0…5 = 30, 33, 36, 39, 42, 45)
- **AND** `[data-testid="combo"]` has text `Комбо ×1,5` and `[data-testid="crit-text"]` has count 1

## ADDED Requirements

### Requirement: Main-button press pipeline
`createClickRuntime()` SHALL return a new `{ combo: createComboState(), golden: null }` on every
call. `pressMainButton({ state, runtime, carry, nowMs, random })` SHALL: (1) if `upgrades` contains
`"combo"`, set `combo = registerComboClick(runtime.combo, nowMs)`, else keep `runtime.combo`;
(2) `crit = rollCrit(state.levels.crit, random)` (0 random calls at level 0, exactly 1 otherwise);
(3) build `context = { comboMultiplier: getComboMultiplier(combo, nowMs), crit, goldenBonus:
getGoldenBonus(runtime.golden) }`; (4) `modifiers = getClickModifiers(state, context)`,
`value = getClickValue(modifiers)` (exact, may be fractional), `{ credited, carry' } =
creditClick(carry, value)`; and return `{ state: { ...state, balance: balance + credited,
totalClicks: totalClicks + 1 }, runtime', carry: carry', value, credited, crit: modifiers.crit }`
where `runtime'` is the input runtime object when the combo did not change and `{ ...runtime,
combo }` otherwise (the golden state is never changed by a press). It SHALL NOT mutate its inputs
(DECISION (confirmed), design D9).

#### Scenario: Fresh click runtime [unit]
- **WHEN** `createClickRuntime()` is called twice
- **THEN** both results deep-equal `{ combo: { level: 0, lastClickAt: null }, golden: null }` and are different objects

#### Scenario: Plain press [unit]
- **GIVEN** `R = R0`
- **WHEN** `pressMainButton({ state: S({ balance: 5, totalClicks: 5 }), runtime: R, carry: 0, nowMs: 1000, random: seq() })` is called
- **THEN** the result's `state` is `S({ balance: 6, totalClicks: 6 })`, `runtime` is `R` (same object), `carry` is `0`, `value` is `1`, `credited` is `1`, `crit` is `false`
- **AND** the random source was called 0 times

#### Scenario: Crit press [unit]
- **GIVEN** `X = S({ balance: 0, totalClicks: 200, upgrades: ["double-click"], levels: { crit: 1 } })`
- **WHEN** `pressMainButton({ state: X, runtime: R0, carry: 0.5, nowMs: 0, random: seq(0.01) })` is called
- **THEN** `value` is `20`, `credited` is `20`, `carry` is `0.5`, `crit` is `true`, and `state` has `balance: 20`, `totalClicks: 201`
- **WHEN** it is called with `random: seq(0.05)` instead
- **THEN** `value` is `2`, `credited` is `2`, `crit` is `false`, and each random source was called exactly once

#### Scenario: Combo builds over fast presses with a carry [unit]
- **GIVEN** `S({ totalClicks: 300, upgrades: ["combo"] })`, `R0`, carry `0` and `random: seq()`
- **WHEN** `pressMainButton` is applied at `nowMs = 0, 100, …, 1000` (11 presses), feeding each result's `state`, `runtime` and `carry` into the next call
- **THEN** the `value`s are exactly `1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2`
- **AND** the `credited` values are `1, 1, 1, 1, 2, 1, 2, 1, 2, 2, 2`
- **AND** the final state has `balance: 16`, `totalClicks: 311`, the final carry is exactly `0.5` and the final runtime's `combo` deep-equals `C(10, 1000)`

#### Scenario: Combo is not tracked without the upgrade [unit]
- **GIVEN** `S({ totalClicks: 300 })`, `R = R0` and carry `0`
- **WHEN** `pressMainButton` is applied at `nowMs = 0, 100, …, 1000` (11 presses), feeding each result into the next call
- **THEN** every `value` and `credited` is `1`, every carry is `0` and every returned `runtime` is `R` itself

#### Scenario: Golden bonus multiplies the press [unit]
- **GIVEN** `Rg = { combo: C(0, null), golden: G(40000, null, 12000) }`
- **WHEN** `pressMainButton({ state: S({ totalClicks: 700, upgrades: ["golden-button"] }), runtime: Rg, carry: 0, nowMs: 0, random: seq() })` is called
- **THEN** `value` and `credited` are `7` and the returned runtime's `golden` is the same object as `Rg.golden`
- **WHEN** it is called with `runtime: { combo: C(0, null), golden: G(40000, null, 0) }`
- **THEN** `value` is `1`
- **WHEN** it is called with `state: S({ totalClicks: 700 })` (golden button not owned) and `runtime: Rg`
- **THEN** `value` is `1`

#### Scenario: All factors multiply exactly [unit]
- **GIVEN** `A = S({ balance: 0, totalClicks: 5000, upgrades: ["double-click", "triple-click", "combo", "golden-button"], levels: { crit: 3 } })` and `RA = { combo: C(4, 1000), golden: G(10000, null, 30000) }`
- **WHEN** `pressMainButton({ state: A, runtime: RA, carry: 0.25, nowMs: 1200, random: seq(0.1) })` is called
- **THEN** `value` and `credited` are `315` (`3 × 1.5 × 10 × 7`), `carry` is `0.25`, `crit` is `true`, and `state` has `balance: 315`, `totalClicks: 5001`
- **AND** the returned runtime's `combo` deep-equals `C(5, 1200)` and its `golden` is `RA.golden` (same object)

#### Scenario: Inputs are not mutated [unit]
- **GIVEN** a deeply frozen `S({ balance: 3, totalClicks: 300, upgrades: ["combo"], levels: { crit: 1 } })` and a deeply frozen runtime `{ combo: C(2, 0), golden: null }`
- **WHEN** `pressMainButton` is called with them, `carry: 0.8`, `nowMs: 100` and `random: seq(0.5)`
- **THEN** nothing is thrown, `value` is `1.3`, `credited` is `2`, `carry` is exactly `0.1`, the state has `balance: 5`, `totalClicks: 301`, and the returned runtime's `combo` deep-equals `C(3, 100)`
