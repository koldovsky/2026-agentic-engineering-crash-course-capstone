# reduced-motion Specification

## Purpose

Respects the operating system "reduce motion" setting so that shakes, particles and large or
decorative animations are disabled or toned down, starting with the main button and counter.

Scenario tags: `[e2e]` = Playwright test in `e2e/add-foundation.spec.ts` using
`page.emulateMedia({ reducedMotion })` or `test.use({ reducedMotion })`.

## Requirements

### Requirement: Motion mode is exposed and follows the system
The page SHALL set `data-motion="reduced"` on `<html>` when `prefers-reduced-motion: reduce`
matches and `data-motion="full"` otherwise, and SHALL update it live when the preference changes.
Later visual effects read this attribute (or the same media query) to decide what to render.

#### Scenario: Reduced motion detected [e2e]
- **GIVEN** the browser emulates `reducedMotion: "reduce"`
- **WHEN** the page `/` is loaded
- **THEN** `<html>` has `data-motion="reduced"`

#### Scenario: Full motion by default [e2e]
- **GIVEN** the browser emulates `reducedMotion: "no-preference"`
- **WHEN** the page `/` is loaded
- **THEN** `<html>` has `data-motion="full"`

#### Scenario: Live change [e2e]
- **GIVEN** the page `/` is loaded with `reducedMotion: "no-preference"`
- **WHEN** the test calls `page.emulateMedia({ reducedMotion: "reduce" })`
- **THEN** `<html>` has `data-motion="reduced"` without a reload

### Requirement: Main-button and counter animations respect reduced motion
With full motion the main button SHALL have a press feedback transition (non-zero
`transition-duration`) and the balance counter MAY play a short "bump" animation on change. With
reduced motion the main button's computed `transition-duration` SHALL be `0s` and the balance
counter's computed `animation-name` SHALL be `none`, while clicking still updates the balance.

#### Scenario: Full motion has a press transition [e2e]
- **GIVEN** the page `/` is loaded with `reducedMotion: "no-preference"`
- **WHEN** the computed `transition-duration` of `[data-testid="main-button"]` is read
- **THEN** it is not `0s`

#### Scenario: Reduced motion disables button and counter animation [e2e]
- **GIVEN** the page `/` is loaded with `reducedMotion: "reduce"`
- **WHEN** the user clicks the main button twice
- **THEN** `[data-testid="balance"]` shows `2`
- **AND** the computed `transition-duration` of `[data-testid="main-button"]` is `0s`
- **AND** the computed `animation-name` of `[data-testid="balance"]` is `none`

### Requirement: Stage 2 effects respect reduced motion
With full motion the effects SHALL use the keyframes named in design D17 (`squish`, `cap-hop`,
`float-up`, `monkey-press`) and every decor item SHALL have at least one animated element. With
reduced motion: the main button, `[data-testid="jumping-cap"]`, every element inside
`[data-testid="helper-monkey"]` and every element inside each `[data-testid^="decor-"]` (including
the root) SHALL have computed `animation-name: none`; floating +N elements SHALL NOT be rendered
(DECISION (confirmed), design D17). Clicking and helper income SHALL work the same in both
modes. Static skins (Soft shadow, Gold) stay visible.

#### Scenario: Full motion plays the Stage 2 effects [e2e]
- **GIVEN** `reducedMotion: "no-preference"` and storage seeded with `V2(ALL_FX)`
- **WHEN** the page `/` is loaded and the user clicks the main button once
- **THEN** the main button's computed `animation-name` is `squish` and `[data-testid="jumping-cap"]`'s is `cap-hop`
- **AND** a `[data-testid="floating-number"]` with text `+1` is visible
- **AND** for each of `decor-sleeping-cat`, `decor-lava-lamp`, `decor-hydraulic-press` at least one element (the root or a descendant) has a computed `animation-name` other than `none`
- **WHEN** at least 1100 ms have passed (so the monkey has clicked at least once)
- **THEN** at least one element inside `[data-testid="helper-monkey"]` has computed `animation-name` `monkey-press`

#### Scenario: Reduced motion disables Stage 2 effects [e2e]
- **GIVEN** `reducedMotion: "reduce"` and storage seeded with `V2(ALL_FX)`
- **WHEN** the page `/` is loaded, the user clicks the main button once and 1100 ms pass
- **THEN** `[data-testid="balance"]` shows a value ≥ `1`
- **AND** `[data-testid="floating-number"]` has count 0
- **AND** the computed `animation-name` of the main button and of `[data-testid="jumping-cap"]` is `none`
- **AND** every element inside (and including) each `[data-testid^="decor-"]` and every element inside `[data-testid="helper-monkey"]` has computed `animation-name` `none`
- **AND** `[data-testid="jumping-cap"]` and all three decor items are still visible

