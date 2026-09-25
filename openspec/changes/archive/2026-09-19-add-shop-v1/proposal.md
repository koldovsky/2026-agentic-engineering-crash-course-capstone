# Proposal: add-shop-v1 (Stage 2 "Shop v1")

## Why

Stage 1 (`add-foundation`, archived) gives a working clicker with nothing to spend clicks on. The
brief's core loop is "click → earn → buy something pleasant → click more", with "a steady trickle
of new things to unlock". Stage 2 delivers the first shop: a box that appears after 10 clicks,
items revealed progressively, five button skins, three page-decor animations, Double/Triple click
and the first idle helper (Monkey). It also forces the first real save-schema migration (v1 → v2),
which proves the migration hook built in Stage 1.

## What Changes

- **Shop box** (top-left) appears when `totalClicks >= 10`. Items are listed progressively by a
  per-item `revealAt` threshold on `totalClicks`; unaffordable items are shown disabled with their
  price; buying costs balance and never changes `totalClicks`.
- **Button skins**: Soft shadow (15), Squish (25), Floating +N (30), Jumping cap (50) in the
  stackable slot, each toggleable on/off after purchase; Gold (500) in the exclusive `material`
  slot (default Classic).
- **Page decor**: Sleeping cat (100), Lava lamp (200), Hydraulic press (1 500). On purchase each is
  placed at a random position that avoids the main button, counter, shop box, top-right switchers,
  helper zone, reset button and other decor. Placement is a pure function with an injected random
  source; the position is saved and does not jump on reload.
- **Click upgrades**: Double click (100, ×2) and Triple click (500, ×3, replaces ×2, requires Double).
  The main button now uses modifiers derived from state instead of the Stage 1 neutral constant.
- **Monkey helper**: price `round(50 × 1.15^owned)`, 1 click/s per monkey, shown as a small button
  in a bottom-left helper zone with the monkey pressing it. A single 100 ms game tick accumulates
  fractional clicks (integer milli-click carry).
- **Save schema v2** with a real built-in v1 → v2 migration: existing Stage 1 saves keep
  `balance` and `totalClicks` and get empty shop fields.
- **i18n**: all new copy in `uk` and `en` (shop, categories, item names/descriptions, helper label);
  the reset confirmation text now mentions purchases.
- **Reduced motion**: squish, cap hop, floating +N, decor animations and the monkey press are
  disabled under `prefers-reduced-motion`.
- **Shared contract** `lib/game/types.ts` extended (catalog ids, v2 `GameState`, shop/skins/helpers/
  decor function signatures, `RandomSource`).

Out of scope (later stages): Crit and its visual feedback, Combo, Golden button, Robot, Factory,
helper speed-ups (Stage 3); Ripple, Neon glow, Gradient border, Particle burst, Rainbow, Cursor
trail, Frosted glass, 8-bit pixel, Lava skins, sound packs and the sound slot, the other ten decor
items (Stage 4); hiding / re-rolling decor (deferred to Stage 4, see DECISION D4); offline progress;
any `app/api` route; shop collapse/expand.

## Capabilities

### New Capabilities

- `shop`: shop box visibility, item catalog, progressive reveal, prices (incl. repeatable price
  formula), item status, buying, shop UI and placement.
- `button-skins`: stack and material slots, toggle rules, main-button visuals for the five Stage 2
  skins.
- `page-decor`: random placement avoiding reserved areas (pure, injected RNG), saved positions,
  rendering of the three Stage 2 decor items.
- `click-upgrades`: Double / Triple click multiplier and its use by the main button.
- `helpers`: Monkey helper, helper income per second, game tick with fractional accumulation,
  helper zone UI, no offline progress.

### Modified Capabilities

- `clicker-core`: game state grows to the v2 shape; the click uses modifiers from state.
- `game-persistence`: save version 2, v2 validation, built-in v1 → v2 migration, what is saved and
  when, reset also wipes purchases.
- `localization`: dictionary key set extended; reset body copy changed.
- `reduced-motion`: new requirement covering Stage 2 effects.

## Impact

- New: `lib/game/{shop,skins,helpers,decor}.ts` + tests, `e2e/add-shop-v1.spec.ts`, client
  components for the shop box, skin visuals, decor, helper zone.
- Changed: `lib/game/types.ts` (contract), `lib/game/{state,save,click-value}.ts`,
  `lib/i18n/dictionaries.ts`, `components/GameScreen.tsx`, `components/MainButton.tsx`,
  `components/BalanceCounter.tsx` (pre-paint script accepts v1 and v2 envelopes),
  `components/game-store.ts`, `app/globals.css`.
- Existing Stage 1 tests that pin the v1 schema or the 11-key dictionary are updated in this
  change's red commit (`lib/game/state.test.ts`, `lib/game/save.test.ts`, `lib/i18n/i18n.test.ts`,
  `components/game-store.test.ts`, two tests in `e2e/add-foundation.spec.ts`). `add-foundation` is
  archived, so its lock is released; from the red commit on they are locked under `add-shop-v1`.
- No new dependencies, no config changes, no API routes.
