# Spec Delta: button-skins

Stage 4 fixes two reported defects in existing skins: the Soft shadow is invisible in dark mode, and
the Floating +N is unreadable (same colour as the button it spawns over, looking as if it sat under
it). Both get per-theme CSS custom properties and measurable acceptance; nothing about buying,
toggling or stacking changes.

Scenario tags: `[e2e]` = Playwright test in `e2e/add-shop-v1.spec.ts` (existing, unchanged) or
`e2e/add-content-v3.spec.ts` (noted as "new"), viewport 1280 × 720, `reducedMotion:
"no-preference"` unless stated. `S({...})`, `V2(...)`, `V4(...)` and `contrast(a, b)` are defined in
`design.md`; `contrast` is `contrastRatio` from `lib/ui/contrast.ts`, `composite` is
`compositeOver`, `parse` is `parseCssColor` and `lastShadowColor` reads the colour of the last layer
of a computed `box-shadow`.

## MODIFIED Requirements

### Requirement: Skin visuals
With full motion the main button SHALL look as follows: Soft shadow — a `box-shadow` taken from the
per-theme custom properties `--skin-shadow` / `--skin-shadow-hover` / `--skin-shadow-active`
(DECISION (confirmed), design D16), different from the no-skin shadow **in both themes**;
Squish — the `squish` keyframe animation retriggered on each click; Floating +N — each click spawns
`[data-testid="floating-number"]` with text `+<click value>` near the pointer, rendered as a pill
with `--fx-float-bg` / `--fx-float-fg` (DECISION (confirmed), design D17), portalled to
`document.body` with `position: fixed` and `z-index: 60`, animated with `float-up` and removed after
800 ms; Jumping cap — `[data-testid="jumping-cap"]` rendered on top of the button, animated with
`cap-hop` on each click; Gold — `data-material="gold"` and a background different from Classic.
Disabled or unowned skins SHALL render nothing. Skins SHALL NOT move the main button's layout box.

The Soft shadow SHALL be clearly visible in **both** themes: in each theme the computed `box-shadow`
of the main button is not `none`, the colour of its last layer has `alpha >= 0.25`, and that colour
composited over the page background reaches `contrast >= 2.0` against the page background; the
computed values of the two themes differ from each other.

The Floating +N SHALL be readable over the button in **both** themes: its computed
`background-color` has `alpha >= 0.85`, its computed `color` differs from the main button's computed
`background-color`, and `contrast(color, composite(backgroundColor, buttonBackgroundColor)) >= 4.5`.
It SHALL be rendered above the button: `position: fixed`, `z-index: 60`, a direct child of
`document.body` that follows the main button in document order, with no `z-index` other than `auto`
on `<main>` or `[data-testid="shake-layer"]`, and its box SHALL overlap the main-button box when the
click happened on the button.

#### Scenario: Soft shadow changes the shadow [e2e]
- **GIVEN** storage is seeded with `V2(S({ totalClicks: 20, ownedSkins: ["soft-shadow"], enabledSkins: ["soft-shadow"] }))`
- **WHEN** the computed `box-shadow` of the main button is read (mouse away from the button), then `[data-testid="skin-toggle-soft-shadow"]` is clicked and it is read again
- **THEN** the two values are different

#### Scenario: Soft shadow is visible in both themes [e2e]
New test in `e2e/add-content-v3.spec.ts`.
- **GIVEN** `localStorage["dopamine-clicker:theme"]` is seeded with `"dark"` and storage with `V4(S({ totalClicks: 20, ownedSkins: ["soft-shadow"], enabledSkins: ["soft-shadow"] }))`
- **WHEN** the page `/` is loaded (mouse away from the button) and the computed `box-shadow` of `[data-testid="main-button"]` is read as `D`, together with the computed `background-color` of `<body>` as `BG_DARK`
- **THEN** `<html>` has `data-theme="dark"`, `D` is not `none`, `lastShadowColor(D)!.a >= 0.25` and `contrast(composite(lastShadowColor(D), BG_DARK), BG_DARK) >= 2.0`
- **WHEN** the user clicks `[data-testid="skin-toggle-soft-shadow"]` and the computed `box-shadow` is read again
- **THEN** it differs from `D`
- **WHEN** the user clicks `[data-testid="skin-toggle-soft-shadow"]` again and then `[data-testid="theme-toggle"]`, and the computed `box-shadow` is read as `L` with the body background as `BG_LIGHT`
- **THEN** `<html>` has `data-theme="light"`, `L` differs from `D`, `L` is not `none`, `lastShadowColor(L)!.a >= 0.25` and `contrast(composite(lastShadowColor(L), BG_LIGHT), BG_LIGHT) >= 2.0`