#### Scenario: Switching to reduced motion live [e2e]
- **GIVEN** `reducedMotion: "no-preference"`, storage seeded with `V2(ALL_FX)`, the page loaded
- **WHEN** the test calls `page.emulateMedia({ reducedMotion: "reduce" })` and then clicks the main button once
- **THEN** `[data-testid="floating-number"]` has count 0 and every element inside each `[data-testid^="decor-"]` has computed `animation-name` `none`

### Requirement: Stage 3 effects respect reduced motion
With full motion the effects SHALL use the keyframes named in design D18 (`crit-pop`,
`crit-flash`, `crit-burst`, `crit-shake`, `golden-pulse`, `robot-press`, `factory-press`). With
reduced motion: `[data-testid="crit-text"]` and `[data-testid="crit-flash"]` SHALL still appear for
900 ms but with computed `animation-name: none`; `[data-testid="crit-particle"]` SHALL NOT be
rendered; `[data-testid="shake-layer"]` SHALL keep `animation-name: none` (no shake); every element inside (and
including) `[data-testid="golden-button"]`, `[data-testid="helper-robot"]` and
`[data-testid="helper-factory"]` SHALL have computed `animation-name: none`. Crit value, combo,
golden bonus and helper income SHALL work the same in both modes (DECISION (confirmed), design D12).

#### Scenario: Full motion plays the Stage 3 helper and golden effects [e2e]
- **GIVEN** `reducedMotion: "no-preference"`, the random hook is fixed to `0.75`, storage is seeded with `V3(S({ balance: 1000, totalClicks: 9000, helpers: { robot: 1, factory: 1 } }))` and the clock is paused
- **WHEN** the user buys `golden-button` and the clock runs 75 000 ms
- **THEN** at least one element inside `[data-testid="golden-button"]` has computed `animation-name` `golden-pulse` and the button element itself has `animation-name` `none`
- **AND** at least one element inside `[data-testid="helper-robot"]` has `robot-press` and at least one inside `[data-testid="helper-factory"]` has `factory-press`

#### Scenario: Reduced motion tones the crit down [e2e]
- **GIVEN** `reducedMotion: "reduce"`, the random hook is fixed to `0.01` and storage is seeded with `V3(CRIT1)`
- **WHEN** the page `/` is loaded and the user clicks the main button once
- **THEN** `[data-testid="balance"]` shows `10`
- **AND** `[data-testid="crit-text"]` is visible with text `КРИТ ×10!` and computed `animation-name` `none`
- **AND** `[data-testid="crit-flash"]` is visible with computed `animation-name` `none`
- **AND** `[data-testid="crit-particle"]` has count 0 and the computed `animation-name` of `[data-testid="shake-layer"]` is `none`
- **WHEN** 1 500 ms pass
- **THEN** `[data-testid="crit-text"]` and `[data-testid="crit-flash"]` have count 0

#### Scenario: Reduced motion keeps the golden button static but catchable [e2e]
- **GIVEN** `reducedMotion: "reduce"`, the random hook is fixed to `0.75`, storage is seeded with `V3(S({ balance: 1000, totalClicks: 9000, helpers: { robot: 1, factory: 1 } }))` and the clock is paused
- **WHEN** the user buys `golden-button` and the clock runs 75 000 ms
- **THEN** `[data-testid="golden-button"]` is visible and it and every element inside it have computed `animation-name` `none`
- **AND** every element inside (and including) `[data-testid="helper-robot"]` and `[data-testid="helper-factory"]` has computed `animation-name` `none`
- **WHEN** the user clicks `[data-testid="golden-button"]`
- **THEN** `[data-testid="golden-bonus"]` has text `Золотий бонус ×7: 30 с`

#### Scenario: Switching to reduced motion live [e2e]
- **GIVEN** `reducedMotion: "no-preference"`, the random hook is fixed to `0.01`, storage seeded with `V3(CRIT1)`, the page loaded
- **WHEN** the test calls `page.emulateMedia({ reducedMotion: "reduce" })` and then clicks the main button once
- **THEN** `[data-testid="crit-text"]` is visible with computed `animation-name` `none`, `[data-testid="crit-particle"]` has count 0 and the computed `animation-name` of `[data-testid="shake-layer"]` is `none`
