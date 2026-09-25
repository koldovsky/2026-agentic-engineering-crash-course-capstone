# page-decor Specification

## Purpose
Relaxing page decorations bought in the shop. Each one is placed once, at a random position that
does not cover the game UI or other decor, and keeps that position across reloads. Stage 2 items:
Sleeping cat, Lava lamp, Hydraulic press (own CSS/SVG animations, no third-party media).

Scenario tags: `[unit]` = Vitest test in `lib/game/decor.test.ts`, `[e2e]` = Playwright test in
`e2e/add-shop-v1.spec.ts` (viewport 1280 × 720). `seq(...)`, `S({...})`, `V2(...)` are defined in
`design.md`. Rects are written `{ left, top, width, height }` in CSS px. "Strictly overlap" means
`rectsOverlap` below (touching edges is not an overlap).

## Requirements

### Requirement: Rectangle overlap
`rectsOverlap(a, b)` SHALL be true iff `a.left < b.left + b.width && b.left < a.left + a.width &&
a.top < b.top + b.height && b.top < a.top + a.height`.

#### Scenario: Overlap cases [unit]
- **WHEN** `rectsOverlap` is evaluated for
  (1) `{0,0,10,10}` vs `{5,5,10,10}`,
  (2) `{0,0,10,10}` vs `{10,0,10,10}`,
  (3) `{0,0,10,10}` vs `{0,10,10,10}`,
  (4) `{0,0,10,10}` vs `{20,20,5,5}`,
  (5) `{0,0,100,100}` vs `{10,10,5,5}`,
  (6) `{10,10,5,5}` vs `{0,0,100,100}`
- **THEN** the results are `true`, `false`, `false`, `false`, `true`, `true`

### Requirement: Random decor placement
`placeDecor({ viewport, size, reserved, random, margin = 16, gap = 16, maxAttempts = 50 })` SHALL
compute `rangeX = viewport.width − 2·margin − size.width` and `rangeY = viewport.height − 2·margin −
size.height`; if either is negative it SHALL return `null` without calling `random`. Otherwise, for
each attempt it SHALL take `left = margin + Math.round(random() × rangeX)` and then
`top = margin + Math.round(random() × rangeY)` (exactly two calls per attempt, x first), and accept
the first candidate whose rect, inflated by `gap` on every side, does not strictly overlap any
reserved rect, returning `{ x: left / viewport.width, y: top / viewport.height }`. After
`maxAttempts` rejected candidates it SHALL return `null`. Constants: `DECOR_MARGIN = 16`,
`DECOR_GAP = 16`, `DECOR_MAX_ATTEMPTS = 50` (DECISION (confirmed), design D9).

#### Scenario: Constants [unit]
- **WHEN** the constants are read
- **THEN** `DECOR_MARGIN` is `16`, `DECOR_GAP` is `16`, `DECOR_MAX_ATTEMPTS` is `50`

#### Scenario: First candidate on an empty screen [unit]
- **WHEN** `placeDecor({ viewport: { width: 1280, height: 720 }, size: { width: 120, height: 80 }, reserved: [], random: seq(0.5, 0.5) })` is called
- **THEN** the result is `{ x: 580 / 1280, y: 320 / 720 }`

#### Scenario: Candidate over the main button is rejected [unit]
- **GIVEN** reserved `[{ left: 560, top: 280, width: 160, height: 160 }]`
- **WHEN** `placeDecor` is called with viewport 1280 × 720, size 120 × 80, that reserved list and `random: seq(0.5, 0.5, 0, 0)`
- **THEN** the result is `{ x: 16 / 1280, y: 16 / 720 }` (first candidate 580/320 inflated to `{564,304,152,112}` overlaps; second candidate 16/16 is free)

#### Scenario: Realistic Stage 2 layout [unit]
- **GIVEN** reserved rects shop `{16,16,288,432}`, main button `{560,280,160,160}`, balance `{560,216,160,64}`, switchers `{1160,16,104,40}`, helpers `{16,608,288,96}`, reset `{1130,660,134,44}`
- **WHEN** `placeDecor` is called with viewport 1280 × 720, size 120 × 80 and `random: seq(0, 0, 0.999, 0.999, 0.5, 0.1)`
- **THEN** the result is `{ x: 580 / 1280, y: 77 / 720 }` (candidate 16/16 hits the shop, candidate 1143/623 hits the reset button, candidate 580/77 is free) and exactly 6 random values were consumed

