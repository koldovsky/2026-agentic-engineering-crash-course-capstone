# Spec Delta: reduced-motion

Stage 4 adds three motion sources: the achievement toast, the sleeping cat's SVG animations and the
video decor (a looping video is motion by definition, so under reduced motion nothing autoplays).

Scenario tags: `[e2e]` = Playwright test in `e2e/add-content-v3.spec.ts` using
`test.use({ reducedMotion })` / `page.emulateMedia({ reducedMotion })`, viewport 1280 × 720, the
embed host stubbed. `S({...})`, `V4(...)`, `TR({...})`, `TF(...)`, "the clock is paused" and "the clock runs N ms" are
defined in `design.md`.

## ADDED Requirements

### Requirement: Stage 4 effects respect reduced motion
With full motion the achievement toast SHALL use the keyframe `toast-in`, the sleeping cat SHALL
animate as in the `page-decor` capability (`cat-breathe`, `cat-ear-twitch`, `cat-tail-sway`), and a
placed, active video SHALL mount its iframe automatically. With reduced motion:
`[data-testid="achievement-toast"]` SHALL still appear with the same text and the same 4 000 ms
lifetime but with computed `animation-name: none`; every element inside (and including)
`[data-testid="decor-sleeping-cat"]` SHALL have computed `animation-name: none` while all eight
parts stay visible; no video SHALL mount an iframe automatically — every video root SHALL stay
`data-video-state="idle"` and show `[data-testid="video-placeholder"]` with a
`[data-testid="video-play"]` button that mounts the frame on demand (DECISION (confirmed), design D8). Unlocking, progress, prices and the economy SHALL work the same in both modes.

#### Scenario: Full motion plays the Stage 4 effects [e2e]
- **GIVEN** `reducedMotion: "no-preference"`, the clock is paused and storage is seeded with `V4(S({ totalClicks: 6000, decor: [{ id: "sleeping-cat", position: { x: 0.05, y: 0.6 } }], videos: [{ id: "video-runner", position: { x: 0.05, y: 0.05 } }] }))`
- **WHEN** the page `/` is loaded and the user clicks the main button once
- **THEN** `[data-testid="achievement-toast"]` is visible with computed `animation-name` `toast-in`
- **AND** `[data-testid="cat-body"]` has computed `animation-name` `cat-breathe` and `[data-testid="cat-ear-left"]` has `cat-ear-twitch`
- **AND** `[data-testid="video-runner"]` eventually has `data-video-state="playing"` with one `[data-testid="video-frame"]` inside and no `[data-testid="video-play"]`

#### Scenario: Reduced motion keeps the toast but stops the animation [e2e]
- **GIVEN** `reducedMotion: "reduce"`, the clock is paused and the page `/` is loaded with empty storage
- **WHEN** the user clicks the main button once
- **THEN** `[data-testid="achievement-toast"]` is visible with text `Досягнення: Перший клік` and computed `animation-name` `none`
- **WHEN** the clock runs 4 000 ms
- **THEN** `[data-testid="achievement-toast"]` has count 0

#### Scenario: Reduced motion freezes the cat but keeps it visible [e2e]
- **GIVEN** `reducedMotion: "reduce"` and storage seeded with `V4(S({ totalClicks: 75, decor: [{ id: "sleeping-cat", position: { x: 0.05, y: 0.1 } }] }))`
- **WHEN** the page `/` is loaded
- **THEN** every element inside (and including) `[data-testid="decor-sleeping-cat"]` has computed `animation-name` `none`
- **AND** all eight cat parts are visible and the invariants of the `page-decor` requirement "Sleeping cat silhouette" still hold

#### Scenario: Reduced motion never autoplays a video [e2e]
- **GIVEN** `reducedMotion: "reduce"`, the stub route counts its calls and storage is seeded with `V4(S({ totalClicks: 6000, videos: [{ id: "video-runner", position: { x: 0.05, y: 0.05 } }] }))`
- **WHEN** the page `/` is loaded and 2 000 ms pass
- **THEN** `[data-testid="video-runner"]` has `data-video-state="idle"`, contains no `iframe`, and the stub route was called 0 times
- **AND** `[data-testid="video-play"]` is visible with text `Увімкнути відео`
- **WHEN** the user clicks `[data-testid="video-play"]`
- **THEN** `[data-testid="video-runner"]` eventually has `data-video-state="playing"` with one `[data-testid="video-frame"]` inside, and every element inside it has computed `animation-name` `none`

#### Scenario: Switching to reduced motion live [e2e]
- **GIVEN** `reducedMotion: "no-preference"`, the clock is paused, storage seeded with `V4(S({ balance: 999, totalClicks: 99 }))`, the trophy file with `TF(TR({ unlocked: ["first-click"] }))`, the page loaded
- **WHEN** the test calls `page.emulateMedia({ reducedMotion: "reduce" })` and then clicks the main button once
- **THEN** `[data-testid="achievement-toast"]` is visible with computed `animation-name` `none`
