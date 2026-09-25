# Design: add-content-v3

## Context

Stages 1–3 are implemented and archived (`openspec/specs/` holds 13 capabilities). Pure logic lives
in `lib/game/{click-value,state,save,preferences,shop,skins,helpers,decor,crit,combo,golden,press}.ts`,
dictionaries in `lib/i18n/`, the client UI in `components/` where `game-store.ts` holds the saved
game as an external store (`commitGame`, `buy`, `toggle`, `press`, `tick`, `catchGoldenButton`,
`resetGame`) plus module-level runtime (helper carry, main-click carry, `ClickRuntime`).
`GameScreen` runs one 100 ms interval. Save version 3, `MIGRATIONS = { 1: migrateV1ToV2,
2: migrateV2ToV3 }`.

Contract: `lib/game/types.ts` (extended by this change; types only). Stryker mutates `lib/**/*.ts`
except tests and `types.ts`; threshold 70 %.

Notation used in every spec delta of this change:

- `FRESH` = the v4 fresh state:
  `{ balance: 0, totalClicks: 0, ownedSkins: [], enabledSkins: [], material: "classic", decor: [],
  videos: [], upgrades: [], helpers: { monkey: 0, robot: 0, factory: 0 }, levels: { crit: 0,
  "speed-monkey": 0, "speed-robot": 0, "speed-factory": 0 } }` — v3 plus `videos`, nothing else.
- `S({ ... })` = `FRESH` with the listed top-level fields replaced, **except `helpers` and `levels`,
  which are shallow-merged into their FRESH defaults**: `S({ helpers: { monkey: 2 } })` has
  `helpers: { monkey: 2, robot: 0, factory: 0 }`. Tests implement `S` exactly like that, so every
  Stage 1–3 scenario text keeps its meaning.
- `S3({ ... })` = the Stage 3 (v3) payload `{ balance: 0, totalClicks: 0, ownedSkins: [],
  enabledSkins: [], material: "classic", decor: [], upgrades: [], helpers: { monkey: 0, robot: 0,
  factory: 0 }, levels: { crit: 0, "speed-monkey": 0, "speed-robot": 0, "speed-factory": 0 } }`
  with the listed fields replaced (`helpers` / `levels` merged as above).
- `S2({ ... })` = the Stage 2 (v2) payload as defined in add-upgrades-v2 `design.md`.
- `L0` = `{ crit: 0, "speed-monkey": 0, "speed-robot": 0, "speed-factory": 0 }`;
  `ST0` = `{ crits: 0, goldenCaught: 0, maxComboLevel: 0, resets: 0 }` (the trophy counters).
- `seq(a, b, ...)` = a scripted `RandomSource` returning the given values in order, throwing when
  over-called, exposing its call count.
- `V2(x)` / `V3(x)` / `V4(x)` = the JSON strings `{"version":N,"state":<x as JSON>}`;
  `RAW_V1(b, t)` = `{"version":1,"state":{"balance":b,"totalClicks":t}}`.
- `A(...)` = an `AchievementStats` object with every metric 0 except the listed ones.
- `T0` = `createInitialTrophies()` = `{ unlocked: [], stats: { crits: 0, goldenCaught: 0,
  maxComboLevel: 0, resets: 0 } }`; `TR({ ... })` = `T0` with the listed fields replaced (`stats`
  shallow-merged into its `T0` defaults); `TF(x)` = the JSON string
  `{"version":1,"trophies":<x as JSON>}`.
- e2e "the clock is paused" / "the clock runs N ms" / "the random hook is fixed to r" as in
  add-upgrades-v2 design D19 (`page.clock.install()`, `page.clock.pauseAt(...)`,
  `page.clock.runFor(N)`, `page.addInitScript` setting `globalThis.__dcRandom`).
- "the embed host is stubbed" = the Playwright route stub of D9 below, installed in `beforeEach` of
  `e2e/add-content-v3.spec.ts`.
- `contrast(a, b)` = `contrastRatio` from `lib/ui/contrast.ts` (D18), used inside e2e assertions.
- "strictly overlap" = `rectsOverlap` from `lib/game/decor.ts`.

## Goals / Non-Goals

**Goals:** a cat that is testably cat-shaped; a Soft shadow and a Floating +N with measurable
contrast in both themes; a video decor category that is lazy, offline-safe and never contacted from
tests; 30 pure, deterministic achievements with an accessible panel and a non-spammy toast queue;
one save migration v3 → v4.

**Non-Goals:** everything listed as out of scope in `proposal.md`; in particular no achievement
rewards, no new own-art decor, no skins, no sounds.

## Decisions

All decisions below were **confirmed by the human on 2026-09-20** (task 0.1): D1–D11 and D13–D22
as proposed, **D12 changed** — the unlocked achievements and their counters do *not* live in the
game save; they get their own storage key `dopamine-clicker:trophies`, so "Reset progress" keeps
emptying `dopamine-clicker:save` exactly as in Stages 1–3. D11 was narrowed accordingly: the save
still bumps to version 4, but only because of `videos`. The only thing still open is the content of
D3: the ten `videoId` values are placeholders until the human pastes the real ids into
`lib/game/videos.ts` (see D3).

