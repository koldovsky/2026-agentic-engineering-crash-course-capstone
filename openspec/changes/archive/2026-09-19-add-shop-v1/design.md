# Design: add-shop-v1

## Context

Stage 1 is implemented and archived (`openspec/specs/{clicker-core,game-persistence,localization,
reduced-motion,theme}`). Code: pure logic in `lib/game/{click-value,state,save,preferences}.ts`,
dictionaries in `lib/i18n/`, a thin client UI in `components/` where `game-store.ts` exposes the
saved game as an external store (`useSyncExternalStore`, `commitGame` persists + publishes).
`GameState` is `{ balance, totalClicks }`, save version 1, built-in migration table empty.

Contract: `lib/game/types.ts` (extended by this change; types only). Stryker mutates
`lib/**/*.ts` except tests and `types.ts`; threshold 70 %.

Notation used in all spec deltas of this change:

- `FRESH` = `{ balance: 0, totalClicks: 0, ownedSkins: [], enabledSkins: [], material: "classic",
  decor: [], upgrades: [], helpers: { monkey: 0 } }`.
- `S({ ... })` = `FRESH` with the listed top-level fields replaced (e.g. `S({ balance: 20,
  totalClicks: 12 })`).
- `seq(a, b, ...)` = a scripted `RandomSource` that returns the given values in order and throws if
  called more times than values were given (so tests also pin how many values are consumed).
- `V2(S(...))` = the JSON string `{"version":2,"state":<S(...) as JSON>}` used to seed e2e storage.

## Goals / Non-Goals

**Goals:** a complete, pure and unit-tested economy for the Stage 2 items; deterministic decor
placement; a single fractional-safe helper tick; a real, tested v1 → v2 migration; stable test ids.

**Non-Goals:** everything listed as out of scope in `proposal.md`.

## Decisions

All items marked **DECISION** were confirmed by the human on 2026-09-19 (task 0.1), D6 with the
change described below. Also confirmed: the reset button is a decor-reserved area (D10), and
overlaps after a large resize are accepted for Stage 2 (revisit in Stage 4, D9).

### D1. Helper clicks count toward totalClicks — DECISION (confirmed)
Each whole helper click adds 1 to both `balance` and `totalClicks`. Keeps reveals flowing for idle
players. Alternative: helpers add only balance (reveals would stall while idling).

### D2. Click multipliers apply only to the main button — DECISION (confirmed)
×2 / ×3 multiply main-button clicks only; a monkey always yields exactly 1 click per second.
Alternative: multiply helper income too (makes Triple ≈ 3× all income; stronger snowball).

### D3. No offline progress; tick elapsed is clamped — DECISION (confirmed)
Helpers earn only while the page runs its tick. Nothing time-related is saved (no timestamps), so
a reload never catches up. `tickHelpers` clamps `elapsedMs` to `[0, MAX_TICK_MS = 1000]`, so a
throttled background tab or a sleeping laptop loses time instead of receiving a burst.

### D4. Decor cannot be hidden or re-rolled in Stage 2 — DECISION (confirmed)
Once bought, a decor item stays at its saved position until reset. Hide/re-roll is deferred to
Stage 4 (the state shape `PlacedDecor` leaves room for a `hidden` flag later via a migration).

### D5. revealAt thresholds — DECISION (confirmed)
Rule of thumb: an item is revealed at roughly 50–75 % of its price, so it appears just before it
becomes affordable (always a "next goal"); the first item is revealed together with the shop.

| Item (id) | Category | Price | revealAt |
|---|---|---|---|
| Soft shadow (`soft-shadow`) | skins / stack | 15 | 10 |
| Squish (`squish`) | skins / stack | 25 | 15 |
| Floating +N (`floating-number`) | skins / stack | 30 | 20 |
| Jumping cap (`jumping-cap`) | skins / stack | 50 | 35 |
| Gold (`gold`) | skins / material | 500 | 300 |
| Sleeping cat (`sleeping-cat`) | decor | 100 | 75 |
| Lava lamp (`lava-lamp`) | decor | 200 | 150 |
| Hydraulic press (`hydraulic-press`) | decor | 1 500 | 750 |
| Double click (`double-click`) | upgrades | 100 | 60 |
| Triple click (`triple-click`) | upgrades | 500 | 250 |
| Monkey (`monkey`) | upgrades / helper | base 50 | 30 |

