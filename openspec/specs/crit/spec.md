# crit Specification

## Purpose
A leveled click upgrade: each main-button press has a chance to count ×10 (5 % → 10 % → 15 % over
three levels). A crit must be unmistakable: big "КРИТ ×10!" text, a gold flash, a burst of gold
particles and a short screen shake (toned down under reduced motion).

Scenario tags: `[unit]` = Vitest test in `lib/game/crit.test.ts`, `[e2e]` = Playwright test in
`e2e/add-upgrades-v2.spec.ts` (viewport 1280 × 720, default language Ukrainian,
`reducedMotion: "no-preference"` unless stated). Notation `FRESH`, `S({...})`, `V3(...)`,
`seq(...)` and "the random hook is fixed to r" are defined in `design.md`. Shop behaviour of the
`crit` item (price per level, `maxed`, level labels) is specified in `shop`; the press pipeline
that applies the crit is specified in `click-upgrades`.

## Requirements

### Requirement: Crit chance per level
`CRIT_MULTIPLIER` SHALL be `10` and `CRIT_CHANCE_BY_LEVEL` SHALL be `[0, 0.05, 0.1, 0.15]` (levels
0–3, DECISION (confirmed), design D10). `getCritChance(level)` SHALL return
`CRIT_CHANCE_BY_LEVEL[level]` for levels 0–3, `0` for any level below 1 and `0.15` for any level
above 3.

#### Scenario: Constants [unit]
- **WHEN** the constants are read
- **THEN** `CRIT_MULTIPLIER` is `10` and `CRIT_CHANCE_BY_LEVEL` equals `[0, 0.05, 0.1, 0.15]`

#### Scenario: Chance per level [unit]
- **WHEN** `getCritChance` is evaluated for `0`, `1`, `2`, `3`
- **THEN** the results are `0`, `0.05`, `0.1`, `0.15`

#### Scenario: Out-of-range levels [unit]
- **WHEN** `getCritChance` is evaluated for `-1` and `4`
- **THEN** the results are `0` and `0.15`

### Requirement: Deterministic crit roll
`rollCrit(level, random)` SHALL return `false` without calling `random` when `level <= 0`;
otherwise it SHALL call `random` exactly once and return `random() < getCritChance(level)`
(strict comparison).

#### Scenario: Level 0 never crits and consumes no randomness [unit]
- **WHEN** `rollCrit(0, seq())` is called
- **THEN** the result is `false` and the random source was called 0 times

#### Scenario: Boundaries per level [unit]
- **WHEN** `rollCrit` is called with `(1, seq(0.0499))`, `(1, seq(0.05))`, `(2, seq(0.0999))`, `(2, seq(0.1))`, `(3, seq(0.1499))`, `(3, seq(0.15))`
- **THEN** the results are `true`, `false`, `true`, `false`, `true`, `false`
- **AND** each random source was called exactly once

#### Scenario: Chance over an even spread [unit]
- **WHEN** `rollCrit(2, seq(r))` is called for each `r = i / 1000` with `i = 0 … 999`
- **THEN** exactly `100` results are `true` (those with `i < 100`)

### Requirement: Crit visual feedback
Whenever a main-button press is a crit (`PressResult.crit === true`), the page SHALL show, for
`CRIT_FX_MS = 900` ms: `[data-testid="crit-text"]` with the localized `crit.text` popping from the
button (keyframe `crit-pop`); a gold flash overlay `[data-testid="crit-flash"]` exactly covering
the main button (keyframe `crit-flash`); a burst of exactly 12 gold particles
`[data-testid="crit-particle"]` inside `[data-testid="crit-burst"]` (keyframe `crit-burst`); a
short screen shake (keyframe `crit-shake`) of `[data-testid="shake-layer"]` — a dedicated layer that
contains only the balance counter, the main button and the click-status slot; `<main>` and every
fixed-position UI (shop box, switchers, reset, helper zone, decor, golden button) SHALL NOT shake;
and `data-crit="true"` on the main button.
Effect elements are `aria-hidden="true"` and do not intercept clicks. A new crit during a running
effect restarts it (never more than one `crit-text`). After the effect the elements are removed,
`data-crit` is no longer `"true"`, and the main button is where it was (DECISION (confirmed),
design D12, D18).

