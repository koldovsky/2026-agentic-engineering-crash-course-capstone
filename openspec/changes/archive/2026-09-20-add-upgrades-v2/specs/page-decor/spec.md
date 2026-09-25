# Spec Delta: page-decor

Stage 3 adds one reserved area for decor placement: the click-status slot right of the main button
(combo meter and golden-bonus timer, design D13). Placement rules and rendering are otherwise
unchanged.

Scenario tags: `[e2e]` = Playwright test in `e2e/add-shop-v1.spec.ts` (existing, unchanged) or
`e2e/add-upgrades-v2.spec.ts` (noted as "new"), viewport 1280 × 720. `S({...})`, `V2(...)`,
`V3(...)` are defined in `design.md`. "Strictly overlap" means `rectsOverlap` (touching edges is not
an overlap).

## MODIFIED Requirements

### Requirement: Placing decor on purchase
When a decor item is bought, the UI SHALL call `placeDecor` with the item's catalog size, the
current viewport, the page random source `pageRandom` (design D19) and the reserved rects listed in add-shop-v1 design D10 plus the
click-status slot (main button, balance area, shop box at its maximum height, top-right switchers,
helper zone, reset button, `[data-testid="click-status"]`, every placed decor), and pass the result
as `decorPosition` to `buyItem` in the same state update. Each decor SHALL render as
`[data-testid="decor-<id>"]` (`position: fixed`, `role="img"`, `aria-label` = the localized item
name) at `decorRect(position, size, viewport)`, or in the fallback dock (right edge, `right: 16px`,
vertically centered, catalog order, 8 px gap) when the position is `null` (DECISION (confirmed),
add-shop-v1 design D9). Decor SHALL NOT intercept clicks meant for the UI (`pointer-events: none`).
Bought decor cannot be hidden or re-rolled in this stage (DECISION (confirmed), add-shop-v1 design
D4).

#### Scenario: Buying the cat places it clear of the UI [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 100, totalClicks: 75 }))`
- **WHEN** the user clicks `[data-testid="shop-buy-sleeping-cat"]`
- **THEN** `[data-testid="balance"]` shows `0` and `[data-testid="decor-sleeping-cat"]` is visible with a bounding box of 120 × 80 (±1 px)
- **AND** that box does not strictly overlap the boxes of `main-button`, `balance`, `shop`, `theme-toggle`, `lang-toggle`, `reset`
- **AND** the saved state's `decor` is `[{ id: "sleeping-cat", position: { x: X, y: Y } }]` with `0 ≤ X ≤ 1`, `0 ≤ Y ≤ 1`, and `X × 1280`, `Y × 720` are within 1 px of the box's x and y
- **AND** `[data-testid="shop-owned-sleeping-cat"]` has text `Куплено`

#### Scenario: Position survives reload [e2e]
- **GIVEN** the cat was bought as in the previous scenario and its box was recorded
- **WHEN** the page is reloaded
- **THEN** `[data-testid="decor-sleeping-cat"]` has the same x and y (±1 px)

#### Scenario: Three decor items never overlap [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 1800, totalClicks: 750 }))`
- **WHEN** the user buys `hydraulic-press`, then `lava-lamp`, then `sleeping-cat`
- **THEN** `[data-testid="balance"]` shows `0` and all three `[data-testid^="decor-"]` elements are visible
- **AND** no two of them strictly overlap, and none strictly overlaps `main-button`, `balance`, `shop`, `theme-toggle`, `lang-toggle`, `reset`

#### Scenario: Seeded position is rendered [e2e]
- **GIVEN** storage is seeded with `V2(S({ totalClicks: 150, decor: [{ id: "lava-lamp", position: { x: 0.8, y: 0.1 } }] }))`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="decor-lava-lamp"]` has x = 1024, y = 72, width = 64, height = 144 (each ±1 px)
- **AND** it has role `img` with accessible name `Лава-лампа`

#### Scenario: Null position uses the fallback dock [e2e]
- **GIVEN** storage is seeded with `V2(S({ totalClicks: 75, decor: [{ id: "sleeping-cat", position: null }] }))`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="decor-sleeping-cat"]` is visible, its right edge is 1264 (±1 px) and its vertical center is 360 (±2 px)

#### Scenario: Decor does not block the main button [e2e]
- **GIVEN** storage is seeded with `V2(S({ balance: 5, totalClicks: 150, decor: [{ id: "lava-lamp", position: { x: 0.45, y: 0.4 } }] }))` (drawn over the main button on purpose)
- **WHEN** the user clicks `[data-testid="main-button"]` (Playwright actionability check must pass without `force`)
- **THEN** `[data-testid="balance"]` shows `6`

#### Scenario: Decor avoids the click-status slot [e2e]
New test in `e2e/add-upgrades-v2.spec.ts`.
- **GIVEN** storage is seeded with `V3(S({ balance: 1800, totalClicks: 750 }))`
- **WHEN** the user buys `hydraulic-press`, then `lava-lamp`, then `sleeping-cat`
- **THEN** `[data-testid="click-status"]` is attached with a box of 160 × 64 (±1 px) whose x is within 1 px of the main button's right edge + 24
- **AND** none of the three `[data-testid^="decor-"]` boxes strictly overlaps the `[data-testid="click-status"]` box