The table order is `SHOP_CATALOG` order: display order in the shop and canonical order of every
array in `GameState`.

### D6. Repeatable price rounding — DECISION (confirmed, changed by human)
Prices round the mathematically intended value, not the floating-point artefact:

`price = Math.round(Number((base * PRICE_GROWTH ** owned).toFixed(6)))`, `PRICE_GROWTH = 1.15`.

Why: in IEEE doubles `50 * 1.15 ** 1 = 57.49999999999999`, so a plain `Math.round` gives 57 although
the intended value 57.5 rounds to **58**. Rounding to 6 decimals first (`toFixed(6)` →
`"57.500000"`) removes the representation error (which is ~1e-14 relative, far below 1e-6) while
never moving a genuinely non-half value across .5 for the price ranges of this game. Monkey
prices (base 50) for owned = 0…10: 50, **58**, 66, 76, 87, 101, 116, 133, 153, 176, 202. A unit
scenario pins owned = 1 → 58 as the rounding guard.

### D7. Purchase equips immediately — DECISION (confirmed)
Buying a stack skin adds it to `ownedSkins` and `enabledSkins`; buying Gold sets `material:
"gold"`. The player can toggle afterwards. Toggling Gold off returns to `"classic"`.

### D8. Triple click before Double — DECISION (confirmed)
Triple is revealed by its own `revealAt` (250) even without Double; it is then shown disabled with
"Потрібно: Подвійний клік" (status `requires`, which wins over `unaffordable`). After Triple is
bought, Double stays listed as "owned"; the multiplier is 3, not 6.

### D9. Decor positions, sizes and fallback — DECISION (confirmed)
- Position is the top-left corner as a fraction of the viewport (`x = left / vw`, `y = top / vh`),
  computed once at purchase and saved. On a different viewport the pixel rect is
  `left = clamp(round(x·vw), 0, vw − w)`, `top = clamp(round(y·vh), 0, vh − h)` (`decorRect`).
  No re-placement on resize, so overlaps are possible after a big resize (accepted for Stage 2).
- Fixed sizes: Sleeping cat 120 × 80, Lava lamp 64 × 144, Hydraulic press 144 × 144 (CSS px).
- Algorithm (`placeDecor`): `range_x = vw − 2·margin − w`, `range_y = vh − 2·margin − h`; if either
  is negative return `null` without calling `random`. For attempt 1…`maxAttempts`:
  `left = margin + Math.round(random() * range_x)`, then `top = margin + Math.round(random() *
  range_y)` (exactly two calls per attempt, x first). The candidate rect inflated by `gap` on every
  side must not overlap (strictly, `rectsOverlap`) any reserved rect; the first such candidate is
  returned as `{ x: left / vw, y: top / vh }`. After `maxAttempts` failures return `null`.
  Defaults: `DECOR_MARGIN = 16`, `DECOR_GAP = 16`, `DECOR_MAX_ATTEMPTS = 50`.
- `null` position: the item is still bought and rendered in a **fallback dock** fixed to the right
  edge (`right: 16px`), vertically centered, items stacked top-to-bottom in catalog order with an
  8 px gap.

### D10. Reserved areas passed to placement (owner: ui-frontend)
Measured with `getBoundingClientRect()` at purchase time: `[data-testid="main-button"]`, the
balance container (the reserved-height wrapper, not only the text), `[data-testid="shop"]` using
its **maximum** rect (left/top/width as rendered, height = `0.6 × vh`, so later reveals cannot grow
into a decor), the top-right switcher container, `[data-testid="helpers"]` (always rendered with
its fixed size, even when empty), `[data-testid="reset"]`, and every already placed decor
(`decorRect` of its saved position; fallback-dock items use their rendered rect). The UI passes
`Math.random`.

### D11. Save policy — DECISION (confirmed)
Every state change is saved immediately through `commitGame`: main click, purchase, skin toggle,
reset (clear), and each helper tick that adds ≥ 1 whole click (at most 10 writes/s). Ticks that add
nothing do not write. The save contains exactly the `GameState` fields (no timestamps, no carry).

