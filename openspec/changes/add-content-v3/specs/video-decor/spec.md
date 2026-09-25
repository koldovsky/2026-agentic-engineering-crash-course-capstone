# Spec Delta: video-decor

A fourth shop category: ten long-form ambient videos embedded as third-party iframes (the owner's
personal build — a deliberate reversal of the brief's non-goal, design D2). The list lives in one
module so it can be swapped; frames are mounted lazily, muted, looping, capped at three at a time,
and degrade to an own-art placeholder without network. Tests never load a real third-party frame.

Scenario tags: `[unit]` = Vitest test in `lib/game/videos.test.ts`, `[e2e]` = Playwright test in
`e2e/add-content-v3.spec.ts` (viewport 1280 × 720, Ukrainian, `reducedMotion: "no-preference"`
unless stated, **the embed host is stubbed**, design D9). `FRESH`, `S({...})`, `V4(...)`, "the clock
is paused", "the clock runs N ms" and "the random hook is fixed to r" are defined in `design.md`.
"Strictly overlap" means `rectsOverlap` (touching edges is not an overlap).

## ADDED Requirements

### Requirement: Video catalog module
`lib/game/videos.ts` SHALL export `VIDEO_DECOR`: exactly these ten entries in this order, each
`{ id, provider: "youtube-nocookie", videoId }`, plus `VIDEO_SIZE = { width: 192, height: 108 }`,
`MAX_ACTIVE_VIDEOS = 3`, `VIDEO_LOAD_TIMEOUT_MS = 5000` and
`VIDEO_EMBED_HOST = "https://www.youtube-nocookie.com"`. `getVideoEntry(id)` SHALL return the entry
with that id. The `videoId` values are placeholders until the human supplies the real ones
(DECISION (confirmed), design D3); swapping a video SHALL require editing only this array.

| # | id | videoId |
|---|---|---|
| 1 | `video-runner` | `PLACEHLDR01` |
| 2 | `video-parkour` | `PLACEHLDR02` |
| 3 | `video-soap` | `PLACEHLDR03` |
| 4 | `video-kinetic-sand` | `PLACEHLDR04` |
| 5 | `video-slime` | `PLACEHLDR05` |
| 6 | `video-hydraulic` | `PLACEHLDR06` |
| 7 | `video-marble` | `PLACEHLDR07` |
| 8 | `video-aquarium` | `PLACEHLDR08` |
| 9 | `video-fireplace` | `PLACEHLDR09` |
| 10 | `video-rain` | `PLACEHLDR10` |

#### Scenario: Catalog ids, order and constants [unit]
- **WHEN** `VIDEO_DECOR.map((v) => v.id)` and the constants are read
- **THEN** the ids equal `["video-runner", "video-parkour", "video-soap", "video-kinetic-sand", "video-slime", "video-hydraulic", "video-marble", "video-aquarium", "video-fireplace", "video-rain"]`
- **AND** `VIDEO_SIZE` deep-equals `{ width: 192, height: 108 }`, `MAX_ACTIVE_VIDEOS` is `3`, `VIDEO_LOAD_TIMEOUT_MS` is `5000` and `VIDEO_EMBED_HOST` is `"https://www.youtube-nocookie.com"`

#### Scenario: Catalog entries [unit]
- **WHEN** each entry of `VIDEO_DECOR` is read
- **THEN** each deep-equals its row above, e.g. `getVideoEntry("video-runner")` equals `{ id: "video-runner", provider: "youtube-nocookie", videoId: "PLACEHLDR01" }` and `getVideoEntry("video-rain")` equals `{ id: "video-rain", provider: "youtube-nocookie", videoId: "PLACEHLDR10" }`
- **AND** every `videoId` is a distinct non-empty string and every `provider` is `"youtube-nocookie"`

### Requirement: Embed URL
`buildEmbedUrl(entry)` SHALL return
`<VIDEO_EMBED_HOST>/embed/<videoId>?autoplay=1&mute=1&loop=1&playlist=<videoId>&controls=0&modestbranding=1&playsinline=1&rel=0&disablekb=1&iv_load_policy=3`,
with `&start=<startSeconds>` appended last when `entry.startSeconds` is an integer > 0 (DECISION
(confirmed), design D6). It SHALL be pure (no DOM, no network) and SHALL always contain
`mute=1` (autoplay policy) and `playlist=<videoId>` (looping).

#### Scenario: Default parameters [unit]
- **WHEN** `buildEmbedUrl(getVideoEntry("video-runner"))` is called
- **THEN** the result is exactly `"https://www.youtube-nocookie.com/embed/PLACEHLDR01?autoplay=1&mute=1&loop=1&playlist=PLACEHLDR01&controls=0&modestbranding=1&playsinline=1&rel=0&disablekb=1&iv_load_policy=3"`

#### Scenario: Start offset [unit]
- **WHEN** `buildEmbedUrl({ id: "video-soap", provider: "youtube-nocookie", videoId: "PLACEHLDR03", startSeconds: 90 })` is called
- **THEN** the result ends with `"&iv_load_policy=3&start=90"` and starts with `"https://www.youtube-nocookie.com/embed/PLACEHLDR03?autoplay=1&mute=1"`
- **WHEN** it is called with `startSeconds: 0`, `startSeconds: -5` and `startSeconds: 1.5`
- **THEN** none of the results contains `"start="`

#### Scenario: Every catalog entry builds a same-host URL [unit]
- **WHEN** `buildEmbedUrl` is called for all ten entries
- **THEN** each result starts with `"https://www.youtube-nocookie.com/embed/"`, contains `"mute=1"`, `"loop=1"` and `"playlist="` plus that entry's `videoId`, and the ten results are distinct

### Requirement: At most three active videos
`getActiveVideos(placed)` SHALL return the first `MAX_ACTIVE_VIDEOS` entries of `placed`, in the
given (catalog) order, whose `position` is not `null`; every other bought video is inactive
(DECISION (confirmed), design D5). It SHALL be pure and SHALL NOT mutate `placed`.

#### Scenario: Fewer than the cap [unit]
- **WHEN** `getActiveVideos([{ id: "video-runner", position: { x: 0.1, y: 0.1 } }, { id: "video-soap", position: { x: 0.2, y: 0.2 } }])` is called
- **THEN** the ids of the result are `["video-runner", "video-soap"]`

#### Scenario: The cap holds [unit]
- **WHEN** `getActiveVideos` is called with five placed videos `video-runner`, `video-parkour`, `video-soap`, `video-slime`, `video-rain` (all with a position)
- **THEN** the ids of the result are `["video-runner", "video-parkour", "video-soap"]`

#### Scenario: Docked videos never take a slot [unit]
- **WHEN** `getActiveVideos([{ id: "video-runner", position: null }, { id: "video-parkour", position: { x: 0.3, y: 0.3 } }, { id: "video-soap", position: null }, { id: "video-slime", position: { x: 0.4, y: 0.4 } }])` is called
- **THEN** the ids of the result are `["video-parkour", "video-slime"]`

#### Scenario: Empty input [unit]
- **WHEN** `getActiveVideos([])` is called
- **THEN** the result is `[]`

### Requirement: Placing a bought video
Buying a video SHALL place it exactly like decor: the UI SHALL call `placeDecor({ viewport, size:
VIDEO_SIZE, reserved, random: pageRandom })` with the reserved rects of design D21 (the add-shop-v1
D10 list, the click-status slot, `[data-testid="achievements"]`, every placed decor and every placed
video) and pass the result as `videoPosition` to `buyItem` in the same state update. Each bought
video SHALL render as `[data-testid="<id>"]` (`position: fixed`, `role="group"`, `aria-label` =
`video.label` with the localized item name, size `VIDEO_SIZE`, `pointer-events: none`) at
`decorRect(position, VIDEO_SIZE, viewport)`, or in the shared fallback dock (right edge,
`right: 16px`, vertically centred, decor first then videos, catalog order, 8 px gap) when the
position is `null`. The saved position SHALL survive a reload. Bought videos cannot be hidden or
re-rolled in this stage (DECISION (confirmed), design D5).

#### Scenario: Buying a video places it clear of the UI [e2e]
- **GIVEN** storage is seeded with `V4(S({ balance: 5000, totalClicks: 3000 }))`
- **WHEN** the user clicks `[data-testid="shop-buy-video-runner"]`
- **THEN** `[data-testid="balance"]` shows `0` and `[data-testid="video-runner"]` is visible with a bounding box of 192 × 108 (±1 px)
- **AND** that box does not strictly overlap the boxes of `main-button`, `balance`, `shop`, `theme-toggle`, `lang-toggle`, `achievements`, `reset`, `click-status`
- **AND** the saved state's `videos` is `[{ id: "video-runner", position: { x: X, y: Y } }]` with `X × 1280` and `Y × 720` within 1 px of the box's x and y
- **AND** `[data-testid="shop-owned-video-runner"]` has text `Куплено`

#### Scenario: Position survives reload [e2e]
- **GIVEN** the video was bought as in the previous scenario and its box was recorded
- **WHEN** the page is reloaded
- **THEN** `[data-testid="video-runner"]` has the same x and y (±1 px)

#### Scenario: Videos and decor never overlap each other [e2e]
- **GIVEN** storage is seeded with `V4(S({ balance: 12600, totalClicks: 6000, decor: [{ id: "sleeping-cat", position: { x: 0.02, y: 0.6 } }] }))`
- **WHEN** the user buys `video-runner`, then `video-parkour`
- **THEN** both `[data-testid="video-runner"]` and `[data-testid="video-parkour"]` are visible and their boxes do not strictly overlap each other nor the box of `[data-testid="decor-sleeping-cat"]`

#### Scenario: Seeded position is rendered with its label [e2e]
- **GIVEN** storage is seeded with `V4(S({ totalClicks: 6000, videos: [{ id: "video-soap", position: { x: 0.8, y: 0.1 } }] }))`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="video-soap"]` has x = 1024, y = 72, width = 192, height = 108 (each ±1 px)
- **AND** it has role `group` with accessible name `Відео: Різання мила`

#### Scenario: A video never blocks the main button [e2e]
- **GIVEN** storage is seeded with `V4(S({ balance: 5, totalClicks: 6000, videos: [{ id: "video-soap", position: { x: 0.45, y: 0.45 } }] }))` (drawn over the main button on purpose)
- **WHEN** the user clicks `[data-testid="main-button"]` (Playwright actionability check must pass without `force`)
- **THEN** `[data-testid="balance"]` shows `6`

### Requirement: Lazy, muted, looping iframe
A video root SHALL carry `data-video-state` with one of `idle`, `loading`, `playing`, `offline`
(design D7) and SHALL always render `[data-testid="video-placeholder"]` (own CSS art with the
localized item name) underneath. The `<iframe data-testid="video-frame">` SHALL be created only when
the video is among `getActiveVideos`, its root intersects the viewport (`IntersectionObserver`,
threshold 0) and motion is not reduced; its `src` SHALL be `buildEmbedUrl(entry)` and it SHALL carry
`allow="autoplay; encrypted-media; picture-in-picture"`, `referrerpolicy="strict-origin-when-cross-origin"`,
`loading="lazy"`, `tabindex="-1"` and a `title`. The state SHALL become `playing` when the frame
fires `load` within `VIDEO_LOAD_TIMEOUT_MS` (5 000 ms), and `offline` — with the frame removed and
`video.offline` shown in the placeholder — when it does not, or when `navigator.onLine` is `false`
at mount time. An `online` event SHALL return an `offline` video to `idle` so it can try again.

#### Scenario: A placed video mounts a muted looping frame [e2e]
- **GIVEN** storage is seeded with `V4(S({ totalClicks: 6000, videos: [{ id: "video-runner", position: { x: 0.05, y: 0.05 } }] }))`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="video-runner"]` eventually has `data-video-state="playing"`
- **AND** `[data-testid="video-runner"] [data-testid="video-frame"]` has a `src` equal to `buildEmbedUrl(getVideoEntry("video-runner"))`, an `allow` attribute containing `autoplay`, `referrerpolicy="strict-origin-when-cross-origin"`, `loading="lazy"` and `tabindex="-1"`
- **AND** the stub document was requested exactly once

