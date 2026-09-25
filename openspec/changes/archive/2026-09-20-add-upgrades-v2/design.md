# Design: add-upgrades-v2

## Context

Stages 1–2 are implemented and archived (`openspec/specs/{clicker-core,game-persistence,
localization,reduced-motion,theme,shop,button-skins,page-decor,click-upgrades,helpers}`). Code:
pure logic in `lib/game/{click-value,state,save,preferences,shop,skins,helpers,decor}.ts`,
dictionaries in `lib/i18n/`, a thin client UI in `components/` where `game-store.ts` holds the saved
game as an external store (`commitGame` persists + publishes, `buy`, `toggle`, `tick`, `resetGame`)
and the helper carry in module state. `GameScreen` runs one 100 ms interval (`HELPER_TICK_MS`) and
calls `clickMainButton(state, getClickModifiers(state))` on every press. Save version 2,
`MIGRATIONS = { 1: migrateV1ToV2 }`.

Contract: `lib/game/types.ts` (extended by this change; types only). Stryker mutates
`lib/**/*.ts` except tests and `types.ts`; threshold 70 %.

Notation used in all spec deltas of this change:

- `FRESH` = `{ balance: 0, totalClicks: 0, ownedSkins: [], enabledSkins: [], material: "classic",
  decor: [], upgrades: [], helpers: { monkey: 0, robot: 0, factory: 0 }, levels: { crit: 0,
  "speed-monkey": 0, "speed-robot": 0, "speed-factory": 0 } }` (v3).
- `S({ ... })` = `FRESH` with the listed top-level fields replaced, **except `helpers` and
  `levels`, which are shallow-merged into their FRESH defaults**: `S({ helpers: { monkey: 2 } })`
  has `helpers: { monkey: 2, robot: 0, factory: 0 }`. (So Stage 2 scenario texts such as
  `S({ helpers: { monkey: 1 } })` keep their meaning.) Tests implement `S` exactly like that.
- `S2({ ... })` = the Stage 2 (v2) fresh payload `{ balance: 0, totalClicks: 0, ownedSkins: [],
  enabledSkins: [], material: "classic", decor: [], upgrades: [], helpers: { monkey: 0 } }` with the
  listed top-level fields replaced (no merging).
- `seq(a, b, ...)` = a scripted `RandomSource` that returns the given values in order and throws if
  called more times than values were given; it exposes its call count.
- `V2(x)` / `V3(x)` = the JSON string `{"version":2,"state":<x as JSON>}` /
  `{"version":3,"state":<x as JSON>}`. `RAW_V1(b, t)` = `{"version":1,"state":{"balance":b,"totalClicks":t}}`.
- `C(level, lastClickAt)` = the combo state `{ level, lastClickAt }`.
- `G(nextSpawnMs, visible, bonusMs)` = the golden state `{ nextSpawnMs, visible, bonusMs }`;
  `VIS(x, y, remainingMs)` = `{ position: { x, y }, remainingMs }`; `P` = the position
  `{ x: 0.5, y: 0.25 }`; `place(P)` = a stub `() => P` that counts its calls; `placeNull` = a stub
  `() => null` that counts its calls.
- e2e "the clock is paused" / "the clock runs N ms" as in add-shop-v1 design D20:
  `page.clock.install()` before the first load, `page.clock.pauseAt(...)` once the main button is
  enabled, then `page.clock.runFor(N)`. "the random hook is fixed to r" = `page.addInitScript`
  that sets `globalThis.__dcRandom = () => r` before any page script runs (D19).
- `pageRandom` = the page random source `() => (globalThis.__dcRandom ?? Math.random)()`, read at
  call time (D19). `R0` = `createClickRuntime()`.

## Goals / Non-Goals

**Goals:** pure, unit-tested and deterministic crit / combo / golden-button mechanics (injected
`RandomSource` and time values); a single press pipeline for the main button; Robot, Factory and
speed-ups on the existing helper tick; a real, tested v2 → v3 migration; stable test ids and
keyframe names for the required crit feedback.

