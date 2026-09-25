# Proposal: add-content-v3 (Stage 4 "Content", revived with a new scope)

## Why

Stage 4 was **dropped on 2026-09-20** (`docs/project-brief.md` line 158: the project was to end with
Stage 3). The human revived it on the same day with a **different scope**: not "the remaining skins,
sound packs and decor" from the original plan, but three reported defects in what already ships,
plus two new content features the owner wants for personal use.

The five items come directly from the human:

1. The **sleeping cat** decor does not read as a cat — the CSS boxes look like a grey blob.
2. The **Soft shadow** skin is invisible in dark mode (a black shadow on a `#0a0a0a` page).
3. The **Floating +N** is unreadable: it uses `text-accent`, exactly the colour of the button it
   spawns over, so it looks like it sits under the button.
4. A new **video decor** category: ~10 long-form ambient videos (endless-runner gameplay, soap /
   sand cutting loops, fireplace, rain) embedded as third-party iframes.
5. **Achievements**: 30 of them, a panel listing all of them, and a toast when one unlocks.

Status: all decisions confirmed by the human on 2026-09-20, with one change — the achievements do
not live in the game save but in their own `dopamine-clicker:trophies` key (design D12), so reset
keeps behaving exactly as it does today. Still pending: the ten real video ids (design D3).

Item 4 is a **deliberate reversal of a non-goal in the brief**. `docs/project-brief.md` currently
says: "No third-party videos or copyrighted footage (no Subway Surfers / Minecraft gameplay, no
YouTube embeds). All decorations are our own CSS / SVG / canvas animations." The human asked for
YouTube-style embeds anyway, for their own personal build. This change therefore updates the brief:
the non-goal is narrowed to "we ship no copyrighted footage ourselves; the video decor category
embeds third-party players the owner configures", and the delivery plan line 158 is rewritten from
"dropped" to "revived with the scope below". Both edits are tasks in `tasks.md`, not side effects.

## What Changes

- **Sleeping cat art** (`page-decor`): replaced by one inline SVG with a recognizable silhouette —
  curled body, head with two ears, closed eyes, nose, tail curling in front. The parts carry stable
  test ids and must satisfy geometric invariants (head above and right of the body centre, ears
  above the head, tail reaching past the body on the other side), so "looks like a cat" is checked
  as structure, not as taste. Breathing and ear twitch are preserved; a human visual check closes
  the loop.
- **Soft shadow in both themes** (`button-skins`, bug): the shadow moves to per-theme CSS custom
  properties — a dark drop shadow in light mode, a light/accent glow in dark mode. Acceptance is
  measurable: the computed `box-shadow` differs per theme, its colour alpha is ≥ 0.25, and the
  colour composited over the page background reaches a contrast ratio ≥ 2.0 against that
  background, in **both** themes.
- **Floating +N readability** (`button-skins`, bug): the number becomes a pill with an opaque
  background (`alpha ≥ 0.85`) and a text colour at contrast ≥ 4.5 against it, in both themes, and
  it is pinned above the button (`z-index: 60`, still portalled to `document.body` — kept
  deliberately, design D17). e2e checks computed colours, the contrast ratio, the z-index, the DOM
  order against the button and that the spawned box overlaps the button box.
- **Video decor** (new capability `video-decor`): 10 items in a new shop category `video`, each a
  third-party iframe. One module `lib/game/videos.ts` holds the swappable list (`id`, provider,
  video id) and builds the embed URL (privacy-friendly `www.youtube-nocookie.com`, `autoplay=1`,
  `mute=1`, `loop=1`, `playlist=<id>`, `controls=0`). Placement reuses `placeDecor` with the decor
  reserved rects and a saved position. The iframe is mounted lazily (only when placed, visible and
  among the first `MAX_ACTIVE_VIDEOS = 3`), with a graceful placeholder when there is no network or
  the frame does not load within 5 s. Under reduced motion nothing autoplays: the placeholder shows
  a play button. **e2e never loads a real third-party iframe** — every test installs a Playwright
  route stub for the embed host, and one test asserts that no unstubbed external request was made.
- **Achievements** (new capability `achievements`): 30 data-driven achievements in
  `lib/game/achievements.ts` (`metric` + `threshold`, evaluated to a fixed point from a pure
  `AchievementStats` built from the current `GameState` plus four lifetime counters). Unlocks are
  sticky. One toast per unlock with a queue (4 s each, 300 ms gap, never two at once, static under
  reduced motion) and a panel (`<dialog>`, labelled, focus on close, Escape) listing all 30 with
  locked / unlocked state and `current / goal` progress. Achievements are **cosmetic only** — they
  grant no clicks, no discount, nothing (design D10).
