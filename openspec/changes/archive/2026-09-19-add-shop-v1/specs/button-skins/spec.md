# Spec Delta: button-skins

## Purpose

Cosmetic skins for the main button. Skins in the `stack` slot combine freely; the `material` slot is
exclusive (one at a time, default "Classic"). Every bought skin can be toggled on and off.
Stage 2 skins: Soft shadow, Squish, Floating +N, Jumping cap (stack) and Gold (material).

Scenario tags: `[unit]` = Vitest test in `lib/game/skins.test.ts`, `[e2e]` = Playwright test in
`e2e/add-shop-v1.spec.ts` (viewport 1280 × 720, `reducedMotion: "no-preference"` unless stated).
Notation `FRESH`, `S({...})`, `V2(...)` is defined in `design.md`.

## ADDED Requirements

### Requirement: Skin toggle rules
`toggleSkin(state, id)` SHALL: for an owned stack skin, add it to or remove it from `enabledSkins`
(keeping catalog order); for owned Gold, switch `material` between `"gold"` and `"classic"`; for a
skin that is not owned, return the input state object itself. It SHALL NOT change any other field and
SHALL NOT mutate its input. `isSkinActive(state, id)` SHALL be `enabledSkins.includes(id)` for stack
skins and `material === id` for Gold. `getButtonAppearance(state)` SHALL return
`{ stack: enabledSkins (catalog order), material }`.

#### Scenario: Toggle a stack skin off and on [unit]
- **GIVEN** `A = S({ ownedSkins: ["soft-shadow", "squish"], enabledSkins: ["soft-shadow", "squish"] })`
- **WHEN** `toggleSkin(A, "soft-shadow")` is called
- **THEN** the result is `S({ ownedSkins: ["soft-shadow", "squish"], enabledSkins: ["squish"] })`
- **WHEN** `toggleSkin` is called on that result with `"soft-shadow"` again
- **THEN** the result deep-equals `A` (`enabledSkins: ["soft-shadow", "squish"]`, catalog order restored)

#### Scenario: Toggle Gold [unit]
- **GIVEN** `G = S({ ownedSkins: ["gold"], material: "gold" })`
- **WHEN** `toggleSkin(G, "gold")` is called
- **THEN** the result is `S({ ownedSkins: ["gold"], material: "classic" })`
- **WHEN** `toggleSkin` is called on that result with `"gold"` again
- **THEN** the result deep-equals `G`

#### Scenario: Not owned is a no-op [unit]
- **GIVEN** `N = S({ ownedSkins: ["squish"], enabledSkins: ["squish"] })`
- **WHEN** `toggleSkin(N, "jumping-cap")` and `toggleSkin(N, "gold")` are called
- **THEN** both results are the same object as `N` (`toBe`)

#### Scenario: Stack and material are independent [unit]
- **GIVEN** `M = S({ ownedSkins: ["soft-shadow", "squish", "floating-number", "jumping-cap", "gold"], enabledSkins: ["soft-shadow", "squish", "floating-number", "jumping-cap"], material: "gold" })`
- **WHEN** `getButtonAppearance(M)` is evaluated
- **THEN** it equals `{ stack: ["soft-shadow", "squish", "floating-number", "jumping-cap"], material: "gold" }`
- **WHEN** `toggleSkin(M, "gold")` is evaluated
- **THEN** its `enabledSkins` is unchanged and its `material` is `"classic"`
- **WHEN** `toggleSkin(M, "squish")` is evaluated
- **THEN** its `material` is still `"gold"` and its `enabledSkins` is `["soft-shadow", "floating-number", "jumping-cap"]`

#### Scenario: Active checks [unit]
- **GIVEN** `M2 = S({ ownedSkins: ["squish", "gold"], enabledSkins: [], material: "gold" })`
- **WHEN** `isSkinActive` is evaluated for `squish`, `gold`, `soft-shadow`
- **THEN** the results are `false`, `true`, `false`

#### Scenario: Fresh appearance [unit]
- **WHEN** `getButtonAppearance(FRESH)` is evaluated
- **THEN** it equals `{ stack: [], material: "classic" }`

#### Scenario: Toggle does not mutate [unit]
- **GIVEN** a deeply frozen `S({ ownedSkins: ["squish"], enabledSkins: ["squish"] })`
- **WHEN** `toggleSkin(state, "squish")` is called
- **THEN** nothing is thrown and the input still has `enabledSkins: ["squish"]`

### Requirement: Skin toggle in the shop
Each owned skin SHALL show `[data-testid="skin-toggle-<id>"]` (a `<button>`) in its shop row with
`aria-pressed` equal to `isSkinActive`, text `skin.on` when active and `skin.off` when not. Clicking
it SHALL apply `toggleSkin` and save.