#### Scenario: At most three frames exist [e2e]
- **GIVEN** storage is seeded with `V4(S({ totalClicks: 30000, videos: [{ id: "video-runner", position: { x: 0.02, y: 0.02 } }, { id: "video-parkour", position: { x: 0.30, y: 0.02 } }, { id: "video-soap", position: { x: 0.58, y: 0.02 } }, { id: "video-slime", position: { x: 0.02, y: 0.80 } }, { id: "video-rain", position: { x: 0.75, y: 0.80 } }] }))`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="video-frame"]` has count 3 and they sit inside `video-runner`, `video-parkour` and `video-soap`
- **AND** `[data-testid="video-slime"]` and `[data-testid="video-rain"]` have `data-video-state="idle"`, contain no `iframe`, and their `[data-testid="video-placeholder"]` is visible

#### Scenario: No network falls back to the placeholder [e2e]
- **GIVEN** every request to the embed host is aborted with `failed`, storage is seeded with `V4(S({ totalClicks: 6000, videos: [{ id: "video-runner", position: { x: 0.05, y: 0.05 } }] }))` and the clock is paused
- **WHEN** the page `/` is loaded and the clock runs 5 000 ms
- **THEN** `[data-testid="video-runner"]` has `data-video-state="offline"`, contains no `iframe`, and its `[data-testid="video-placeholder"]` is visible with the text `Відео недоступне без мережі`
- **AND** `[data-testid="main-button"]` is still enabled and clicking it once makes `[data-testid="balance"]` show `1`

#### Scenario: Inactive videos cost no request [e2e]
- **GIVEN** the stub route counts its calls and storage is seeded with the same five placed videos as the previous scenario
- **WHEN** the page `/` is loaded and 2 000 ms pass
- **THEN** the stub route was called exactly 3 times (one per active video, none for `video-slime` and `video-rain`)

### Requirement: Tests never load a third-party frame
Every `[e2e]` scenario of this change SHALL install a Playwright route for `**://*.youtube-nocookie.com/**`
before the first navigation and fulfil it with a local stub document (or abort it for the offline
scenarios), so the suite runs offline and deterministically (DECISION (confirmed), design D9).