### D1. Stage 4 is revived with a new scope — DECISION (confirmed)
`docs/project-brief.md` line 158 currently reads "~~**Content:** remaining skins, sound packs and
decor.~~ — dropped on 2026-09-20; the project ends with stage 3." It is rewritten to a live Stage 4
with exactly the five items of this change; the original content list stays out of scope (see
`proposal.md`). Task 3.9 performs the edit.

### D2. Third-party video embeds reverse a brief non-goal — DECISION (confirmed)
The brief's non-goal "No third-party videos or copyrighted footage … no YouTube embeds" is narrowed
by task 3.9 to: *we still ship no copyrighted footage of our own and keep every own-art decoration;
the `video` shop category embeds third-party players whose ids the owner configures in
`lib/game/videos.ts`, for their personal build.* No ads, no analytics, no tracking cookies are
added; the embed host is the privacy-friendly `www.youtube-nocookie.com`. Alternative if the human
declines: drop item 4 entirely and keep Stage 4 at four items.

### D3. The 10 videos — DECISION (confirmed; real video ids still pending)
`VIDEO_DECOR` in `lib/game/videos.ts`, in catalog order. The `videoId` values below are
**placeholders of the right shape (11 characters)**. **Still pending:** the human will paste the
real ids / URLs into `lib/game/videos.ts` later; until then every video ends in the `offline`
placeholder of D7, which is a valid, tested state. Swapping the list means editing this one array.

| # | id | videoId (placeholder) | uk name | theme |
|---|---|---|---|---|
| 1 | `video-runner` | `PLACEHLDR01` | Нескінченний ранер | endless-runner gameplay |
| 2 | `video-parkour` | `PLACEHLDR02` | Паркур | parkour gameplay |
| 3 | `video-soap` | `PLACEHLDR03` | Різання мила | soap cutting |
| 4 | `video-kinetic-sand` | `PLACEHLDR04` | Кінетичний пісок | sand cutting |
| 5 | `video-slime` | `PLACEHLDR05` | Слайм | slime mixing |
| 6 | `video-hydraulic` | `PLACEHLDR06` | Гідравлічний прес | press compilation |
| 7 | `video-marble` | `PLACEHLDR07` | Мармурові доріжки | marble run |
| 8 | `video-aquarium` | `PLACEHLDR08` | Акваріум | aquarium |
| 9 | `video-fireplace` | `PLACEHLDR09` | Камін | fireplace |
| 10 | `video-rain` | `PLACEHLDR10` | Дощ у вікні | rain on glass |

`provider` is `"youtube-nocookie"` for all ten (the only provider in this stage). A future provider
would add a branch in `buildEmbedUrl` only.

### D4. Video prices and revealAt — DECISION (confirmed)
Videos are the last content tier, after the Factory. `revealAt = 0.6 × price` for every row (the
same 50–75 % rule as add-shop-v1 D5 / add-upgrades-v2 D6). They are one-time purchases (no levels,
no repeat).

| # | id | price | revealAt |
|---|---|---|---|
| 20 | `video-runner` | 5 000 | 3 000 |
| 21 | `video-parkour` | 7 500 | 4 500 |
| 22 | `video-soap` | 10 000 | 6 000 |
| 23 | `video-kinetic-sand` | 12 500 | 7 500 |
| 24 | `video-slime` | 15 000 | 9 000 |
| 25 | `video-hydraulic` | 20 000 | 12 000 |
| 26 | `video-marble` | 25 000 | 15 000 |
| 27 | `video-aquarium` | 30 000 | 18 000 |
| 28 | `video-fireplace` | 40 000 | 24 000 |
| 29 | `video-rain` | 50 000 | 30 000 |

Catalog order: the 19 Stage 1–3 items unchanged, then these ten. New `ShopCategory` `"video"`
(fourth category, rendered last, heading `shop.category.video`), new item kind `"video-decor"`.

### D5. Video size, placement and the 3-iframe cap — DECISION (confirmed)
`VIDEO_SIZE = { width: 192, height: 108 }` (16:9) for all ten. A bought video is placed exactly
like decor: `placeDecor({ viewport, size: VIDEO_SIZE, reserved, random: pageRandom })` with the
reserved rects of D21, the position saved in `state.videos`, `null` → the same fallback dock as
decor (docked videos and decor share one dock column, decor first, then videos, catalog order,
8 px gap).

At most `MAX_ACTIVE_VIDEOS = 3` iframes exist at any time: `getActiveVideos(placed)` returns the
first three entries of `placed` in catalog order **whose position is not null**. Every other bought
video renders its placeholder with `data-video-state="idle"` and no iframe. Rationale: ten
simultaneous players are heavy and pointless on a 1280 × 720 screen. Alternative: mount all of them
(simpler code, much heavier page).

### D6. Embed URL — DECISION (confirmed)
`VIDEO_EMBED_HOST = "https://www.youtube-nocookie.com"`. `buildEmbedUrl(entry)` returns
`` `${VIDEO_EMBED_HOST}/embed/${entry.videoId}?${params}` `` where `params` is exactly, in this
order:

`autoplay=1&mute=1&loop=1&playlist=<videoId>&controls=0&modestbranding=1&playsinline=1&rel=0&disablekb=1&iv_load_policy=3`