#### Scenario: Squish plays on click [e2e]
- **GIVEN** storage is seeded with `V2(S({ totalClicks: 20, ownedSkins: ["squish"], enabledSkins: ["squish"] }))`
- **WHEN** the user clicks the main button once
- **THEN** the computed `animation-name` of `[data-testid="main-button"]` is `squish`

#### Scenario: Floating number shows the earned amount [e2e]
- **GIVEN** storage is seeded with `V2(S({ totalClicks: 60, ownedSkins: ["floating-number"], enabledSkins: ["floating-number"] }))`
- **WHEN** the user clicks the main button once
- **THEN** at least one `[data-testid="floating-number"]` is visible with text `+1` and computed `animation-name` `float-up`
- **AND** 1500 ms later `[data-testid="floating-number"]` has count 0

#### Scenario: Floating number is readable in both themes [e2e]
New test in `e2e/add-content-v3.spec.ts`.
- **GIVEN** `localStorage["dopamine-clicker:theme"]` is seeded with `"dark"`, storage with `V4(S({ totalClicks: 60, ownedSkins: ["floating-number"], enabledSkins: ["floating-number"] }))`, and the clock is paused
- **WHEN** the user clicks the centre of `[data-testid="main-button"]` once and the computed `color` `C`, `background-color` `F` of `[data-testid="floating-number"]` and the `background-color` `B` of the main button are read
- **THEN** `parse(F).a >= 0.85`, `C` differs from `B` and `contrast(C, composite(F, B)) >= 4.5`
- **WHEN** the clock runs 1 500 ms, the user clicks `[data-testid="theme-toggle"]` and clicks the main button again, reading `C`, `F` and `B` for the light theme
- **THEN** `parse(F).a >= 0.85`, `C` differs from `B` and `contrast(C, composite(F, B)) >= 4.5`

#### Scenario: Floating number is painted above the button [e2e]
New test in `e2e/add-content-v3.spec.ts`.
- **GIVEN** storage is seeded with `V4(S({ totalClicks: 60, ownedSkins: ["floating-number"], enabledSkins: ["floating-number"] }))` and the clock is paused
- **WHEN** the user clicks the centre of `[data-testid="main-button"]` once
- **THEN** `[data-testid="floating-number"]` has computed `position` `fixed` and computed `z-index` `60`
- **AND** its `parentElement` is `document.body` and `floating.compareDocumentPosition(mainButton)` has the `DOCUMENT_POSITION_PRECEDING` bit set
- **AND** the computed `z-index` of `main` and of `[data-testid="shake-layer"]` is `auto`
- **AND** its box strictly overlaps the main-button box

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

## ADDED Requirements

### Requirement: Colour helpers for contrast assertions
`lib/ui/contrast.ts` SHALL export the pure functions `parseCssColor`, `compositeOver`,
`relativeLuminance`, `contrastRatio` and `lastShadowColor` (DECISION (confirmed), design
D18). `parseCssColor(value)` SHALL accept `#rgb`, `#rrggbb`, `rgb(r g b)`, `rgb(r, g, b)`,
`rgb(r g b / a)`, `rgba(r, g, b, a)` (alpha as a number or a percentage) and `transparent`
(`{ r: 0, g: 0, b: 0, a: 0 }`), and return `null` for anything else, including `none`, colour
keywords and gradients. `compositeOver(fg, bg)` SHALL return
`{ r, g, b, a: 1 }` with each channel `Math.round(fg.a * fg.c + (1 - fg.a) * bg.c)`.
`relativeLuminance(color)` SHALL be the WCAG 2.1 luminance of the colour treated as opaque
(`c/255`, then `c <= 0.03928 ? c/12.92 : ((c + 0.055)/1.055) ** 2.4`, weighted 0.2126 / 0.7152 /
0.0722). `contrastRatio(a, b)` SHALL be `Number((((L1 + 0.05) / (L2 + 0.05))).toFixed(4))` with
`L1 >= L2`, and SHALL composite any non-opaque colour over the other one first. `lastShadowColor(value)`
SHALL return the parsed colour of the last comma-separated layer of a computed `box-shadow`
(Chromium writes the colour first in each layer), or `null` when the value is `none` or unparseable.