### D12. Helper zone and monkey visual — DECISION (confirmed)
One element per helper type (not one per monkey): `[data-testid="helper-monkey"]` inside the fixed
bottom-left zone `[data-testid="helpers"]` (left 16 px, bottom 16 px, 288 × 96 px). It shows a
monkey (emoji or inline SVG) pressing a small button and the count `×N`
(`[data-testid="helper-monkey-count"]`). It is purely visual (no `<button>`, `role="img"`, localized
`aria-label`), so clicking it does nothing. The press animation retriggers on each tick that adds
whole monkey clicks.

### D13. Strict v2 validation — DECISION (confirmed)
`validateGameState` rejects unknown ids, duplicates, `enabledSkins` not ⊆ `ownedSkins` or
containing "gold", `material: "gold"` without Gold owned, Triple without Double, bad decor
positions, and bad helper counts (whole save → `corrupted`, raw kept in `dopamine-clicker:save:bad`).
It normalizes: arrays re-sorted into catalog order; unknown keys dropped at every level (top level,
`helpers`, decor entries, positions). Alternative (drop only the bad parts) is friendlier but
harder to reason about; revisit in Stage 4.

### D14. Module layout (owner: game-logic unless noted)

| File | Exports | Specs |
|---|---|---|
| `lib/game/shop.ts` (new) | `SHOP_CATALOG`, `SHOP_UNLOCK_CLICKS = 10`, `PRICE_GROWTH = 1.15`, `getShopItem`, `isShopVisible`, `isItemRevealed`, `getItemPrice`, `getItemStatus`, `getRevealedItems`, `buyItem` | shop |
| `lib/game/skins.ts` (new) | `toggleSkin`, `isSkinActive`, `getButtonAppearance` | button-skins |
| `lib/game/helpers.ts` (new) | `HELPER_TICK_MS = 100`, `MAX_TICK_MS = 1000`, `getHelperClicksPerSecond`, `tickHelpers` | helpers |
| `lib/game/decor.ts` (new) | `DECOR_MARGIN = 16`, `DECOR_GAP = 16`, `DECOR_MAX_ATTEMPTS = 50`, `rectsOverlap`, `placeDecor`, `decorRect` | page-decor |
| `lib/game/click-value.ts` | + `getClickMultiplier`, `getClickModifiers` | click-upgrades |
| `lib/game/state.ts` | `createInitialState` returns `FRESH`; `clickMainButton` copies all other fields | clicker-core |
| `lib/game/save.ts` | `CURRENT_SAVE_VERSION = 2`, `MIGRATIONS = { 1: migrateV1ToV2 }`, `migrateV1ToV2`, v2 `serializeGame` / `validateGameState` | game-persistence |
| `lib/i18n/dictionaries.ts` (owner: i18n) | new keys (see localization delta) | localization |

Every function is exported as `export const name: <SignatureType> = ...` using the types in
`lib/game/types.ts`. `shop.ts` must not import from `save.ts` (no cycles); `save.ts` may import
`SHOP_CATALOG` for validation order.

### D15. Screen layout and test ids (owner: ui-frontend)

| Element | Test id / hook | Placement (1280 × 720) |
|---|---|---|
| Shop box (`<section>`, `<h2>` "Магазин") | `shop` | fixed top-left: left 16, top 16, width 288, `max-height: 60vh`, internal scroll |
| Category heading | `shop-category-<skins\|decor\|upgrades>` | only when the category has a revealed item |
| Item row | `shop-item-<id>` | catalog order |
| Buy button | `shop-buy-<id>` | text `shop.buy` with formatted price; `disabled` when status ≠ available |
| Owned label | `shop-owned-<id>` | decor / click upgrades once owned (text `shop.owned`) |
| Requires label | `shop-requires-<id>` | status `requires` |
| Helper count | `shop-count-<id>` | text `shop.count` |
| Skin toggle | `skin-toggle-<id>` | replaces the buy button once owned; `aria-pressed`, text `skin.on` / `skin.off` |
| Main button hooks | `data-skins`, `data-material` on `main-button` | `data-skins` = enabled stack ids in catalog order joined by one space (`""` when none) |
| Floating +N | `floating-number` | one element per click, text `+{value}`, removed after its 800 ms animation |
| Jumping cap | `jumping-cap` | on top of the main button while enabled |
| Decor | `decor-<id>` | `position: fixed` at `decorRect` or the fallback dock; `role="img"`, `aria-label` = item name |
| Helper zone | `helpers` | fixed bottom-left 16/16, 288 × 96 |
| Monkey | `helper-monkey`, `helper-monkey-count` | inside `helpers` |