plus `&start=<startSeconds>` appended last when `entry.startSeconds` is a positive integer.
`loop=1` needs `playlist=<videoId>` to actually loop on this provider; `mute=1` is what makes
`autoplay=1` legal in browsers. The iframe carries
`allow="autoplay; encrypted-media; picture-in-picture"`, `referrerpolicy="strict-origin-when-cross-origin"`,
`loading="lazy"`, `title` = the localized `video.label`, `tabindex="-1"` and no `sandbox` attribute
(a sandbox without `allow-same-origin` breaks the player, and with it the sandbox adds nothing for a
cross-origin frame). The frame never receives pointer events from the game: the wrapper keeps
`pointer-events: none` like other decor, so the video cannot steal a click meant for the button.

### D7. Lazy mounting, states and the offline placeholder — DECISION (confirmed)
Root element per video: `[data-testid="<videoId>"]` (e.g. `video-runner`), `role="group"`,
`aria-label` = `video.label` with the localized item name, `position: fixed`,
`pointer-events: none`, size `VIDEO_SIZE`. It always renders `[data-testid="video-placeholder"]`
(own CSS art: a dark rounded card with the item name) underneath; the iframe, when mounted, covers
it. `data-video-state` on the root:

| state | when | iframe |
|---|---|---|
| `idle` | not among the first 3 active videos, or not yet intersecting the viewport, or reduced motion without a manual start | not mounted |
| `loading` | mounted, `load` not fired yet | mounted, `opacity: 0` |
| `playing` | `load` fired within `VIDEO_LOAD_TIMEOUT_MS = 5 000` ms | mounted, visible |
| `offline` | `navigator.onLine === false` at mount time, or no `load` within 5 000 ms | not mounted (unmounted again on timeout) |

Mounting is gated by an `IntersectionObserver` on the root (`threshold: 0`), so a video scrolled /
placed out of view costs nothing. In `offline` the placeholder shows `video.offline`. When
`navigator.onLine` turns true again (`online` event) an `offline` video returns to `idle` and may
mount once more.

### D8. Reduced motion never autoplays a video — DECISION (confirmed)
With `prefers-reduced-motion: reduce` no iframe is mounted automatically: the root stays `idle` and
the placeholder shows a real `<button data-testid="video-play">` (`video.play`) — the only
pointer-interactive part of the video decor (`pointer-events: auto` on that button). Pressing it
mounts the iframe for that one video (still counted against `MAX_ACTIVE_VIDEOS`). Everything else
in the video decor has `animation-name: none` under reduced motion.

### D9. e2e never loads a real third-party iframe — DECISION (confirmed)
`e2e/add-content-v3.spec.ts` installs, in `beforeEach` and before the first navigation:

```
await page.route("**://*.youtube-nocookie.com/**", (route) =>
  route.fulfill({ status: 200, contentType: "text/html",
    body: "<!doctype html><title>stub</title><body data-testid=\"video-stub\">" }));
```

Offline scenarios use `route.abort("failed")` (or never fulfil, letting `VIDEO_LOAD_TIMEOUT_MS`
expire on the fake clock) instead. One scenario collects every `page.on("request")` URL and asserts
that no request went to a host other than `localhost` and the stubbed `*.youtube-nocookie.com`, so a
future provider change cannot silently open the network in CI. Tests therefore run offline and
deterministically.

### D10. The 30 achievements — DECISION (confirmed)
Definitions live in `lib/game/achievements.ts` as data, not as closures: each is
`{ id, category, metric, threshold }` and the predicate is the single pure function
`isAchievementUnlocked(a, stats) = stats[a.metric] >= a.threshold`. That keeps them exhaustively
unit-testable and mutation-friendly, and makes progress (`min(1, stats[metric] / threshold)`) free.

**Achievements are cosmetic only**: no click value, no discount, no reveal, no currency. Nothing in
`lib/game/{shop,click-value,press,helpers,state,save}.ts` imports `achievements.ts` or `trophies.ts`
— the dependency only goes the other way.

Metrics (`AchievementMetric`), all derived purely by `getAchievementStats(state, trophies)` — the
first eleven from the **current** game state, the last four from the trophy counters (D12):

| metric | value |
|---|---|
| `totalClicks` | `state.totalClicks` |
| `balance` | `state.balance` |
| `purchases` | `ownedSkins.length + decor.length + videos.length + upgrades.length + monkey + robot + factory + Σ levels` |
| `skinsOwned` | `ownedSkins.length` |
| `goldEquipped` | `material === "gold" ? 1 : 0` |
| `decorOwned` | `decor.length` |
| `catOwned` | `decor.some(d => d.id === "sleeping-cat") ? 1 : 0` |
| `videosOwned` | `videos.length` |
| `helpersTotal` | `monkey + robot + factory` |
| `factories` | `helpers.factory` |
| `crits` | `trophies.stats.crits` |
| `maxComboLevel` | `trophies.stats.maxComboLevel` |
| `goldenCaught` | `trophies.stats.goldenCaught` |
| `resets` | `trophies.stats.resets` |
| `achievementsUnlocked` | size of the unlocked set passed to the evaluation (see below) |

The catalog, in display and storage order:

