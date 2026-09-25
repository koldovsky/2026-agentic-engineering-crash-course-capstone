# Spec Delta: reduced-motion

Stage 3 adds the crit effect (text pop, gold flash, particle burst, screen shake), the golden
button's pulse and the robot / factory press animations, all of which must respect
`prefers-reduced-motion` (the brief: the crit effect is "still reduced", not removed).

Scenario tags: `[e2e]` = Playwright test in `e2e/add-upgrades-v2.spec.ts` using
`test.use({ reducedMotion })` / `page.emulateMedia({ reducedMotion })`. `S({...})`, `V3(...)`,
"the clock is paused", "the clock runs N ms" and "the random hook is fixed to r" are defined in
`design.md`. `CRIT1` = `S({ balance: 0, totalClicks: 200, levels: { crit: 1 } })`.

## ADDED Requirements

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