- **Trophy file** (design D12): the unlocked ids and the counters (`crits`, `goldenCaught`,
  `maxComboLevel`, `resets`) live in their **own** storage key `dopamine-clicker:trophies`
  (`{ version: 1, trophies: { unlocked, stats } }`, new pure module `lib/game/trophies.ts` with the
  same validation / corrupted-fallback rules as the save, including a `:trophies:bad` backup). They
  are **not** part of `GameState`, so "Reset progress" keeps emptying `dopamine-clicker:save`
  exactly as in Stages 1–3 — Stage 1–3 reset behaviour, copy and e2e expectations are untouched —
  while the trophy case survives the reset (`resets + 1`, the other counters back to 0, ids kept).
- **Save schema v4** with `migrateV3ToV4`, adding **one** field: `videos: []`. v1 and v2 saves
  migrate through the chain. The trophy file needs no migration: it simply does not exist yet for
  existing players, and the first (silent) evaluation fills it from the loaded save.
- **i18n**: 92 new keys, no changed value — 160 keys total.
- **Shared contract** `lib/game/types.ts` extended: video and achievement ids, v4 `GameState`
  (v3 + `videos`), `GameStateV3`, `Trophies` / `TrophyStats` / `TrophyFileV1` /
  `TrophiesLoadResult`, the `videos.ts` / `achievements.ts` / `trophies.ts` signatures and the new
  `lib/ui/contrast.ts` helpers used by the e2e colour assertions.

## Capabilities

### New Capabilities

- `video-decor`: the 10-item video catalog, the embed URL builder, lazy iframe mounting, the
  offline placeholder, the 3-iframe cap and the e2e stubbing rule.
- `achievements`: the 30 definitions, the pure stats derivation and fixed-point evaluation, the
  sticky unlocked set in the trophy file, the toast queue and the achievements panel.

### Modified Capabilities

- `page-decor`: sleeping-cat SVG structure (ADDED); placement reserved rects gain the achievements
  button and every placed video (MODIFIED).
- `button-skins`: Soft shadow per theme and readable Floating +N (MODIFIED "Skin visuals").
- `shop`: catalog of 29 items with the new `video-decor` kind and `video` category, reveal, buying
  and shop UI for videos (MODIFIED).
- `game-persistence`: save version 4 with `videos`, v4 validation, `migrateV3ToV4`, the trophy file
  format / validation / corrupted fallback and "reset keeps the trophies" (ADDED + MODIFIED).
- `clicker-core`: v4 initial state (MODIFIED).
- `localization`: 160 keys (MODIFIED).
- `reduced-motion`: Stage 4 effects — toast, cat SVG, video autoplay (ADDED).

## Impact

- New: `lib/game/videos.ts`, `lib/game/achievements.ts`, `lib/game/trophies.ts`,
  `lib/ui/contrast.ts` (+ tests), `components/{AchievementsPanel,AchievementToast,
  VideoDecorLayer}.tsx`, `e2e/add-content-v3.spec.ts`.
- Changed: `lib/game/types.ts` (contract), `lib/game/{state,save,shop}.ts`,
  `lib/i18n/dictionaries.ts`, `components/{game-store,GameScreen,MainButton,DecorLayer,
  ShopBox,BalanceCounter}.tsx?`, `app/globals.css`, `docs/project-brief.md` (non-goals + delivery
  plan line 158).
- Existing Stage 1–3 tests that pin the v3 schema, the 19-item catalog or the 68-key dictionary are
  rewritten in this change's red commit (design D20); reset behaviour, reset copy and every "save is
  null after reset" expectation stay as they are. `add-upgrades-v2` is archived, so its lock is
  released.
- No new dependencies, no config changes, no API routes. One new outbound network dependency in
  production (the embed host) — never contacted from tests.

## Out of scope (later or never)

The original Stage 4 content list stays out: Ripple, Neon glow, Gradient border, Particle burst,
Rainbow, Cursor trail, Frosted glass, 8-bit pixel and Lava skins; sound packs and the sound slot;
the ten remaining own-art decor items (Newton's cradle, bubble wrap, aquarium, fireplace, rainy
window, kinetic sand, domino, DVD logo, marble run, pixel runner); hiding or re-rolling decor;
offline progress; achievement rewards of any kind; a server, accounts or leaderboards.