**Non-Goals:** everything listed as out of scope in `proposal.md`.

## Decisions

All items marked **DECISION (confirmed)** were confirmed by the human on 2026-09-19 (task 0.1):
D1–D8, D10–D12, D15, D20, D21 as proposed, including the revealAt table and the timing numbers;
D9 was changed (fractional main-click carry instead of rounding). The open questions were
resolved as: test-only random hook (D19), shake on a dedicated layer (D12, D18), Ukrainian
percentages with a no-break space (D21), whole-save rejection kept (D15), ~75 s fake-clock runs
accepted (D19).

### D1. Crit, combo and golden bonus apply only to the main button — DECISION (confirmed)
Same rule as add-shop-v1 D2: helper income is never multiplied by combo, crit or the golden bonus.
The golden button itself is not a click: catching it adds nothing to `balance` or `totalClicks`.
Alternative: golden bonus also multiplies helper income (much stronger with factories).

### D2. Runtime vs persisted — DECISION (confirmed)
Persisted (save v3): `levels.crit`, `levels["speed-*"]`, `helpers.robot`, `helpers.factory`, and
"combo" / "golden-button" in `upgrades`. Runtime only (reset on reload and on reset): combo
state, golden-button state (spawn countdown, visible button, bonus timer), crit effect, helper
carry, main-click carry (D9). A reload during a ×7 bonus loses the bonus; the spawn countdown restarts with a new random
interval. Alternative: persist the bonus end time (needs timestamps, conflicts with add-shop-v1 D3).

### D3. One golden button at a time, no penalty for missing — DECISION (confirmed)
While a golden button is visible the spawn countdown is stopped (`nextSpawnMs = 0`). When it
expires or is caught, a new interval is rolled. Missing it has no effect beyond losing the chance.

### D4. Speed-ups: 3 levels per helper type — DECISION (confirmed)
`maxLevel = 3` for `speed-monkey`, `speed-robot`, `speed-factory` (rate ×2, ×4, ×8). Prices
`R(10 × helperBase × 5^level)`:

| Speed-up | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| `speed-monkey` | 500 | 2 500 | 12 500 |
| `speed-robot` | 10 000 | 50 000 | 250 000 |
| `speed-factory` | 120 000 | 600 000 | 3 000 000 |

### D5. Speed-up revealed only when its helper is owned — DECISION (confirmed)
`isItemRevealed(state, "speed-<type>")` = `totalClicks >= revealAt && helpers[type] >= 1`.
Before that the item is `hidden` (not rendered), not `requires`. Helpers can only decrease through
reset, so a revealed speed-up stays revealed.

### D6. revealAt thresholds for the new items — DECISION (confirmed)
Same rule as add-shop-v1 D5 (≈ 50–75 % of the price, i.e. of the first level / base price).
Catalog order (display order and canonical order of `upgrades`) is: the Stage 2 skins and decor
unchanged, then `double-click`, `triple-click`, `crit`, `combo`, `golden-button`, `monkey`,
`speed-monkey`, `robot`, `speed-robot`, `factory`, `speed-factory` (each speed-up right after its
helper).

| # | Item (id) | Kind | Price | revealAt | Ratio |
|---|---|---|---|---|---|
| 11 | Crit (`crit`) | leveled-upgrade, maxLevel 3, priceGrowth 3 | 250 | 150 | 60 % |
| 12 | Combo (`combo`) | feature-upgrade | 400 | 250 | 62.5 % |
| 13 | Golden button (`golden-button`) | feature-upgrade | 1 000 | 700 | 70 % |
| 15 | Monkey speed-up (`speed-monkey`) | leveled-upgrade, helper monkey, priceGrowth 5 | 500 | 300 | 60 % (+ monkey ≥ 1) |
| 16 | Robot (`robot`) | helper, 5 clicks/s | base 1 000 | 600 | 60 % |
| 17 | Robot speed-up (`speed-robot`) | leveled-upgrade, helper robot, priceGrowth 5 | 10 000 | 6 000 | 60 % (+ robot ≥ 1) |
| 18 | Factory (`factory`) | helper, 40 clicks/s | base 12 000 | 8 000 | 66.7 % |
| 19 | Factory speed-up (`speed-factory`) | leveled-upgrade, helper factory, priceGrowth 5 | 120 000 | 75 000 | 62.5 % (+ factory ≥ 1) |

