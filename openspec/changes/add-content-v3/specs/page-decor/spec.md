# Spec Delta: page-decor

Stage 4 replaces the sleeping cat's CSS boxes with one inline SVG that reads as a cat (ADDED), and
adds two reserved areas to the placement rules: the achievements button and every placed video
(MODIFIED).

Scenario tags: `[e2e]` = Playwright test in `e2e/add-shop-v1.spec.ts` / `e2e/add-upgrades-v2.spec.ts`
(existing, unchanged) or `e2e/add-content-v3.spec.ts` (noted as "new"), viewport 1280 × 720.
`S({...})`, `V2(...)`, `V3(...)`, `V4(...)` are defined in `design.md`. "Strictly overlap" means
`rectsOverlap` (touching edges is not an overlap).

## MODIFIED Requirements

### Requirement: Placing decor on purchase
When a decor item is bought, the UI SHALL call `placeDecor` with the item's catalog size, the
current viewport, the page random source `pageRandom` (add-upgrades-v2 design D19) and the reserved
rects listed in add-shop-v1 design D10 plus the click-status slot, the achievements button and every
placed video (main button, balance area, shop box at its maximum height, top-right switchers
including `[data-testid="achievements"]`, helper zone, reset button, `[data-testid="click-status"]`,
every placed decor, every placed video), and pass the result as `decorPosition` to `buyItem` in the
same state update. Each decor SHALL render as
`[data-testid="decor-<id>"]` (`position: fixed`, `role="img"`, `aria-label` = the localized item
name) at `decorRect(position, size, viewport)`, or in the fallback dock (right edge, `right: 16px`,
vertically centered, catalog order, 8 px gap) when the position is `null` (DECISION (confirmed),
add-shop-v1 design D9). Decor SHALL NOT intercept clicks meant for the UI (`pointer-events: none`).
Bought decor cannot be hidden or re-rolled in this stage (DECISION (confirmed), add-shop-v1 design
D4). Video decor is placed by the same rules with `VIDEO_SIZE` (see the `video-decor` capability)
and shares the fallback dock: decor first, then videos, each in catalog order (DECISION (confirmed), design D5).

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

#### Scenario: Decor avoids the achievements button and placed videos [e2e]
New test in `e2e/add-content-v3.spec.ts`.
- **GIVEN** storage is seeded with `V4(S({ balance: 1800, totalClicks: 30000, videos: [{ id: "video-runner", position: { x: 0.02, y: 0.55 } }] }))`
- **WHEN** the user buys `hydraulic-press`, then `lava-lamp`, then `sleeping-cat`
- **THEN** `[data-testid="achievements"]` is visible and none of the three `[data-testid^="decor-"]` boxes strictly overlaps it, the `[data-testid="click-status"]` box or the `[data-testid="video-runner"]` box


## ADDED Requirements

### Requirement: Sleeping cat silhouette
`[data-testid="decor-sleeping-cat"]` SHALL render one inline
`<svg data-testid="cat-svg" viewBox="0 0 120 80" preserveAspectRatio="xMidYMid meet"
aria-hidden="true">` that fills the decor box and contains exactly these eight parts, each its own
element with its own test id: `cat-tail`, `cat-body`, `cat-head`, `cat-ear-left`, `cat-ear-right`,
`cat-eye-left`, `cat-eye-right`, `cat-nose` (DECISION (confirmed), design D15). The
rendered boxes SHALL satisfy, with `root` = the decor box: every part inside `root` (±1 px);
`body.width >= 0.6 * root.width` and `body.height >= 0.35 * root.height`;
`head.centerY < body.centerY` and `head.centerX > body.centerX + 0.15 * body.width`;
`0.2 * root.width <= head.width <= 0.5 * root.width`; each ear's top edge above `head.top` and each
ear's horizontal centre within `[head.left - 4, head.right + 4]`, with
`earLeft.centerX < earRight.centerX`; both eyes inside `head` with
`eyeLeft.centerX < eyeRight.centerX`; the nose's centre below both eye centres and horizontally
between them (±4 px); `tail.left < body.left` and `tail.width >= 0.25 * body.width`. With full
motion `cat-body` SHALL have computed `animation-name` `cat-breathe`, both ears `cat-ear-twitch` and
`cat-tail` `cat-tail-sway`. The decor root SHALL keep `role="img"` with the localized item name, so
the SVG itself stays `aria-hidden`. No part SHALL be `position: fixed` and nothing SHALL intercept
pointer events.

#### Scenario: The cat has all eight parts inside its box [e2e]
New test in `e2e/add-content-v3.spec.ts`.
- **GIVEN** storage is seeded with `V4(S({ totalClicks: 75, decor: [{ id: "sleeping-cat", position: { x: 0.05, y: 0.1 } }] }))`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="decor-sleeping-cat"]` has a box of 120 × 80 (±1 px) with role `img` and accessible name `Сплячий кіт`
- **AND** `[data-testid="cat-svg"]` is attached with `aria-hidden="true"`
- **AND** each of `cat-tail`, `cat-body`, `cat-head`, `cat-ear-left`, `cat-ear-right`, `cat-eye-left`, `cat-eye-right`, `cat-nose` has count 1 and a box inside the decor box (±1 px)

#### Scenario: The silhouette reads as a cat [e2e]
New test in `e2e/add-content-v3.spec.ts`.
- **GIVEN** the cat of the previous scenario and its eight part boxes
- **THEN** `body.width >= 72` and `body.height >= 28` (0.6 × 120, 0.35 × 80)
- **AND** `head.centerY < body.centerY` and `head.centerX > body.centerX + 0.15 * body.width`
- **AND** `head.width` is between `24` and `60`
- **AND** `earLeft.top < head.top` and `earRight.top < head.top`, both ear centres within `[head.left - 4, head.right + 4]`, and `earLeft.centerX < earRight.centerX`
- **AND** both eye boxes lie inside the head box and `eyeLeft.centerX < eyeRight.centerX`
- **AND** `nose.centerY > eyeLeft.centerY` and `nose.centerY > eyeRight.centerY`, and `nose.centerX` is between `eyeLeft.centerX - 4` and `eyeRight.centerX + 4`
- **AND** `tail.left < body.left` and `tail.width >= 0.25 * body.width`

#### Scenario: The cat breathes and twitches its ears [e2e]
New test in `e2e/add-content-v3.spec.ts`.
- **GIVEN** `reducedMotion: "no-preference"` and the cat of the first scenario
- **THEN** the computed `animation-name` of `[data-testid="cat-body"]` is `cat-breathe`, of `[data-testid="cat-ear-left"]` and `[data-testid="cat-ear-right"]` is `cat-ear-twitch`, and of `[data-testid="cat-tail"]` is `cat-tail-sway`
