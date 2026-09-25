# Proposal: add-upgrades-v2 (Stage 3 "Upgrades v2")

## Why

Stage 2 (`add-shop-v1`, archived) gives a working shop with skins, decor, Double/Triple click and a
single idle helper. After about 1 500 clicks nothing new is left to aim for, and every click
feels the same. The brief's Stage 3 adds the "dopamine" part of the upgrade tree: random big
hits (Crit, with unmistakable visual feedback), a reason to click fast (Combo), a rare event to
catch (Golden button), and a longer idle curve (Robot, Factory, per-type speed-ups). It also needs
the second real save migration (v2 → v3).

## What Changes

- **Crit** (leveled upgrade, 3 levels): chance 5% → 10% → 15% (uk copy: `5 %` with a no-break space) that a main-button click counts
  ×10; price 250, 750, 2 250 (`250 × 3^level`). A crit is **required** to be unmistakable: big
  "КРИТ ×10!" / "CRIT ×10!" text popping from the button, a gold flash on the button, a burst of
  gold particles and a short shake of the button area (a dedicated layer with the counter, button and
  status slot; fixed UI such as the shop never shakes). Under `prefers-reduced-motion` the text and a static
  flash remain; particles and shake are dropped.
- **Combo** (one-time, 400): presses at most 500 ms apart raise a temporary multiplier by 0.1 per
  press, up to ×2; after 500 ms of pause it decays by 0.1 every 250 ms. A combo meter next to the
  button shows the current value.
- **Golden button** (one-time, 1 000): every 30–90 s (random) a 64 × 64 golden button appears at a
  random free spot for 5 s; catching it gives 30 s of click value ×7. One at a time, no penalty
  for missing it.
- **Robot** (base 1 000, 5 clicks/s) and **Factory** (base 12 000, 40 clicks/s) helpers with the
  existing `round(base × 1.15^owned)` price rule, shown in the helper zone next to the monkey.
- **Helper speed-ups** (leveled, 3 levels per helper type): each level doubles that type's rate;
  price `10 × helper base × 5^level` (monkey 500 / 2 500 / 12 500, robot 10 000 / 50 000 / 250 000,
  factory 120 000 / 600 000 / 3 000 000); revealed only once at least one helper of that type is
  owned.
- **Click value** is the exact real product `1 × multiplier × combo × (crit ? 10 : 1) × goldenBonus`
  (no rounding); whole clicks are credited through a runtime-only main-click carry (like the helper
  carry), so the balance stays an integer and `totalClicks` still grows by 1 per press. Crit, combo
  and golden bonus apply to the main button only. A pure `pressMainButton` pipeline (injected clock
  value, carry and `RandomSource`) replaces the direct `clickMainButton(state,
  getClickModifiers(state))` call in the UI.
- **Test-only random hook**: every random draw of the page uses `globalThis.__dcRandom ??
  Math.random` (read at call time), so e2e can fix randomness without overriding `Math.random`.
- **Helper income** becomes `Σ count(type) × rate(type) × 2^speedLevel(type)`.
- **Shop**: 8 new catalog items (19 total), a new `maxed` status and level labels for leveled
  upgrades.
- **Save schema v3** with a real built-in v2 → v3 migration (robots/factories 0, all levels 0);
  v1 saves migrate through v1 → v2 → v3. Combo and golden-button timers are runtime-only.
- **i18n**: 24 new keys in `uk` and `en` (68 total).
- **Reduced motion**: crit, golden button, robot/factory press animations respect it.
- **Shared contract** `lib/game/types.ts` extended (new ids, v3 `GameState`, crit / combo /
  golden / press signatures).

Out of scope (Stage 4 or later): the remaining skins (Ripple, Neon glow, Gradient border, Particle
burst, Rainbow, Cursor trail, Frosted glass, 8-bit pixel, Lava), sound packs and the sound slot,
the other ten decor items, hiding / re-rolling decor, offline progress, golden-button variants
(other bonuses), any `app/api` route, save-write throttling beyond the Stage 2 policy.

## Capabilities

### New Capabilities

- `crit`: crit chance per level, deterministic roll with injected `RandomSource`, the required
  crit visual feedback.
- `combo`: combo window / step / decay rules with an injected clock value, combo meter UI.
- `golden-button`: spawn interval, lifetime, placement avoiding reserved areas, catch and ×7
  bonus timer, all runtime-only and driven by the game tick.

### Modified Capabilities

- `clicker-core`: v3 initial state; exact click value and the main-click carry (`creditClick`).
- `click-upgrades`: `getClickModifiers(state, context?)`; new `pressMainButton` pipeline used by
  the UI.
- `helpers`: Robot and Factory, speed-ups in the income formula, per-type rate, helper zone with
  three helper types.
- `shop`: catalog of 19 items, reveal rule for speed-ups, prices of leveled upgrades, `maxed`
  status, buying levels and feature upgrades, level / max-level labels.
- `game-persistence`: save version 3, v3 validation, built-in v2 → v3 migration, runtime values
  never saved, reset also clears runtime.
- `localization`: dictionary key set extended to 68 keys.
- `reduced-motion`: new requirement for Stage 3 effects.
- `page-decor`: the new click-status slot is a reserved area for decor placement.

## Impact

- New: `lib/game/{crit,combo,golden,press}.ts` + tests, `e2e/add-upgrades-v2.spec.ts`, UI for the
  crit effect, combo meter, golden button and bonus timer, robot / factory helper visuals.
- Changed: `lib/game/types.ts` (contract), `lib/game/{state,save,click-value,shop,helpers}.ts`,
  `lib/i18n/dictionaries.ts`, `components/{GameScreen,MainButton,HelperZone,ShopBox,DecorLayer,
  BalanceCounter,game-store}.tsx?`, `app/globals.css`.
- Existing Stage 1–2 tests that pin the v2 schema, the 11-item catalog or the 44-key dictionary
  are rewritten in this change's red commit (design D20). `add-shop-v1` is archived, so its lock is
  released; from the red commit on they are locked under `add-upgrades-v2`.
- No new dependencies, no config changes, no API routes.