#### Scenario: Parsing colours [unit]
- **WHEN** `parseCssColor` is called with `"#fff"`, `"#0a0a0a"`, `"rgb(10, 20, 30)"`, `"rgb(10 20 30)"`, `"rgb(244 114 182 / 0.55)"`, `"rgba(0, 0, 0, 0.45)"`, `"rgb(0 0 0 / 50%)"` and `"transparent"`
- **THEN** the results deep-equal `{ r: 255, g: 255, b: 255, a: 1 }`, `{ r: 10, g: 10, b: 10, a: 1 }`, `{ r: 10, g: 20, b: 30, a: 1 }`, `{ r: 10, g: 20, b: 30, a: 1 }`, `{ r: 244, g: 114, b: 182, a: 0.55 }`, `{ r: 0, g: 0, b: 0, a: 0.45 }`, `{ r: 0, g: 0, b: 0, a: 0.5 }` and `{ r: 0, g: 0, b: 0, a: 0 }`

#### Scenario: Unparseable values [unit]
- **WHEN** `parseCssColor` is called with `"none"`, `""`, `"red"`, `"linear-gradient(red, blue)"`, `"#ff"` and `"rgb(10, 20)"`
- **THEN** every result is `null`

#### Scenario: Compositing [unit]
- **WHEN** `compositeOver({ r: 0, g: 0, b: 0, a: 0.45 }, { r: 247, g: 247, b: 248, a: 1 })` is evaluated
- **THEN** the result deep-equals `{ r: 136, g: 136, b: 136, a: 1 }`
- **WHEN** `compositeOver({ r: 244, g: 114, b: 182, a: 0.55 }, { r: 10, g: 10, b: 10, a: 1 })` is evaluated
- **THEN** the result deep-equals `{ r: 139, g: 67, b: 105, a: 1 }`
- **WHEN** `compositeOver({ r: 1, g: 2, b: 3, a: 1 }, { r: 250, g: 250, b: 250, a: 1 })` is evaluated
- **THEN** the result deep-equals `{ r: 1, g: 2, b: 3, a: 1 }`

#### Scenario: Luminance and contrast of the extremes [unit]
- **WHEN** `relativeLuminance({ r: 255, g: 255, b: 255, a: 1 })` and `relativeLuminance({ r: 0, g: 0, b: 0, a: 1 })` are evaluated
- **THEN** the results are `1` and `0`
- **WHEN** `contrastRatio({ r: 255, g: 255, b: 255, a: 1 }, { r: 0, g: 0, b: 0, a: 1 })` is evaluated
- **THEN** the result is `21`
- **WHEN** `contrastRatio(X, X)` is evaluated for `X = { r: 100, g: 150, b: 200, a: 1 }`
- **THEN** the result is `1`

#### Scenario: Contrast is symmetric and composites transparency [unit]
- **WHEN** `contrastRatio({ r: 0, g: 0, b: 0, a: 0.45 }, { r: 247, g: 247, b: 248, a: 1 })` and the same call with the arguments swapped are evaluated
- **THEN** both results are equal and greater than `2.0`

#### Scenario: Reading the last shadow layer [unit]
- **WHEN** `lastShadowColor("rgba(0, 0, 0, 0.45) 0px 10px 25px -5px")` is evaluated
- **THEN** the result deep-equals `{ r: 0, g: 0, b: 0, a: 0.45 }`
- **WHEN** `lastShadowColor("rgba(255, 255, 255, 0.12) 0px 0px 0px 1px, rgba(244, 114, 182, 0.55) 0px 10px 30px -4px")` is evaluated
- **THEN** the result deep-equals `{ r: 244, g: 114, b: 182, a: 0.55 }`
- **WHEN** `lastShadowColor("none")` and `lastShadowColor("")` are evaluated
- **THEN** both results are `null`