#### Scenario: Other decor is avoided [unit]
- **GIVEN** reserved `[{ left: 580, top: 320, width: 120, height: 80 }]` (an already placed decor)
- **WHEN** `placeDecor` is called with viewport 1280 × 720, size 120 × 80 and `random: seq(0.5, 0.5, 0.5, 0.5, 0.1, 0.1)`
- **THEN** the result is `{ x: 129 / 1280, y: 77 / 720 }`

#### Scenario: Touching the gap boundary is allowed [unit]
- **GIVEN** reserved `[{ left: 0, top: 0, width: 564, height: 720 }]`
- **WHEN** `placeDecor` is called with viewport 1280 × 720, size 120 × 80 and `random: seq(0.5, 0.5)`
- **THEN** the result is `{ x: 580 / 1280, y: 320 / 720 }` (inflated left edge 564 touches the reserved right edge 564)

#### Scenario: All attempts fail [unit]
- **GIVEN** reserved `[{ left: 0, top: 0, width: 565, height: 720 }]`
- **WHEN** `placeDecor` is called with viewport 1280 × 720, size 120 × 80 and a `random` that always returns `0.5` and counts its calls
- **THEN** the result is `null` and `random` was called exactly `100` times

#### Scenario: Custom maxAttempts [unit]
- **GIVEN** reserved `[{ left: 0, top: 0, width: 1280, height: 720 }]`
- **WHEN** `placeDecor` is called with viewport 1280 × 720, size 120 × 80, `maxAttempts: 2` and `random: seq(0.1, 0.2, 0.3, 0.4)`
- **THEN** the result is `null` and all 4 values were consumed (no 5th call)

#### Scenario: Custom margin and gap [unit]
- **WHEN** `placeDecor` is called with viewport 100 × 100, size 10 × 10, `margin: 0`, `gap: 0`, `reserved: []`, `random: seq(0.5, 0.5)`
- **THEN** the result is `{ x: 0.45, y: 0.45 }`

#### Scenario: Viewport too small [unit]
- **WHEN** `placeDecor` is called with viewport 150 × 150, size 144 × 144, `reserved: []` and `random: seq()` (throws if called)
- **THEN** the result is `null` and nothing is thrown

#### Scenario: Exact fit [unit]
- **WHEN** `placeDecor` is called with viewport 176 × 176, size 144 × 144, `reserved: []`, `random: seq(0.7, 0.3)`
- **THEN** the result is `{ x: 16 / 176, y: 16 / 176 }`

### Requirement: Decor rect for the current viewport
`decorRect(position, size, viewport)` SHALL return `{ left, top, width: size.width, height:
size.height }` with `left = max(0, min(round(x × vw), vw − w))` and `top = max(0, min(round(y × vh),
vh − h))`.

#### Scenario: Same viewport [unit]
- **WHEN** `decorRect({ x: 580 / 1280, y: 320 / 720 }, { width: 120, height: 80 }, { width: 1280, height: 720 })` is called
- **THEN** the result is `{ left: 580, top: 320, width: 120, height: 80 }`

#### Scenario: Smaller viewport scales [unit]
- **WHEN** `decorRect({ x: 580 / 1280, y: 320 / 720 }, { width: 120, height: 80 }, { width: 640, height: 360 })` is called
- **THEN** the result is `{ left: 290, top: 160, width: 120, height: 80 }`

#### Scenario: Clamped into the viewport [unit]
- **WHEN** `decorRect({ x: 0.95, y: 0.95 }, { width: 120, height: 80 }, { width: 1280, height: 720 })` is called
- **THEN** the result is `{ left: 1160, top: 640, width: 120, height: 80 }`
- **WHEN** `decorRect({ x: 0.5, y: 0.5 }, { width: 144, height: 144 }, { width: 100, height: 100 })` is called
- **THEN** the result is `{ left: 0, top: 0, width: 144, height: 144 }`

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