#### Scenario: No unstubbed external request is made [e2e]
- **GIVEN** every request of the page is recorded and storage is seeded with `V4(S({ totalClicks: 30000, videos: [{ id: "video-runner", position: { x: 0.02, y: 0.02 } }, { id: "video-parkour", position: { x: 0.30, y: 0.02 } }, { id: "video-soap", position: { x: 0.58, y: 0.02 } }] }))`
- **WHEN** the page `/` is loaded, the user clicks the main button once and 2 000 ms pass
- **THEN** every recorded request URL has host `localhost` (the dev server) or `www.youtube-nocookie.com`
- **AND** every `www.youtube-nocookie.com` request was served by the stub route (its handler call count equals the number of such requests)

## MODIFIED Requirements

### Requirement: Revised catalog, size and no frame cap
Supersedes the ten-item placeholder catalog, `VIDEO_SIZE` 192×108, and `MAX_ACTIVE_VIDEOS = 3` (design D23, confirmed 2026-09-25). `VIDEO_DECOR` SHALL be the eleven entries of D23 in that order. `VIDEO_SIZE` SHALL be `{ width: 384, height: 216 }`. `getActiveVideos` SHALL return every entry with a non-null position, in order, with no cap. `videos-all` threshold SHALL be 11. `video-seal` SHALL cost 60 000 and reveal at 36 000.