| # | id | category | metric | threshold |
|---|---|---|---|---|
| 1 | `first-click` | clicks | `totalClicks` | 1 |
| 2 | `clicks-100` | clicks | `totalClicks` | 100 |
| 3 | `clicks-1000` | clicks | `totalClicks` | 1 000 |
| 4 | `clicks-10000` | clicks | `totalClicks` | 10 000 |
| 5 | `clicks-100000` | clicks | `totalClicks` | 100 000 |
| 6 | `balance-1000` | balance | `balance` | 1 000 |
| 7 | `balance-50000` | balance | `balance` | 50 000 |
| 8 | `first-purchase` | purchases | `purchases` | 1 |
| 9 | `purchases-10` | purchases | `purchases` | 10 |
| 10 | `purchases-25` | purchases | `purchases` | 25 |
| 11 | `skins-3` | skins | `skinsOwned` | 3 |
| 12 | `skins-all` | skins | `skinsOwned` | 5 |
| 13 | `gold-equipped` | skins | `goldEquipped` | 1 |
| 14 | `first-decor` | decor | `decorOwned` | 1 |
| 15 | `decor-all` | decor | `decorOwned` | 3 |
| 16 | `cat-nap` | decor | `catOwned` | 1 |
| 17 | `first-video` | video | `videosOwned` | 1 |
| 18 | `videos-all` | video | `videosOwned` | 10 |
| 19 | `first-helper` | helpers | `helpersTotal` | 1 |
| 20 | `helpers-10` | helpers | `helpersTotal` | 10 |
| 21 | `factory-owner` | helpers | `factories` | 1 |
| 22 | `first-crit` | crit | `crits` | 1 |
| 23 | `crits-100` | crit | `crits` | 100 |
| 24 | `combo-5` | combo | `maxComboLevel` | 5 |
| 25 | `combo-max` | combo | `maxComboLevel` | 10 |
| 26 | `first-golden` | golden | `goldenCaught` | 1 |
| 27 | `golden-10` | golden | `goldenCaught` | 10 |
| 28 | `reset-once` | reset | `resets` | 1 |
| 29 | `achievements-10` | meta | `achievementsUnlocked` | 10 |
| 30 | `achievements-all` | meta | `achievementsUnlocked` | 29 |

`evaluateAchievements(unlocked, stats)` runs passes over the catalog until a pass adds nothing (at
most `ACHIEVEMENTS.length` passes), recomputing `achievementsUnlocked` from the growing set before
each pass, and returns `{ unlocked (catalog order, no duplicates), newlyUnlocked (catalog order) }`.
The fixed point makes the two meta achievements order-independent: the 29 others unlock
`achievements-all`, which then makes the set 30. **Unlocks are sticky**: an id, once in the set, is
never removed, even when its metric falls back. That is what makes the eleven state-derived metrics
safe across a reset: after a reset `totalClicks`, `balance`, `purchases`, `skinsOwned`,
`goldEquipped`, `decorOwned`, `catOwned`, `videosOwned`, `helpersTotal` and `factories` are 0 again
and the panel shows their progress bars back at `0 / goal`, while every id already in
`trophies.unlocked` stays unlocked and keeps its "unlocked" badge.

### D11. Save schema v4 — DECISION (confirmed, narrowed)
`CURRENT_SAVE_VERSION = 4`, `MIGRATIONS = { 1: migrateV1ToV2, 2: migrateV2ToV3, 3: migrateV3ToV4 }`.
v4 adds **exactly one** field to v3:

- `videos: readonly PlacedVideo[]` — `{ id, position }`, same shape, validation and normalization
  rules as `decor`.

The bump is needed only for that field; the achievements and their counters live outside the save
(D12). `migrateV3ToV4(s)`: for a non-array object, copies the nine v3 fields as-is and adds
`videos: []`; any other input is returned unchanged so validation rejects it. v1 and v2 saves run
the full chain. Loading never rewrites storage; the next write is v4. Rollback: a Stage 3 build sees
version 4 as a future version → `corrupted`, backs the raw value up to `dopamine-clicker:save:bad`
and starts fresh (the trophy file is untouched by that, and a Stage 3 build simply ignores it).

### D12. Trophies live in their own storage key — DECISION (changed by the human)
The unlocked achievements and their lifetime counters are **not** part of `GameState`. They are
stored under `dopamine-clicker:trophies` with their own versioned envelope, handled by the new pure
module `lib/game/trophies.ts`:

```
{ "version": 1, "trophies": { "unlocked": ["first-click", ...],
                              "stats": { "crits": 0, "goldenCaught": 0,
                                         "maxComboLevel": 0, "resets": 0 } } }
```

`CURRENT_TROPHIES_VERSION = 1`, `TROPHIES_KEY = "dopamine-clicker:trophies"`,
`TROPHIES_BACKUP_KEY = "dopamine-clicker:trophies:bad"`. The load / validate / corrupted-fallback
rules mirror the game save one for one: `loadTrophies` never throws, an unparseable, invalid or
non-1 version yields `{ trophies: T0, status: "corrupted" }` **and** copies the raw string verbatim
to `TROPHIES_BACKUP_KEY` (overwriting any previous backup; a failed backup write is ignored),
nothing is rewritten on load, `saveTrophies` returns `false` instead of throwing when storage
refuses. There is no migration table yet (only version 1 exists); adding one later follows the same
shape as `MIGRATIONS`.

Consequences:

