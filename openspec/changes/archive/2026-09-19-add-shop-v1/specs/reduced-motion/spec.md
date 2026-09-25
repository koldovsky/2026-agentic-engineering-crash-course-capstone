# Spec Delta: reduced-motion

Stage 2 adds motion (squish, jumping cap, floating +N, decor loops, monkey press) that must respect
`prefers-reduced-motion`.

Scenario tags: `[e2e]` = Playwright test in `e2e/add-shop-v1.spec.ts` using
`test.use({ reducedMotion })` / `page.emulateMedia({ reducedMotion })`. `S({...})`, `V2(...)` are
defined in `design.md`. `ALL_FX` = `S({ balance: 0, totalClicks: 800, ownedSkins: ["soft-shadow",
"squish", "floating-number", "jumping-cap"], enabledSkins: ["soft-shadow", "squish",
"floating-number", "jumping-cap"], decor: [{ id: "sleeping-cat", position: { x: 0.3, y: 0.05 } },
{ id: "lava-lamp", position: { x: 0.8, y: 0.3 } }, { id: "hydraulic-press", position: { x: 0.7,
y: 0.7 } }], helpers: { monkey: 1 } })`.

## ADDED Requirements

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