#### Scenario: Toggle a skin off and persist [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 0, totalClicks: 20, ownedSkins: ["soft-shadow", "squish"], enabledSkins: ["soft-shadow", "squish"] }))`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="skin-toggle-soft-shadow"]` has `aria-pressed="true"` and text `Увімкнено`
- **AND** `[data-testid="main-button"]` has `data-skins="soft-shadow squish"` and `data-material="classic"`
- **WHEN** the user clicks `[data-testid="skin-toggle-soft-shadow"]`
- **THEN** it has `aria-pressed="false"` and text `Вимкнено`, and the main button has `data-skins="squish"`
- **AND** the saved state's `enabledSkins` is `["squish"]`
- **WHEN** the page is reloaded
- **THEN** the toggle still has `aria-pressed="false"` and the main button has `data-skins="squish"`

#### Scenario: Fresh button hooks [e2e]
- **GIVEN** the page `/` is loaded with empty storage
- **THEN** `[data-testid="main-button"]` has `data-skins=""` and `data-material="classic"`

### Requirement: Skin visuals
With full motion the main button SHALL look as follows: Soft shadow — a `box-shadow` different
from the no-skin shadow; Squish — the `squish` keyframe animation retriggered on each click;
Floating +N — each click spawns `[data-testid="floating-number"]` with text `+<click value>` near
the pointer, animated with `float-up` and removed after 800 ms; Jumping cap —
`[data-testid="jumping-cap"]` rendered on top of the button, animated with `cap-hop` on each click;
Gold — `data-material="gold"` and a background different from Classic. Disabled or unowned skins
SHALL render nothing. Skins SHALL NOT move the main button's layout box.

#### Scenario: Soft shadow changes the shadow [e2e]
- **GIVEN** storage is seeded with `V2(S({ totalClicks: 20, ownedSkins: ["soft-shadow"], enabledSkins: ["soft-shadow"] }))`
- **WHEN** the computed `box-shadow` of the main button is read (mouse away from the button), then `[data-testid="skin-toggle-soft-shadow"]` is clicked and it is read again
- **THEN** the two values are different

#### Scenario: Squish plays on click [e2e]
- **GIVEN** storage is seeded with `V2(S({ totalClicks: 20, ownedSkins: ["squish"], enabledSkins: ["squish"] }))`
- **WHEN** the user clicks the main button once
- **THEN** the computed `animation-name` of `[data-testid="main-button"]` is `squish`

#### Scenario: Floating number shows the earned amount [e2e]
- **GIVEN** storage is seeded with `V2(S({ totalClicks: 60, ownedSkins: ["floating-number"], enabledSkins: ["floating-number"] }))`
- **WHEN** the user clicks the main button once
- **THEN** at least one `[data-testid="floating-number"]` is visible with text `+1` and computed `animation-name` `float-up`
- **AND** 1500 ms later `[data-testid="floating-number"]` has count 0

#### Scenario: Floating number with Double click [e2e]
- **GIVEN** storage is seeded with `V2(S({ totalClicks: 60, ownedSkins: ["floating-number"], enabledSkins: ["floating-number"], upgrades: ["double-click"] }))`
- **WHEN** the user clicks the main button once
- **THEN** a `[data-testid="floating-number"]` with text `+2` is visible

#### Scenario: No floating number when disabled [e2e]
- **GIVEN** storage is seeded with `V2(S({ totalClicks: 60, ownedSkins: ["floating-number"], enabledSkins: [] }))`
- **WHEN** the user clicks the main button once
- **THEN** `[data-testid="floating-number"]` has count 0

#### Scenario: Jumping cap sits on the button and hops [e2e]
- **GIVEN** storage is seeded with `V2(S({ totalClicks: 40, ownedSkins: ["jumping-cap"], enabledSkins: ["jumping-cap"] }))`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="jumping-cap"]` is visible, its horizontal center is within 40 px of the main button's horizontal center and its top edge is above the main button's vertical center
- **WHEN** the user clicks the main button once
- **THEN** the computed `animation-name` of `[data-testid="jumping-cap"]` is `cap-hop`
- **WHEN** the user clicks `[data-testid="skin-toggle-jumping-cap"]`
- **THEN** `[data-testid="jumping-cap"]` has count 0

#### Scenario: Gold material [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 500, totalClicks: 300 }))`
- **WHEN** the computed `background-image` + `background-color` of the main button are recorded as `C`, and the user clicks `[data-testid="shop-buy-gold"]`
- **THEN** the main button has `data-material="gold"`, the combined background differs from `C`, and `[data-testid="skin-toggle-gold"]` has `aria-pressed="true"`
- **WHEN** the user clicks `[data-testid="skin-toggle-gold"]`
- **THEN** the main button has `data-material="classic"` and the combined background equals `C`

#### Scenario: Skins do not move the main button [e2e]
- **GIVEN** storage is seeded with `V2(S({ totalClicks: 300, ownedSkins: ["soft-shadow", "squish", "floating-number", "jumping-cap", "gold"], enabledSkins: ["soft-shadow", "squish", "floating-number", "jumping-cap"], material: "gold" }))`
- **WHEN** the page `/` is loaded and the main button's bounding box is measured
- **THEN** its center is within 40 px of x = 640 and within 60 px of y = 360