- **Reset is exactly the Stage 1–3 behaviour again**: `clearGame(storage)` removes
  `dopamine-clicker:save` (the key **is `null`** afterwards), theme and language are untouched, and
  the corrupted-save backup is untouched. Stage 1–3 reset scenarios, reset copy and the
  `reset.body` dictionary value stay **unchanged**.
- Reset additionally writes the **trophy file**: `stats.resets + 1`, the other three counters back
  to 0, then one silent `evaluateAchievements` against the *pre-reset* state with the incremented
  counters, so `reset-once` (and any meta achievement it completes) unlocks at that moment without
  a toast.
- Counter metrics (`crits`, `goldenCaught`, `maxComboLevel`, `resets`) survive a reset because they
  live in the trophy file; state-derived metrics are read from the current `GameState` and drop back
  to 0, while unlocks stay sticky (D10).
- `catchGoldenButton` and a crit press now write the **trophy file**, never the game save; the
  Stage 3 save-write policy (add-shop-v1 D11) is therefore unchanged.
- A player who clears only the game save keeps their trophy case; a player who clears only the
  trophy file re-earns everything that the current state still satisfies on the next evaluation.

### D13. Toast queue — DECISION (confirmed)
`ACHIEVEMENT_TOAST_MS = 4 000`, `ACHIEVEMENT_TOAST_GAP_MS = 300`, one toast visible at a time, FIFO
in catalog order. Pure state machine in `lib/game/achievements.ts`:
`createToastQueue()`, `enqueueToasts(queue, ids)` (appends, ignoring ids already queued or showing),
`advanceToastQueue(queue, elapsedMs)` (clamped to `[0, MAX_TICK_MS]` like every other tick),
driven by the existing 100 ms game tick. `ToastQueue = { current: AchievementId | null;
remainingMs: number; pending: readonly AchievementId[] }`; when `current` runs out the queue waits
`ACHIEVEMENT_TOAST_GAP_MS` (`current: null`, `remainingMs` counting the gap) before showing the next.

**The evaluation that runs on load never produces toasts**: after loading the save and the trophy
file, achievements are evaluated once, the result is written to the trophy file silently, and only
unlocks from later actions are enqueued. Otherwise a seeded or long-idle save would fire twenty
toasts at once.

UI: `[data-testid="achievement-toast"]` bottom-centre, `role="status"`, `aria-live="polite"`,
text `achievements.toast` with the localized achievement name, keyframe `toast-in` (200 ms) under
full motion and `animation-name: none` under reduced motion (it still appears and still disappears
after 4 000 ms).

### D14. Achievements panel — DECISION (confirmed)
Trigger `<button data-testid="achievements">` in the top-right cluster, left of the language
toggle, text `achievements.open`. It opens `<dialog data-testid="achievements-dialog">`
(`showModal()`, `aria-labelledby` the `<h2>` with `achievements.title`, initial focus on
`[data-testid="achievements-close"]`, Escape closes natively). Inside:

- `[data-testid="achievements-count"]` — `achievements.count` with `{unlocked}` / `{total}`
  formatted by `formatNumber`;
- `<ul data-testid="achievements-list">` with exactly 30 `<li data-testid="achievement-<id>">` in
  catalog order, each carrying `data-unlocked="true" | "false"`, the localized name
  (`achievement.<id>.name`), the description (`achievement.<id>.description`) and a state badge
  (`achievements.unlocked` / `achievements.locked`);
- inside each row with `threshold > 1`, `[data-testid="achievement-progress-<id>"]` with
  `achievements.progress` = `{current} / {goal}` where `current = min(stats[metric], threshold)`,
  both formatted by `formatNumber`. Rows with `threshold === 1` render no progress element.

Locked achievements are shown with their real name and description (no secrets) — a visible goal
list is the point.

### D15. Sleeping cat SVG — DECISION (confirmed)
`components/DecorLayer.tsx` renders, for `sleeping-cat`, one inline
`<svg data-testid="cat-svg" viewBox="0 0 120 80" preserveAspectRatio="xMidYMid meet"
aria-hidden="true">` filling the 120 × 80 decor box, with exactly these eight parts (each an own
element with its own test id, all filled in `currentColor`-derived greys so both themes work):

| test id | shape | user-unit geometry |
|---|---|---|
| `cat-tail` | path curling in front of the body | bbox ≈ `{ x: 6, y: 50, w: 52, h: 26 }` |
| `cat-body` | curled ellipse | centre (58, 54), rx 44, ry 22 |
| `cat-head` | circle resting on the right end | centre (92, 38), r 16 |
| `cat-ear-left` | triangle | tip (80, 16), base (74, 30)–(88, 26) |
| `cat-ear-right` | triangle | tip (108, 20), base (100, 26)–(110, 34) |
| `cat-eye-left` | closed-eye arc | from (82, 40) to (90, 40), bulging down |
| `cat-eye-right` | closed-eye arc | from (96, 40) to (104, 40), bulging down |
| `cat-nose` | small triangle | around (93, 46), ≤ 6 × 5 |

Invariants the e2e asserts on the rendered boxes (all in CSS px inside the 120 × 80 root, so they
hold for any tuning that keeps the silhouette):

1. all eight parts are attached and inside the root box (±1 px);
2. `body.width ≥ 0.6 × root.width` and `body.height ≥ 0.35 × root.height` (a curled body, not a stick);
3. `head.centerY < body.centerY` and `head.centerX > body.centerX + 0.15 × body.width` (the head
   rests on the right end of the curl);