The main button and counter stay where Stage 1 put them; the shop box, helper zone and decor are
`position: fixed` so they never shift the centered column.

### D16. Game tick (owner: ui-frontend)
One `setInterval(HELPER_TICK_MS)` started after the save is loaded. Each tick computes
`elapsed = performance.now() − last`, sets `last = now`, calls
`tickHelpers(getSavedStateSnapshot(), carryRef.current, elapsed)` (always the latest snapshot, never
a stale closure), stores the new carry in a ref, and calls `commitGame` only when the returned
state is a different object. Reset sets the carry to 0. The interval is cleared on unmount.

### D17. Visual effects and keyframe names (owner: fx-animations)
Keyframe names are part of the e2e contract: `squish` (main button, retriggered per click),
`cap-hop` (jumping cap, retriggered per click), `float-up` (floating +N, 800 ms), `monkey-press`
(helper press). Retriggering keeps the animation class on the element after the animation ends, so
`getComputedStyle(el).animationName` stays the keyframe name between clicks. Soft shadow changes
`box-shadow` (default / hover / active); Gold changes `background` to a metallic gradient and
`data-material="gold"`. Decor animations are CSS/SVG only, `transform`/`opacity` only. Under
`prefers-reduced-motion: reduce` (and `[data-motion="reduced"]`): squish, cap-hop, monkey-press and
all decor animations get `animation: none`; floating +N elements are not rendered at all
(DECISION (confirmed); alternative was a static fade). Soft shadow and Gold are static and
stay.

### D18. Copy — DECISION (confirmed)
All new strings are listed in the localization delta. Item names/descriptions use
`item.<id>.name` / `item.<id>.description`. Ukrainian apostrophe is U+2019 (`М’яка тінь`). Prices
and counts are formatted with `formatNumber` before interpolation.

### D19. Stage 1 tests updated in the red commit — DECISION (confirmed)
Tests that pin the v1 schema / 11-key dictionary (`lib/game/state.test.ts`, `lib/game/save.test.ts`,
`lib/i18n/i18n.test.ts`, `components/game-store.test.ts`, and the "Corrupted save in the browser"
and "Reload keeps balance" tests in `e2e/add-foundation.spec.ts`) are rewritten to the MODIFIED
scenarios in the red commit. They are not locked today (add-foundation is archived) and become
locked under add-shop-v1 by that commit.

### D20. E2E determinism (owner: e2e-qa)
- Seeding: reuse the Stage 1 `seedStorage` guard (D12 of add-foundation), seeding `V2(S(...))`.
- Helper timing: `page.clock.install()` before `goto`; after the main button is enabled, pause the
  clock (`page.clock.pauseAt(...)`), do the purchase, then `page.clock.runFor(ms)`; with a paused
  clock exactly `ms / 100` ticks of 100 ms fire, so earnings are exact. If Playwright's clock turns
  out not to drive `performance.now()` in this setup, report it (do not loosen assertions silently).
- Decor overlap checks compare bounding boxes with a strict-overlap helper (touching is allowed).

## Risks / Trade-offs

- [Fractional positions + resize can overlap] → accepted for Stage 2; D9 clamps into the viewport.
- [Strict validation discards a save with one bad field] → backup key keeps the raw value.
- [10 writes/s to localStorage with many monkeys] → a v2 save is < 400 bytes; revisit with Robot /
  Factory in Stage 3 (throttle there).
- [Fake clock and React scheduling in e2e] → D20 fallback: report, do not weaken.
- [Pre-paint balance script only knew v1] → must accept versions 1 and 2 (task 3.x), otherwise the
  counter flashes 0 before hydration.

## Migration Plan

`MIGRATIONS[1] = migrateV1ToV2`: copies `balance` and `totalClicks`, adds `ownedSkins: []`,
`enabledSkins: []`, `material: "classic"`, `decor: []`, `upgrades: []`, `helpers: { monkey: 0 }`.
Loading a v1 save yields status `migrated`; the storage is rewritten as v2 on the next save.
Rollback: a Stage 1 build treats a v2 save as a future version → `corrupted`, backs it up to
`dopamine-clicker:save:bad` and starts fresh (no data loss beyond that).