#### Scenario: Eleven real ids [unit]
- **THEN** `VIDEO_DECOR` has length 11, `VIDEO_DECOR[0].videoId` is `vTfD20dbxho`, `VIDEO_DECOR[10]` is `{ id: "video-seal", provider: "youtube-nocookie", videoId: "h9uFQv3t1AU" }`, and `VIDEO_SIZE` deep-equals `{ width: 384, height: 216 }`

#### Scenario: Five placed videos all mount [e2e]
- **GIVEN** storage is seeded with five placed videos (`video-runner`, `video-parkour`, `video-soap`, `video-slime`, `video-rain`)
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="video-frame"]` has count 5

### Requirement: Placed videos do not overlap
`separatePlacedVideos(videos, viewport)` SHALL return a new list of the same length. A `null` position stays `null`. The first video that has a position keeps it. Each later positioned video is moved until `rectsOverlap` is false against every earlier positioned box of `VIDEO_SIZE`, and the box stays inside the viewport. The input list is not mutated. The screen and the next purchase SHALL use this list.

#### Scenario: Two videos on the same spot are separated [unit]
- **GIVEN** viewport `{ width: 1280, height: 720 }` and videos `video-runner` and `video-parkour` both at `{ x: 0.1, y: 0.1 }`
- **WHEN** `separatePlacedVideos` runs
- **THEN** the first position is unchanged, the two `VIDEO_SIZE` boxes do not strictly overlap, and the input array is unchanged

## MODIFIED Requirements

### Requirement: Expedition catalog replaces three videos
Supersedes the D23 id list (design D24, confirmed 2026-09-25). `VIDEO_DECOR` SHALL be eleven entries in this order: `video-music` (`wTRRKguilmY`), `video-runner`, `video-parkour`, `video-soap`, `video-kinetic-sand`, `video-slime`, `video-hydraulic`, `video-trailer` (`2VaLOc1FpSo`), `video-combat` (`nLdRv_N3y00`), `video-rain`, `video-seal`. `video-music` SHALL cost 2 500 and reveal at 1 500. `video-trailer` SHALL cost 25 000 and reveal at 15 000. `video-combat` SHALL cost 30 000 and reveal at 18 000. The other eight prices stay as in D23. `video-marble`, `video-aquarium`, and `video-fireplace` SHALL NOT be catalog ids. `videos-all` threshold stays 11.

#### Scenario: Music is first and cheapest [unit]
- **THEN** `VIDEO_DECOR[0]` is `{ id: "video-music", provider: "youtube-nocookie", videoId: "wTRRKguilmY" }`
- **AND** `VIDEO_DECOR` ids equal `["video-music", "video-runner", "video-parkour", "video-soap", "video-kinetic-sand", "video-slime", "video-hydraulic", "video-trailer", "video-combat", "video-rain", "video-seal"]`
- **AND** the shop price of `video-music` is 2500 and its `revealAt` is 1500, lower than every other video