4. `head.width ≥ 0.2 × root.width` and `head.width ≤ 0.5 × root.width`;
5. each ear's top edge is above the head's top edge, and each ear's horizontal centre lies within
   `[head.left − 4, head.right + 4]`; `earLeft.centerX < earRight.centerX`;
6. both eyes lie inside the head box and `eyeLeft.centerX < eyeRight.centerX`; the nose's centre is
   below both eyes and between them (±4 px);
7. `tail.left < body.left` (the tail reaches past the body on the side away from the head) and
   `tail.width ≥ 0.25 × body.width`.

Animation: `cat-body` keeps `cat-breathe` (4 s), both ears keep `cat-ear-twitch` (7 s), `cat-tail`
keeps `cat-tail-sway` (6 s); under reduced motion all three are `none` and every part stays
visible. The decor root keeps `role="img"` with the localized `Сплячий кіт` label, so the SVG is
`aria-hidden`. A human visual check (task 5.4) confirms it actually reads as a cat in both themes.

### D16. Soft shadow tokens per theme — DECISION (confirmed)
New custom properties, set in `:root` / `[data-theme="light"]` and overridden in
`[data-theme="dark"]`; `.skin-soft-shadow` only reads them:

| token | light | dark |
|---|---|---|
| `--skin-shadow` | `0 10px 25px -5px rgb(0 0 0 / 0.45)` | `0 0 0 1px rgb(255 255 255 / 0.12), 0 10px 30px -4px rgb(244 114 182 / 0.55)` |
| `--skin-shadow-hover` | `0 18px 35px -8px rgb(0 0 0 / 0.55)` | `0 0 0 1px rgb(255 255 255 / 0.18), 0 18px 40px -6px rgb(244 114 182 / 0.75)` |
| `--skin-shadow-active` | `0 4px 10px -4px rgb(0 0 0 / 0.65)` | `0 0 0 1px rgb(255 255 255 / 0.22), 0 4px 14px -4px rgb(244 114 182 / 0.85)` |

Acceptance (measured in e2e, both themes, shadow enabled): the computed `box-shadow` is not `none`;
its **last** colour (the glow / drop colour) has `alpha ≥ 0.25`; that colour composited over the
page background reaches `contrast(composite, background) ≥ 2.0`; and the computed value differs
between the two themes and from the value with the skin turned off. Numbers for the tokens above:
light ≈ 3.2, dark ≈ 2.9 (see D18 for the formula).

### D17. Floating +N: readable pill above the button — DECISION (confirmed)
The +N keeps its portal to `document.body` (deliberate: a `transform`ed ancestor would trap a
`position: fixed` child, add-upgrades-v2 D12) and becomes a pill:

| token | light | dark |
|---|---|---|
| `--fx-float-bg` | `rgb(23 23 23 / 0.92)` | `rgb(237 237 237 / 0.94)` |
| `--fx-float-fg` | `#ffffff` | `#0a0a0a` |

`z-index: 60` (above the golden button's 40 and the switchers' 20), `position: fixed`,
`pointer-events: none`, padding `2px 8px`, `border-radius: 9999px`. Acceptance (e2e, both themes):

1. computed `background-color` alpha ≥ 0.85 and computed `color` ≠ the main button's computed
   `background-color`;
2. `contrast(color, backgroundColor composited over the main button's background-color) ≥ 4.5`;
3. computed `position` is `fixed` and computed `z-index` is `60`;
4. its `parentElement` is `document.body` and the main button **precedes** it in document order
   (`compareDocumentPosition` has `DOCUMENT_POSITION_PRECEDING` set), and neither `<main>` nor
   `[data-testid="shake-layer"]` has a computed `z-index` other than `auto`;
5. spawning at the button centre, the +N box strictly overlaps the main-button box.

Together 3–5 pin "rendered above the button" without relying on `elementFromPoint`, which skips
`pointer-events: none` elements.

### D18. `lib/ui/contrast.ts` — DECISION (confirmed)
A tiny pure colour module (no React, no DOM) so the e2e colour assertions are exact and themselves
unit-tested:

- `parseCssColor(value)` → `{ r, g, b, a }` (0–255, alpha 0–1) for `#rgb`, `#rrggbb`,
  `rgb(r g b)`, `rgb(r, g, b)`, `rgb(r g b / a)`, `rgba(r, g, b, a)` and `transparent`; `null` for
  anything else (`none`, keywords, gradients);
- `compositeOver(fg, bg)` → the opaque colour of `fg` drawn over the opaque `bg`
  (`c = a·fg + (1 − a)·bg`, rounded half up, alpha 1);
- `relativeLuminance(color)` → the WCAG 2.1 luminance of an opaque colour;
- `contrastRatio(a, b)` → `(L1 + 0.05) / (L2 + 0.05)`, `L1 ≥ L2`, rounded to 4 decimals;
- `lastShadowColor(boxShadow)` → the colour of the last comma-separated layer of a computed
  `box-shadow` string, or `null`.

It lives in `lib/ui/` (not `lib/game/`) because it is presentation maths, and it is mutated by
Stryker like the rest of `lib/`.