#### Scenario: Crit shows the full effect [e2e]
- **GIVEN** the random hook is fixed to `0.01` and storage is seeded with `V3(S({ balance: 0, totalClicks: 200, levels: { crit: 1 } }))`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="crit-text"]` has count 0 and the computed `animation-name` of `[data-testid="shake-layer"]` is `none`
- **AND** `[data-testid="shake-layer"]` contains `[data-testid="balance"]`, `[data-testid="main-button"]` and `[data-testid="click-status"]`, and does not contain `[data-testid="shop"]`, `[data-testid="reset"]`, `[data-testid="helpers"]`, `[data-testid="theme-toggle"]` or `[data-testid="lang-toggle"]`
- **WHEN** the user clicks `[data-testid="main-button"]` once
- **THEN** `[data-testid="balance"]` shows `10`
- **AND** `[data-testid="crit-text"]` is visible with text `КРИТ ×10!` and computed `animation-name` `crit-pop`
- **AND** `[data-testid="crit-flash"]` is visible, has computed `animation-name` `crit-flash`, and its bounding box is within 1 px of the main button's box
- **AND** `[data-testid="crit-particle"]` has count 12 and the first one has computed `animation-name` `crit-burst`
- **AND** the computed `animation-name` of `[data-testid="shake-layer"]` is `crit-shake`, while that of `<main>` and of `[data-testid="shop"]` is `none`
- **AND** the main button has `data-crit="true"`

#### Scenario: Effect ends and the button stays in place [e2e]
- **GIVEN** the setup of "Crit shows the full effect" and the main button's bounding box recorded before the click
- **WHEN** the user clicks the main button once and 1 500 ms pass
- **THEN** `[data-testid="crit-text"]`, `[data-testid="crit-flash"]` and `[data-testid="crit-particle"]` have count 0
- **AND** the main button does not have `data-crit="true"`
- **AND** the main button's bounding box x and y differ by at most 1 px from the recorded box

#### Scenario: Fixed UI stays still during the shake [e2e]
- **GIVEN** the random hook is fixed to `0.01` and storage is seeded with `V3(S({ balance: 0, totalClicks: 200, levels: { crit: 1 } }))`, and the bounding boxes of `[data-testid="shop"]`, `[data-testid="reset"]` and `[data-testid="helpers"]` are recorded after load
- **WHEN** the user clicks the main button once and the boxes are measured again immediately (while `[data-testid="shake-layer"]` has `animation-name` `crit-shake`)
- **THEN** each of the three boxes has the same x and y (±0.5 px) as recorded

#### Scenario: No crit, no effect [e2e]
- **GIVEN** the random hook is fixed to `0.99` and storage is seeded with `V3(S({ balance: 0, totalClicks: 200, levels: { crit: 3 } }))`
- **WHEN** the page `/` is loaded and the user clicks the main button once
- **THEN** `[data-testid="balance"]` shows `1`
- **AND** `[data-testid="crit-text"]` and `[data-testid="crit-particle"]` have count 0 and the computed `animation-name` of `[data-testid="shake-layer"]` is `none`

#### Scenario: Crit multiplies click upgrades [e2e]
- **GIVEN** the random hook is fixed to `0.01` and storage is seeded with `V3(S({ balance: 0, totalClicks: 300, upgrades: ["double-click"], levels: { crit: 3 } }))`
- **WHEN** the page `/` is loaded and the user clicks the main button twice
- **THEN** `[data-testid="balance"]` shows `40`
- **AND** `[data-testid="crit-text"]` has count 1 (the second crit restarted the effect)

#### Scenario: Crit text in English [e2e]
- **GIVEN** the random hook is fixed to `0.01`, storage is seeded with `V3(S({ totalClicks: 200, levels: { crit: 1 } }))` and `dopamine-clicker:lang` = `en`
- **WHEN** the page `/` is loaded and the user clicks the main button once
- **THEN** `[data-testid="crit-text"]` has text `CRIT ×10!`

#### Scenario: Without the upgrade nothing crits [e2e]
- **GIVEN** the random hook is fixed to `0.01` and storage is seeded with `V3(S({ balance: 0, totalClicks: 200 }))`
- **WHEN** the page `/` is loaded and the user clicks the main button 3 times
- **THEN** `[data-testid="balance"]` shows `3` and `[data-testid="crit-text"]` has count 0