(#14 is the Monkey, unchanged: base 50, revealAt 30.) Helper price curves with the D6 rule:
Robot 1 000, 1 150, 1 323, 1 521, 1 749, 2 011 (owned 0–5), 4 046 (owned 10); Factory 12 000,
13 800, 15 870, 18 251, 20 988, 24 136 (owned 0–5), 48 547 (owned 10). Crit 250, 750, 2 250.

### D7. Combo timing — DECISION (confirmed)
Constants in `lib/game/combo.ts`:

| Constant | Value | Meaning |
|---|---|---|
| `COMBO_WINDOW_MS` | 500 | a press ≤ 500 ms after the previous one is "fast" (≥ 2 presses/s keeps the combo) |
| `COMBO_STEP` | 0.1 | each fast press adds one level = +0.1 to the multiplier |
| `COMBO_MAX_LEVEL` | 10 | multiplier cap `1 + 10 × 0.1 = 2` |
| `COMBO_DECAY_MS` | 250 | after the window, one level is lost per started 250 ms of pause |

Multiplier `= 1 + level / 10` (computed as a division, not `level × 0.1`, so level 3 is exactly
`1.3`). From ×1, 10 fast presses reach ×2 (11 presses in total). From ×2 the first level is lost
right after the 500 ms window and the last one once the pause exceeds `500 + 9 × 250 = 2 750 ms`. A slow press (> 500 ms) does not reset the combo; it keeps the
decayed level and does not add one. The press uses the level **after** registering itself (the
press that builds the combo already benefits). The clock value is injected (`nowMs`, UI:
`performance.now()`); timestamps going backwards count as idle 0.

### D8. Golden-button timing and placement — DECISION (confirmed)
Constants in `lib/game/golden.ts`:

| Constant | Value |
|---|---|
| `GOLDEN_MIN_INTERVAL_MS` / `GOLDEN_MAX_INTERVAL_MS` | 30 000 / 90 000 (uniform integer, `min + floor(r × 60 001)`) |
| `GOLDEN_LIFETIME_MS` | 5 000 |
| `GOLDEN_BONUS` | 7 |
| `GOLDEN_BONUS_MS` | 30 000 |
| `GOLDEN_SIZE` | 64 × 64 CSS px |

Examples: r = 0 → 30 000, 0.25 → 45 000, 0.5 → 60 000, 0.75 → 75 000, 0.999999 → 90 000.

The countdown, lifetime and bonus advance only on game ticks, with the same clamp as helpers
(`[0, MAX_TICK_MS = 1000]`, NaN / negative → 0), so a throttled background tab loses time instead of
spawning or expiring in bursts. `tickGolden` order within one tick: (1) `bonusMs = max(0, bonusMs −
e)`; (2) if a button is visible: `remainingMs − e`; ≤ 0 → it disappears and a new interval is
rolled (1 random call), else it stays with the new remaining time; (3) otherwise `nextSpawnMs − e`;
≤ 0 → `place()` is called once: a position spawns `{ position, remainingMs: GOLDEN_LIFETIME_MS }`
with `nextSpawnMs = 0`, `null` skips this spawn and rolls a new interval (1 random call); > 0 → just
counts down. Leftover time is not carried into the next phase. With effective elapsed 0 the input
object is returned.

Placement (UI): `placeDecor({ viewport, size: GOLDEN_SIZE, reserved, random: pageRandom })` with
the default margin 16 / gap 16 / 50 attempts, where `reserved` = the add-shop-v1 D10 list (main
button, balance area, shop at max height, both switchers, helper zone, reset) **plus** the
click-status slot (D13) and every placed decor rect (`decorRect` or dock rect). At 1280 × 720 with
the random hook fixed to 0.75 the first candidate is left 904, top 484 (free), so the button renders at
x 904, y 484. Creation: when "golden-button" is bought, `runtime.golden = createGoldenState(random)`
immediately (so e2e timing starts at the click); for a loaded save that already owns it, on the
first tick where `runtime.golden === null` (that tick only creates, it does not count down).

### D9. Exact click values with a fractional main-click carry — DECISION (confirmed, changed by human)
Combo multipliers are fractional (1.1 … 1.9), but the balance must stay a safe integer. The click
value is NOT rounded: `getClickValue(m) = Number((1 × m.multiplier × m.combo × (m.crit ? 10 : 1) ×
m.goldenBonus).toFixed(6))` — the exact product, with the 6-decimal normalisation of add-shop-v1 D6
only to remove float artefacts (3 × 1.1 → 3.3, not 3.3000000000000003; 3 × 1.4 × 10 → 42, not
41.99999999999999). Whole clicks are credited like the helper carry:
`creditClick(carry, value)`: `total = Number((carry + value).toFixed(6))`,
`credited = Math.floor(total)`, `carry' = Number((total − credited).toFixed(6))` (so `0.7 + 0.3`
credits 1 with carry 0). `pressMainButton` takes `carry` in and returns `carry`, `value` and
`credited`; the balance grows by `credited`, `totalClicks` by exactly 1 per press. The carry is
runtime-only (module state in `game-store`, never saved, 0 after load and after reset), like the
combo. Examples: combo ×1.3 with multiplier 1 over 4 presses credits 1, 1, 1, 2 (carries 0.3, 0.6,
0.9, 0.2); 11 fast presses from ×1 to ×2 (values 1.0 … 2.0, sum 16.5) credit 1, 1, 1, 1, 2, 1, 2, 1,
2, 2, 2 = 16 with carry 0.5. Crit and golden products that are integers stay exact integers.
`clickMainButton(state, modifiers)` stays as the carry-free form (adds `Math.floor(value)`); the UI
never uses it directly.

### D10. Crit levels and price — DECISION (confirmed)
`CRIT_CHANCE_BY_LEVEL = [0, 0.05, 0.10, 0.15]`, `CRIT_MULTIPLIER = 10`, `maxLevel = 3`, price
`R(250 × 3^level)` = 250, 750, 2 250 (the brief's "250, then × 3 per level"). Roll:
`random() < chance` (strict), so with level 1, `0.0499…` crits and `0.05` does not. Level 0 never
calls `random` (existing saves and e2e tests without crit consume no random values). The crit roll
happens on every press, independent of combo and golden bonus; the factors multiply.

### D11. Golden bonus is restarted, not stacked — DECISION (confirmed)
Catching a golden button while a bonus runs sets `bonusMs` back to 30 000 (not 60 000, not ×49).

### D12. Crit feedback copy and effect — DECISION (confirmed)
Crit text is localized: uk `КРИТ ×10!`, en `CRIT ×10!` (the brief quotes the English form; the UI
copy is Ukrainian by default). One effect instance at a time; a new crit during a running effect
restarts it. Durations: text 900 ms (`CRIT_FX_MS`), flash 400 ms, particles 700 ms, shake 300 ms.
The screen shake animates only a dedicated layer `[data-testid="shake-layer"]` that wraps the
balance counter, the main button (with its overlays) and the click-status slot; `<main>` and all
fixed-position UI (shop box, switchers, reset, helper zone, decor, golden button) never shake.
Because a transformed ancestor becomes the containing block of `position: fixed` descendants,
nothing inside the shake layer may be `position: fixed` (the floating +N and crit overlays use
`absolute` inside the layer, or are rendered outside it). Reduced motion (brief: "still reduced"):
the text and the flash overlay are still shown for 900 ms but static (`animation-name: none`); no
particles; no shake.

### D13. Click-status slot (owner: ui-frontend)
A fixed-size slot `[data-testid="click-status"]` (160 × 64 px) is always rendered right of the main
button (left = button right + 24 px, vertically centered on the button; at 1280 × 720 it is
`{ left: 744, top: 328, width: 160, height: 64 }`), positioned absolutely inside the button wrapper
so the button never moves. It contains the combo meter `[data-testid="combo"]` (only while combo
is owned and the displayed level > 0, text `combo.label` with the multiplier formatted by
`formatNumber` → uk `Комбо ×1,5`, en `Combo ×1.5`, attribute `data-combo-level`) and the bonus
timer `[data-testid="golden-bonus"]` (only while `bonusMs > 0`, text `golden.bonus` with
`seconds = Math.ceil(bonusMs / 1000)`). The slot is a reserved area for decor placement and
golden-button placement.

### D14. State shape v3 and module layout (owner: game-logic unless noted)
- `upgrades: UpgradeId[]` now also holds "combo" and "golden-button" (catalog order);
  `helpers: { monkey, robot, factory }`; new `levels: { crit, "speed-monkey", "speed-robot",
  "speed-factory" }`. New item kinds `feature-upgrade` and `leveled-upgrade`; new status `maxed`
  (priority: owned → maxed → hidden → requires → unaffordable → available).
- Files:

| File | Exports | Specs |
|---|---|---|
| `lib/game/crit.ts` (new) | `CRIT_MULTIPLIER = 10`, `CRIT_CHANCE_BY_LEVEL`, `getCritChance`, `rollCrit` | crit |
| `lib/game/combo.ts` (new) | `COMBO_WINDOW_MS`, `COMBO_STEP`, `COMBO_MAX_LEVEL`, `COMBO_DECAY_MS`, `createComboState`, `getComboLevel`, `getComboMultiplier`, `registerComboClick` | combo |
| `lib/game/golden.ts` (new) | `GOLDEN_*` constants, `rollGoldenInterval`, `createGoldenState`, `tickGolden`, `catchGolden`, `getGoldenBonus` | golden-button |
| `lib/game/press.ts` (new) | `createClickRuntime`, `pressMainButton` | click-upgrades |
| `lib/game/click-value.ts` | `getClickValue` (exact, D9), `creditClick`, `getClickModifiers(state, context?)` | clicker-core, click-upgrades |
| `lib/game/helpers.ts` | + `SPEED_UP_OF`, `getHelperRate`; `getHelperClicksPerSecond` with speed-ups | helpers |
| `lib/game/shop.ts` | 19-item `SHOP_CATALOG`, `getItemLevel`, reveal rule, prices, `maxed`, buying | shop |
| `lib/game/state.ts` | `createInitialState` returns v3 `FRESH` | clicker-core |
| `lib/game/save.ts` | `CURRENT_SAVE_VERSION = 3`, `MIGRATIONS = { 1: migrateV1ToV2, 2: migrateV2ToV3 }`, v3 serialize / validate | game-persistence |
| `lib/i18n/dictionaries.ts` (owner: i18n) | 24 new keys | localization |

Every function is exported as `export const name: <SignatureType> = ...`. `golden.ts` imports
`MAX_TICK_MS` from `helpers.ts`; `press.ts` may import from `crit`, `combo`, `golden`,
`click-value`, `state`; `shop.ts` must not import from `save.ts` or `press.ts` (no cycles).
`SPEED_UP_OF = { monkey: "speed-monkey", robot: "speed-robot", factory: "speed-factory" }`.

### D15. Strict v3 validation — DECISION (confirmed)
Extends add-shop-v1 D13. Additionally rejected: `helpers` missing any of monkey / robot / factory
or with a non-count value; `levels` not a non-array object, missing any of the four keys, or with a
value that is not an integer in `[0, 3]`; a speed-up level > 0 while that helper count is 0;
unknown ids in `upgrades` (e.g. `"crit"` — crit is a level, not an upgrade). Normalization as
before: arrays re-sorted to catalog order, unknown keys dropped at every level (including inside
`helpers` and `levels`).

### D16. Migration v2 → v3
`migrateV2ToV3(s)`: for a non-array object returns `{ balance, totalClicks, ownedSkins,
enabledSkins, material, decor, upgrades` copied as-is, `helpers: isRecord(s.helpers) ? { monkey:
s.helpers.monkey, robot: 0, factory: 0 } : s.helpers`, `levels: { crit: 0, "speed-monkey": 0,
"speed-robot": 0, "speed-factory": 0 } }` (other keys dropped, values not validated here); any
other input is returned unchanged so validation rejects it. v1 saves run v1 → v2 → v3. Loading
never rewrites storage; the next save writes v3. Rollback: a Stage 2 build treats a v3 save as a
future version → `corrupted`, backs it up to `dopamine-clicker:save:bad` and starts fresh.

### D17. Page wiring (owner: ui-frontend)
- `game-store.ts` keeps `runtime: ClickRuntime` and the main-click carry in module state next to
  the snapshot and the helper carry and exposes: `press(nowMs)` → calls `pressMainButton({ state,
  runtime, carry: clickCarry, nowMs, random: pageRandom })`, stores the runtime and carry,
  `commitGame`s the state (every press is a state change), returns the `PressResult`;
  `catchGoldenButton()` → `catchGolden(runtime.golden, pageRandom)` (runtime only,
  no save); `tick(elapsedMs, now, place)` → the Stage 2 helper tick plus golden creation / `tickGolden`
  when "golden-button" is owned, and publishes a runtime snapshot (including `now` for the combo
  meter) on every tick; `buy` creates the golden state right after a successful "golden-button"
  purchase; `resetGame` also resets `runtime = createClickRuntime()` and the main-click carry to 0.
- `pageRandom` lives in `components/page-random.ts` (`export const pageRandom: RandomSource = () =>
  (globalThis.__dcRandom ?? Math.random)()`); every random draw of the page goes through it (crit,
  golden interval, golden and decor placement). The hook is read at call time, never captured at
  module load, and is typed by the `declare global` in `lib/game/types.ts`. `lib/` never reads it.
- Runtime-only changes never write storage (save policy of add-shop-v1 D11 unchanged: at most one
  write per press / purchase / toggle / reset and per tick that adds ≥ 1 whole helper click).
- The pre-paint balance script in `BalanceCounter.tsx` accepts save versions 1, 2 and 3.

### D18. Screen elements, test ids and keyframes (owners: ui-frontend, fx-animations)

| Element | Test id / hook | Notes |
|---|---|---|
| Crit text | `crit-text` | text `crit.text`, above the button center, keyframe `crit-pop` (900 ms); `pointer-events: none` |
| Crit flash | `crit-flash` | gold overlay exactly over the main button, keyframe `crit-flash` (400 ms); rendered for 900 ms |
| Crit particles | `crit-particle` × 12 | inside `[data-testid="crit-burst"]`, gold, angles `i × 30°`, keyframe `crit-burst` (700 ms) |
| Screen shake | `shake-layer` | wraps only the balance area, main button wrapper and click-status slot (D12); keyframe `crit-shake` (300 ms, ≤ 6 px translate); `animation-name` is `none` before the first crit; `<main>` and fixed UI never get it |
| Click-status slot | `click-status` | D13 |
| Combo meter | `combo` | D13; `data-combo-level` = displayed level |
| Golden button | `golden-button` | `<button>`, `position: fixed` at `decorRect(position, GOLDEN_SIZE, viewport)`, `aria-label` `golden.catch`, z-index above decor; the pulse keyframe `golden-pulse` runs on an inner element only, never on the button itself (an animated root never becomes "stable" for Playwright, see add-shop-v1 task 3.6) |
| Golden bonus | `golden-bonus` | D13 |
| Robot / Factory | `helper-robot`, `helper-robot-count`, `helper-factory`, `helper-factory-count` | same pattern as the monkey (`role="img"`, `aria-label` from `helper.<id>.label`, count `×N`), inner press keyframes `robot-press`, `factory-press` |
| Leveled upgrade labels | `shop-level-<id>` (`shop.level`, shown when level ≥ 1), `shop-maxed-<id>` (`shop.maxed`, replaces the buy button at max level) | |
| Helper count | `shop-count-<id>` | now also for robot / factory |

All crit effect elements are `aria-hidden="true"` and `pointer-events: none`; the crit is also
reflected on the main button as `data-crit="true"` while the effect runs (removed afterwards).

### D19. E2E determinism and the test-only random hook (owner: e2e-qa, ui-frontend)
- Randomness: the page draws every random number from `pageRandom` = `globalThis.__dcRandom ??
  Math.random` (read at call time). e2e sets `globalThis.__dcRandom = () => r` with
  `page.addInitScript` before the first load (a constant); `Math.random` itself is never
  overridden, so framework code is unaffected. 0.01 → every roll crits (0.01 < 0.05); 0.99 → never
  crits; 0.75 → golden interval 75 000 ms and first placement candidate (904, 484). Unset in
  production: behaviour is plain `Math.random`.
- Time: `page.clock` exactly as add-shop-v1 D20. Combo and golden scenarios buy / press only after
  the clock is paused, so tick counts are exact (a paused clock fires exactly one 100 ms tick per
  100 ms run). Golden scenarios run ~75 000 ms of fake-clock ticks (≈ 750 ticks); accepted by the
  human.
- Seeding: `seedStorage` guard reused; Stage 3 scenarios seed `V3(S(...))`.

### D20. Stage 1–2 tests updated in the red commit — DECISION (confirmed)
Tests that pin the v2 schema, the 11-item catalog or the 44-key dictionary are rewritten to the
MODIFIED scenarios in the red commit (as add-shop-v1 D19 did):
`lib/game/state.test.ts`, `lib/game/save.test.ts`, `lib/game/shop.test.ts`,
`lib/game/helpers.test.ts`, `lib/game/click-value.test.ts`, `lib/game/skins.test.ts` (fixture `S()`
only), `lib/i18n/i18n.test.ts`, `components/game-store.test.ts`, `components/game-store.shop.test.ts`,
`components/ShopBox.test.tsx` (fixtures only); in `e2e/add-foundation.spec.ts` only the expected
envelopes of "Corrupted save in the browser" and "Reload keeps balance"; in
`e2e/add-shop-v1.spec.ts` only "All items at 750 clicks", "One click short of the press",
"Buying a skin through the UI", "No catch-up for closed time" and "Stage 1 player continues in
Stage 2". `add-shop-v1` is archived, so its lock is released; they become locked under
`add-upgrades-v2` by the red commit.

### D21. Copy (owner: i18n) — DECISION (confirmed)
All new strings are listed in the localization delta. Item names/descriptions use
`item.<id>.name` / `item.<id>.description`. Ukrainian apostrophe is U+2019. Multipliers in
`combo.label` are interpolated already formatted with `formatNumber` (uk `1,5`, en `1.5`).
Ukrainian percentages use a no-break space U+00A0 between number and sign (`5 %`); English `5%`.

## Risks / Trade-offs

- [A test-only global in production code] → it is only read, never set, by the app; unset it is
  exactly `Math.random`.
- [`transform` on the shake layer makes it the containing block of fixed descendants] → nothing
  inside the layer is `position: fixed` (D12); e2e checks that shop, reset and helper boxes do not
  move during a shake.
- [75 000 ms of fake-clock ticks in e2e is slow] → accepted (≈ 750 ticks per golden spawn).
- [Main-click carry is lost on reload] → at most 0.999999 of a click; accepted like the helper carry.
- [Strict validation drops a save with one bad level] → confirmed; backup key keeps the raw value.
- [Factories × speed-ups reach 320 clicks/s per factory] → integer milli-click math stays exact;
  balances stay far below `Number.MAX_SAFE_INTEGER` for any realistic session.

## Migration Plan

`MIGRATIONS = { 1: migrateV1ToV2, 2: migrateV2ToV3 }`, `CURRENT_SAVE_VERSION = 3`. A v2 save keeps
everything and gets `helpers.robot = 0`, `helpers.factory = 0` and all levels 0; a v1 save is
migrated twice. Status `migrated`; storage is rewritten as v3 on the next save. Rollback: see D16.