### D19. Copy — DECISION (confirmed)
160 keys (68 existing, 92 new); every value is in the localization delta. `item.<id>.name` /
`.description` for the ten videos, `achievement.<id>.name` / `.description` for the thirty
achievements, plus 13 UI keys. Ukrainian apostrophe U+2019, thousands separated by U+00A0 inside
copy (`1 000`), English with commas. **No existing value changes** — the `reset.body` rewrite is
dropped with D12, because a reset behaves exactly as the current copy describes (the trophy file is
not game progress, just like theme and language). Numbers inside `{...}` placeholders are
interpolated already formatted with `formatNumber`.

### D20. Stage 1–3 tests updated in the red commit — DECISION (confirmed)
Like add-shop-v1 D19 and add-upgrades-v2 D20, but much smaller than first planned: with D12 the
reset behaviour, the reset copy and every "save is null after reset" expectation stay **unchanged**.
Only the v3 → v4 schema (one new `videos: []` field), the 19 → 29 item catalog and the 68 → 160 key
dictionary ripple through. Rewritten in the red commit:
`lib/game/{state,save,shop,skins,helpers,click-value,press,decor}.test.ts` (the `S()` fixture and
the v4 envelope / catalog scenarios), `lib/i18n/i18n.test.ts`,
`components/{game-store,game-store.runtime,game-store.shop,game-store.upgrades,ShopBox}.test.ts(x)`
(fixtures only); in e2e only the expected envelopes of `e2e/add-foundation.spec.ts` ("Corrupted save
in the browser", "Reload keeps balance"), `e2e/add-shop-v1.spec.ts` ("Buying a skin through the
UI", "Stage 1 player continues in Stage 2", "No catch-up for closed time" — now 10 state keys) and
`e2e/add-upgrades-v2.spec.ts` ("Stage 2 player continues in Stage 3"). "All items at 750 clicks",
"Reset wipes purchases", "Confirm wipes game but keeps theme and language" and "Reset clears Stage 3
progress and runtime" stay untouched (no video is revealed at 750, and the save key is still `null`
after a reset). `add-upgrades-v2` is archived, so its lock is released; from this red commit on they
are locked under `add-content-v3`.

### D21. Page wiring (owner: ui-frontend)
- `components/game-store.ts` keeps the trophy file next to the save snapshot (loaded once with
  `loadTrophies`, published in the runtime snapshot so the panel and the toast can read it) and
  gains one internal `syncTrophies({ counters?, silent? })` that (a) applies the counter deltas,
  (b) runs `evaluateAchievements(trophies.unlocked, getAchievementStats(snapshot, next))`,
  (c) enqueues `newlyUnlocked` unless `silent`, (d) `saveTrophies` + publishes — and is called after
  every game-state write (`press`, `buy`, `toggle`, `tick`, `resetGame`) and after
  `catchGoldenButton`. Counter updates: `press` raises `crits` on a crit and `maxComboLevel` to the
  level after the press, `catchGoldenButton` raises `goldenCaught` (**trophy write only — the game
  save is not written, exactly as in Stage 3**), `resetGame` raises `resets`. The initial load
  evaluates with `silent: true` (D13). The game-save write policy of add-shop-v1 D11 is unchanged.
  The toast queue lives in module state next to the runtime and is published in the runtime
  snapshot; `tick` advances it with the elapsed ms.
- `components/GameScreen.tsx`: renders `<AchievementsPanel>` (button + dialog) in the top-right
  cluster, `<AchievementToast>` from the runtime snapshot, and `<VideoDecorLayer videos={...}>`
  next to `<DecorLayer>`.
- Reserved rects for placement (decor **and** video, D5) are the add-upgrades-v2 D8 list plus
  `[data-testid="achievements"]` and every placed video rect.
- `components/BalanceCounter.tsx`'s pre-paint script accepts save versions 1…4.

### D22. Test ids and keyframes (owners: ui-frontend, fx-animations)

| Element | Test id / hook | Notes |
|---|---|---|
| Cat SVG | `cat-svg` + the 8 part ids of D15 | inside `[data-testid="decor-sleeping-cat"]` |
| Video root | `<videoId>` (e.g. `video-runner`) | `role="group"`, `data-video-state`, `position: fixed` |
| Video frame | `video-frame` (scoped inside the root) | the `<iframe>` itself |
| Video placeholder | `video-placeholder` (scoped) | own CSS art + `video.offline` text when offline |
| Video play button | `video-play` (scoped) | reduced motion only (D8) |
| Achievements button | `achievements` | top-right cluster |
| Achievements dialog | `achievements-dialog`, `achievements-close`, `achievements-count`, `achievements-list`, `achievement-<id>`, `achievement-progress-<id>` | D14 |
| Toast | `achievement-toast` | `role="status"`, keyframe `toast-in` |

New keyframes: `toast-in` (200 ms, translateY + opacity). Existing `cat-breathe`,
`cat-ear-twitch`, `cat-tail-sway` are kept and re-applied to the SVG parts. Videos have no
keyframes of their own (the content moves, the box does not).

## Risks / Trade-offs

- [Third-party embeds add a network dependency and a privacy surface] → `youtube-nocookie` host,
  `referrerpolicy`, no cookies of our own, lazy mount, graceful offline placeholder, and tests that
  never touch the network (D9). The human accepted the brief reversal (D2).
- [Placeholder video ids ship broken until the human supplies real ones] → every unreplaced id
  simply ends in the `offline` placeholder; task 0.1 blocks the green phase until they are given.
- [A second storage key can drift from the save] → the trophy file holds only sticky ids and four
  counters; every state-derived metric is recomputed from the current save on each evaluation, so a
  missing or corrupted trophy file costs at most the four counters (D12).
- [Clearing the trophy file by hand looks like cheating in reverse] → accepted; the next evaluation
  re-unlocks everything the current state still satisfies.
- [The fixed-point achievement evaluation could loop] → bounded by `ACHIEVEMENTS.length` passes and
  unit-tested with the worst case (29 unlocking the 30th).
- [Colour assertions in e2e are brittle] → they assert ratios and inequalities computed by a
  unit-tested module, never exact strings.
- [Up to three iframes still cost CPU] → superseded on 2026-09-25 by D23: every placed video may mount, still muted, `loading="lazy"`, `IntersectionObserver` gating, no autoplay under reduced motion.

## D23. Follow-up confirmed 2026-09-25

The human replaced the placeholder catalog, dropped the three-frame cap, enlarged the frames, and required that video boxes do not overlap.

- `VIDEO_DECOR` is eleven entries. Internal ids stay (`video-runner` … `video-rain`, plus `video-seal`) so old saves keep their slots. `videoId` values are the human's list, in order: `vTfD20dbxho`, `VahKXgW2nXc`, `ZnC9zqn9rBY`, `f1-2xRx2gnE`, `-MJi7T4lX80`, `AKeUssuu3Is`, `1cmsiBKoLtE`, `uJaqnJ6-xfY`, `1MGlTgSnsE4`, `n_Dv4JMiwK8`, `h9uFQv3t1AU`.
- Prices of the first ten stay as in D4. `video-seal` costs 60 000 and appears at 36 000 (`0.6 × price`). `videos-all` threshold is 11.
- `VIDEO_SIZE` is `{ width: 384, height: 216 }`. `MAX_ACTIVE_VIDEOS` is removed. `getActiveVideos` returns every entry whose position is not null.
- `separatePlacedVideos(videos, viewport)` returns a new list. The first placed video keeps its position. Each later placed video is shifted, in 8 px steps, until its `VIDEO_SIZE` box does not strictly overlap an earlier placed box or the viewport edge. A `null` position stays `null`. The input is not mutated. Rendering and the next purchase both use this list, so a buy cannot land on a box that was only moved on screen.
- The achievements dialog closes from a cross button (`data-testid="achievements-close"`, accessible name still `achievements.close`). An unlocked row is green (`data-unlocked="true"`) and shows a check. Each achievement has its own icon.

## D24. Catalog swap confirmed 2026-09-25

The human removed Best clips, NFL highlights, and Fireplace (NFL blocks the embed; the other two sat on top of a playing frame) and added three Clair Obscur videos. Count stays 11. `videos-all` stays 11.

| Order | Id | videoId | Price | Appears at | uk | en |
|---|---|---|---|---|---|---|
| 1 | `video-music` | `wTRRKguilmY` | 2 500 | 1 500 | Музика Експедиції | Expedition music |
| 2–7 | `video-runner` … `video-hydraulic` | unchanged | unchanged | unchanged | unchanged | unchanged |
| 8 | `video-trailer` | `2VaLOc1FpSo` | 25 000 | 15 000 | Трейлер Експедиції 33 | Expedition 33 trailer |
| 9 | `video-combat` | `nLdRv_N3y00` | 30 000 | 18 000 | Бій Експедиції 33 | Expedition 33 combat |
| 10 | `video-rain` | `n_Dv4JMiwK8` | 50 000 | 30 000 | unchanged | unchanged |
| 11 | `video-seal` | `h9uFQv3t1AU` | 60 000 | 36 000 | unchanged | unchanged |

`video-music` is the cheapest video. Descriptions: «Тиха музика табору» / «Quiet camp music»; «Трейлер запуску гри» / «The game's launch trailer»; «Посібник з бою для новачків» / «A beginner's combat guide». `video-marble`, `video-aquarium`, and `video-fireplace` leave the catalog and the id union. A save that still names them drops those entries on load.

## D25. Expedition music is audible

Confirmed 2026-09-25. Every other video stays `mute=1`. `video-music` keeps `mute=1` in the URL so the browser allows autoplay, and adds `enablejsapi=1`. Once the frame is playing, the page posts `unMute` and `playVideo` to that frame, and repeats them on the next pointer. Reduced motion still waits for the play button before the frame mounts.

## Migration Plan

`MIGRATIONS = { 1: migrateV1ToV2, 2: migrateV2ToV3, 3: migrateV3ToV4 }`,
`CURRENT_SAVE_VERSION = 4`. A v3 save keeps everything and gains `videos: []`; v1 / v2 saves run the
whole chain. Status `migrated`; storage is rewritten as v4 on the next save. Rollback: see D11.

The trophy file needs no migration: `dopamine-clicker:trophies` simply does not exist for existing
players, so `loadTrophies` returns `{ trophies: T0, status: "fresh" }` and the first silent
evaluation fills it from the loaded save — a long-time player finds their trophies already unlocked,
without a toast storm (D13).
