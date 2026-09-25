# Spec Delta: game-persistence

Stage 4 bumps the save schema to version 4 — one new field, `videos` — and adds a **second, separate
storage key** `dopamine-clicker:trophies` for the unlocked achievements and their four lifetime
counters (design D12). The game save therefore never holds trophies, and "Reset progress" keeps
emptying `dopamine-clicker:save` exactly as in Stages 1–3; it only rewrites the trophy file
(`resets + 1`, the other counters back to 0, unlocked ids kept).

Scenario tags: `[unit]` = Vitest test in `lib/game/save.test.ts` (save) or
`lib/game/trophies.test.ts` (trophy file), both with an in-memory `KeyValueStorage` fake,
`[e2e]` = Playwright test in `e2e/add-foundation.spec.ts` / `e2e/add-shop-v1.spec.ts` /
`e2e/add-upgrades-v2.spec.ts` (existing, with the listed envelopes updated) or
`e2e/add-content-v3.spec.ts` (noted as "new"). `FRESH`, `S({...})`, `S2({...})`, `S3({...})`, `L0`,
`ST0`, `T0`, `TR({...})`, `TF(...)`, `V2(...)`, `V3(...)`, `V4(...)` and `RAW_V1(...)` are defined
in `design.md`.

## MODIFIED Requirements

### Requirement: Versioned save format
The game state SHALL be stored under the key `dopamine-clicker:save` as JSON of the envelope
`{ "version": 4, "state": <GameState> }` where the state has exactly the keys `balance`,
`totalClicks`, `ownedSkins`, `enabledSkins`, `material`, `decor`, `videos`, `upgrades`, `helpers`,
`levels` (decor and video entries exactly `id`, `position`; positions exactly `x`, `y`; `helpers`
exactly `monkey`, `robot`, `factory`; `levels` exactly `crit`, `speed-monkey`, `speed-robot`,
`speed-factory`). `videos` is the only field v4 adds to v3 (DECISION (confirmed), design D11). No
timestamps or runtime values (helper carry, main-click carry, combo, golden button, bonus timer,
crit effect, toast queue) are written (DECISION (confirmed), add-upgrades-v2 design D2), and neither
are the trophies: unlocked achievements and their counters live in their own storage key (DECISION
(confirmed, changed by the human), design D12).

#### Scenario: Constants [unit]
- **WHEN** the constants are read
- **THEN** `SAVE_KEY` is `"dopamine-clicker:save"`, `SAVE_BACKUP_KEY` is `"dopamine-clicker:save:bad"` and `CURRENT_SAVE_VERSION` is `4`

#### Scenario: Serialize state [unit]
- **WHEN** the state `S({ balance: 12, totalClicks: 30 })` is serialized
- **THEN** `JSON.parse` of the result deep-equals `{ version: 4, state: S({ balance: 12, totalClicks: 30 }) }`

#### Scenario: Serialize writes only schema fields [unit]
- **WHEN** `{ ...S({ balance: 1, totalClicks: 1, decor: [{ id: "lava-lamp", position: { x: 0.5, y: 0.25 } }], videos: [{ id: "video-runner", position: null }] }), carry: 400, clickCarry: 0.5, savedAt: 123, combo: { level: 3, lastClickAt: 5 }, golden: { nextSpawnMs: 0, visible: null, bonusMs: 1000 }, toasts: { current: "first-click", remainingMs: 4000, pending: [] }, achievements: ["first-click"], stats: { ...ST0, crits: 9 }, helpers: { monkey: 1, robot: 2, factory: 3, extra: 4 }, levels: { ...L0, crit: 2, bonus: 1 } }` (cast to `GameState`) is serialized
- **THEN** `JSON.parse` of the result deep-equals `{ version: 4, state: S({ balance: 1, totalClicks: 1, decor: [{ id: "lava-lamp", position: { x: 0.5, y: 0.25 } }], videos: [{ id: "video-runner", position: null }], helpers: { monkey: 1, robot: 2, factory: 3 }, levels: { crit: 2 } }) }` (no `carry`, `clickCarry`, `savedAt`, `combo`, `golden`, `toasts`, `achievements`, `stats`, `extra` or `bonus`)

#### Scenario: Save writes to the save key [unit]
- **GIVEN** an empty in-memory storage
- **WHEN** the state `S({ balance: 5, totalClicks: 5 })` is saved
- **THEN** the save function returns `true`
- **AND** `storage.getItem("dopamine-clicker:save")` parsed deep-equals `{ version: 4, state: S({ balance: 5, totalClicks: 5 }) }`
- **AND** no other key is written

#### Scenario: Save survives a storage write error [unit]
- **GIVEN** a storage whose `setItem` throws `new Error("QuotaExceededError")`
- **WHEN** the state `S({ balance: 1, totalClicks: 1 })` is saved
- **THEN** the save function returns `false` and does not throw

#### Scenario: Round trip [unit]
- **GIVEN** an empty in-memory storage and `F = S({ balance: 1234, totalClicks: 90000, ownedSkins: ["soft-shadow", "squish", "floating-number", "jumping-cap", "gold"], enabledSkins: ["squish", "jumping-cap"], material: "gold", decor: [{ id: "sleeping-cat", position: { x: 0.125, y: 0.5 } }, { id: "lava-lamp", position: null }, { id: "hydraulic-press", position: { x: 0.75, y: 0.0625 } }], videos: [{ id: "video-runner", position: { x: 0.25, y: 0.75 } }, { id: "video-rain", position: null }], upgrades: ["double-click", "triple-click", "combo", "golden-button"], helpers: { monkey: 7, robot: 2, factory: 1 }, levels: { crit: 2, "speed-monkey": 3, "speed-robot": 1, "speed-factory": 0 } })`
- **WHEN** `F` is saved and then loaded
- **THEN** the load result is `{ state: F, status: "loaded" }`

### Requirement: State validation
A stored v4 state SHALL be accepted only if: it is a non-array object; `balance` and `totalClicks`
are non-negative safe integers; `ownedSkins` is an array of distinct `SkinId`s; `enabledSkins` is an
array of distinct `StackSkinId`s each contained in `ownedSkins`; `material` is `"classic"` or
`"gold"` and `"gold"` only if Gold is owned; `decor` is an array of objects with a distinct `DecorId`
`id` and a `position` that is `null` or an object with finite `x`, `y` in `[0, 1]`; `upgrades` is an
array of distinct `UpgradeId`s (`double-click`, `triple-click`, `combo`, `golden-button`) containing
`"triple-click"` only together with `"double-click"`; `helpers` is a non-array object whose
`monkey`, `robot` and `factory` are non-negative safe integers; `levels` is a non-array object whose
`crit`, `speed-monkey`, `speed-robot`, `speed-factory` are integers in `[0, 3]`, and a speed-up level
is > 0 only if its helper count is ≥ 1; `videos` is an array of objects with a distinct
`VideoDecorId` `id` and the same `position` rule as `decor`. The result SHALL be a normalized copy:
every array re-sorted into catalog order and unknown keys dropped at every level (so a v4 save that
still carries a Stage 4 draft's `achievements` or `stats` key simply loses it). Anything else SHALL
be rejected (`null`) (DECISION (confirmed), add-shop-v1 design D13; DECISION (confirmed),
add-upgrades-v2 design D15; DECISION (confirmed), design D11).

#### Scenario: Valid state accepted [unit]
- **WHEN** `FRESH` is validated
- **THEN** the result deep-equals `FRESH`

#### Scenario: Extra fields dropped [unit]
- **WHEN** `{ ...S({ balance: 2, totalClicks: 3 }), extra: "x" }` is validated
- **THEN** the result deep-equals `S({ balance: 2, totalClicks: 3 })` (no `extra` key)

#### Scenario: Normalization [unit]
- **WHEN** `{ ...S({ totalClicks: 300, ownedSkins: ["gold", "jumping-cap", "soft-shadow"], enabledSkins: ["jumping-cap", "soft-shadow"], material: "gold", decor: [{ id: "lava-lamp", position: { x: 0.5, y: 0.5, z: 1 } }, { id: "sleeping-cat", position: null, hidden: true }], upgrades: ["golden-button", "triple-click", "combo", "double-click"] }), helpers: { monkey: 2, robot: 1, factory: 0, cat: 5 }, levels: { ...L0, crit: 1, "speed-cat": 2 }, extra: "x" }` is validated
- **THEN** the result deep-equals `S({ totalClicks: 300, ownedSkins: ["soft-shadow", "jumping-cap", "gold"], enabledSkins: ["soft-shadow", "jumping-cap"], material: "gold", decor: [{ id: "sleeping-cat", position: null }, { id: "lava-lamp", position: { x: 0.5, y: 0.5 } }], upgrades: ["double-click", "triple-click", "combo", "golden-button"], helpers: { monkey: 2, robot: 1 }, levels: { crit: 1 } })` (no `extra`, `z`, `hidden`, `cat`, `speed-cat`)

#### Scenario: Valid video field accepted [unit]
- **WHEN** `S({ totalClicks: 30000, videos: [{ id: "video-runner", position: { x: 0, y: 1 } }, { id: "video-rain", position: null }] })` is validated
- **THEN** the result deep-equals the input

#### Scenario: Videos are normalized like decor [unit]
- **WHEN** `{ ...S({ totalClicks: 30000 }), videos: [{ id: "video-rain", position: null, muted: true }, { id: "video-runner", position: { x: 0.5, y: 0.5, z: 1 } }], achievements: ["first-click"], stats: { crits: 3 } }` is validated
- **THEN** the result deep-equals `S({ totalClicks: 30000, videos: [{ id: "video-runner", position: { x: 0.5, y: 0.5 } }, { id: "video-rain", position: null }] })` (catalog order, no `muted`, `z`, `achievements` or `stats`)

#### Scenario: Invalid video fields rejected [unit]
- **WHEN** each of the following is validated:
  `{ ...FRESH, videos: undefined }`, `{ ...FRESH, videos: {} }`, `{ ...FRESH, videos: ["video-runner"] }`,
  `{ ...FRESH, videos: [{ id: "video-nope", position: null }] }`, `{ ...FRESH, videos: [{ id: "video-runner", position: null }, { id: "video-runner", position: null }] }`,
  `{ ...FRESH, videos: [{ id: "video-runner" }] }`, `{ ...FRESH, videos: [{ id: "video-runner", position: { x: 1.5, y: 0 } }] }`,
  `{ ...FRESH, videos: [{ id: "video-runner", position: { x: "0.5", y: 0 } }] }`
- **THEN** every result is `null`

#### Scenario: Position bounds are inclusive [unit]
- **WHEN** `S({ decor: [{ id: "lava-lamp", position: { x: 0, y: 1 } }] })` is validated
- **THEN** the result deep-equals the input

#### Scenario: Maximum levels with owned helpers accepted [unit]
- **WHEN** `S({ totalClicks: 100000, helpers: { monkey: 1, robot: 1, factory: 1 }, levels: { crit: 3, "speed-monkey": 3, "speed-robot": 3, "speed-factory": 3 } })` is validated
- **THEN** the result deep-equals the input

#### Scenario: Invalid states rejected [unit]
- **WHEN** each of the following is validated: `null`, `42`, `"text"`, `[]`, `{}`, `{ balance: 0, totalClicks: 0 }` (a v1 payload), `S2({})` (a v2 payload), `S3({})` (a v3 payload, no `videos`),
  `{ ...FRESH, balance: undefined }`, `{ ...FRESH, totalClicks: undefined }`, `{ ...FRESH, balance: -1 }`, `{ ...FRESH, totalClicks: -1 }`,
  `{ ...FRESH, balance: 1.5 }`, `{ ...FRESH, balance: "5" }`, `{ ...FRESH, balance: NaN }`, `{ ...FRESH, balance: Infinity }`,
  `{ ...FRESH, totalClicks: 9007199254740992 }`
- **THEN** every result is `null`

#### Scenario: Invalid shop fields rejected [unit]
- **WHEN** each of the following is validated:
  `{ ...FRESH, ownedSkins: "soft-shadow" }`, `{ ...FRESH, ownedSkins: ["ripple"] }`, `{ ...FRESH, ownedSkins: ["squish", "squish"] }`,
  `{ ...FRESH, enabledSkins: ["squish"] }`, `{ ...FRESH, ownedSkins: ["gold"], enabledSkins: ["gold"] }`,
  `{ ...FRESH, material: "gold" }`, `{ ...FRESH, material: "lava" }`, `{ ...FRESH, material: undefined }`,
  `{ ...FRESH, decor: {} }`, `{ ...FRESH, decor: ["lava-lamp"] }`, `{ ...FRESH, decor: [{ id: "dvd-logo", position: null }] }`,
  `{ ...FRESH, decor: [{ id: "lava-lamp", position: null }, { id: "lava-lamp", position: null }] }`,
  `{ ...FRESH, decor: [{ id: "lava-lamp" }] }`, `{ ...FRESH, decor: [{ id: "lava-lamp", position: { x: 0.5 } }] }`,
  `{ ...FRESH, decor: [{ id: "lava-lamp", position: { x: 1.5, y: 0 } }] }`, `{ ...FRESH, decor: [{ id: "lava-lamp", position: { x: -0.1, y: 0 } }] }`,
  `{ ...FRESH, decor: [{ id: "lava-lamp", position: { x: NaN, y: 0 } }] }`, `{ ...FRESH, decor: [{ id: "lava-lamp", position: { x: "0.5", y: 0 } }] }`,
  `{ ...FRESH, upgrades: ["triple-click"] }`, `{ ...FRESH, upgrades: ["crit"] }`, `{ ...FRESH, upgrades: ["speed-monkey"] }`, `{ ...FRESH, upgrades: ["double-click", "double-click"] }`, `{ ...FRESH, upgrades: ["combo", "combo"] }`,
  `{ ...FRESH, helpers: null }`, `{ ...FRESH, helpers: [] }`, `{ ...FRESH, helpers: {} }`, `{ ...FRESH, helpers: { monkey: 0 } }` (v2 helpers), `{ ...FRESH, helpers: { monkey: 0, robot: 0 } }`,
  `{ ...FRESH, helpers: { monkey: -1, robot: 0, factory: 0 } }`, `{ ...FRESH, helpers: { monkey: 1.5, robot: 0, factory: 0 } }`, `{ ...FRESH, helpers: { monkey: 0, robot: -1, factory: 0 } }`, `{ ...FRESH, helpers: { monkey: 0, robot: 0, factory: "1" } }`
- **THEN** every result is `null`

#### Scenario: Invalid levels rejected [unit]
- **WHEN** each of the following is validated:
  `{ ...FRESH, levels: undefined }`, `{ ...FRESH, levels: null }`, `{ ...FRESH, levels: [] }`, `{ ...FRESH, levels: {} }`,
  `{ ...FRESH, levels: { crit: 0, "speed-monkey": 0, "speed-robot": 0 } }` (missing key),
  `{ ...FRESH, levels: { ...L0, crit: 4 } }`, `{ ...FRESH, levels: { ...L0, crit: -1 } }`, `{ ...FRESH, levels: { ...L0, crit: 1.5 } }`, `{ ...FRESH, levels: { ...L0, crit: "1" } }`,
  `{ ...FRESH, levels: { ...L0, "speed-monkey": 1 } }` (no monkey owned), `{ ...FRESH, helpers: { monkey: 1, robot: 0, factory: 0 }, levels: { ...L0, "speed-robot": 2 } }` (no robot owned)
- **THEN** every result is `null`

### Requirement: Migration hook
Loading SHALL pass the envelope through a migration table keyed by source version, where entry `N`
converts a version-`N` state payload into a version-`N+1` payload. Steps SHALL run in ascending
order until the target version is reached; the result is then validated. If a step is missing, a
step throws, the version is below 1, or the version is above the target, migration SHALL fail and
loading SHALL fall back as `corrupted`. The built-in table is `MIGRATIONS = { 1: migrateV1ToV2,
2: migrateV2ToV3, 3: migrateV3ToV4 }` (current version 4). Tests may inject a table and a target
version.

#### Scenario: Built-in table [unit]
- **WHEN** `MIGRATIONS` is read
- **THEN** `Object.keys(MIGRATIONS)` equals `["1", "2", "3"]`, `MIGRATIONS[1]` is `migrateV1ToV2`, `MIGRATIONS[2]` is `migrateV2ToV3` and `MIGRATIONS[3]` is `migrateV3ToV4`

#### Scenario: Same version passes through unchanged [unit]
- **WHEN** `{ version: 1, state: { balance: 3, totalClicks: 4 } }` is migrated with an empty table to target 1
- **THEN** the result deep-equals `{ version: 1, state: { balance: 3, totalClicks: 4 } }`

#### Scenario: One step [unit]
- **GIVEN** table `{ 1: (s) => ({ ...s, bonus: 0 }) }`
- **WHEN** `{ version: 1, state: { balance: 3, totalClicks: 4 } }` is migrated to target 2
- **THEN** the result deep-equals `{ version: 2, state: { balance: 3, totalClicks: 4, bonus: 0 } }`

#### Scenario: Chained steps run in order [unit]
- **GIVEN** table `{ 1: (s) => ({ ...s, log: ["1to2"] }), 2: (s) => ({ ...s, log: [...s.log, "2to3"] }) }`
- **WHEN** `{ version: 1, state: { balance: 0, totalClicks: 0 } }` is migrated to target 3
- **THEN** the result deep-equals `{ version: 3, state: { balance: 0, totalClicks: 0, log: ["1to2", "2to3"] } }`

#### Scenario: Missing step fails [unit]
- **GIVEN** table `{ 1: (s) => s }` (no entry for 2)
- **WHEN** `{ version: 1, state: { balance: 0, totalClicks: 0 } }` is migrated to target 3
- **THEN** the result is `null`

#### Scenario: Throwing step fails [unit]
- **GIVEN** table `{ 1: () => { throw new Error("boom") } }`
- **WHEN** `{ version: 1, state: { balance: 0, totalClicks: 0 } }` is migrated to target 2
- **THEN** the result is `null` and nothing is thrown

#### Scenario: Newer than target fails [unit]
- **WHEN** `{ version: 5, state: { balance: 0, totalClicks: 0 } }` is migrated with an empty table to target 4
- **THEN** the result is `null`

#### Scenario: Migrated load reports status migrated [unit]
- **WHEN** `RAW_V1(8, 9)` is parsed with the default options
- **THEN** the result is `{ state: S({ balance: 8, totalClicks: 9 }), status: "migrated" }` (v1 → v2 → v3 → v4)

#### Scenario: Migrated state that fails validation is corrupted [unit]
- **GIVEN** options `{ migrations: { 1: () => ({ balance: -1, totalClicks: 0 }) }, targetVersion: 2 }`
- **WHEN** `RAW_V1(8, 9)` is parsed with those options
- **THEN** the result is `{ state: FRESH, status: "corrupted" }`

### Requirement: Progress persists across reloads
The UI SHALL load the saved state before enabling the main button and SHALL save the state after
every change: every main-button press, purchase, skin toggle, every helper tick that adds at least
one whole click, and every reset (DECISION (confirmed), add-shop-v1 design D11). Runtime-only
changes (combo decay, golden-button countdown / spawn / expiry / catch, bonus timer, crit effect,
main-click carry, toast queue) SHALL NOT write the game save (DECISION (confirmed), add-upgrades-v2
design D2). Trophy changes (a newly unlocked achievement, a crit, a caught golden button, a combo
record, a reset) SHALL write only `dopamine-clicker:trophies`, never the game save (DECISION
(confirmed, changed by the human), design D12).

#### Scenario: Reload keeps balance [e2e]
Updated test in `e2e/add-foundation.spec.ts` (expected envelope is now v3).
- **GIVEN** the page `/` is loaded with empty storage
- **WHEN** the user clicks the main button 5 times and reloads the page
- **THEN** `[data-testid="balance"]` shows `5`
- **AND** `localStorage["dopamine-clicker:save"]` parsed deep-equals `{ version: 4, state: S({ balance: 5, totalClicks: 5 }) }`

#### Scenario: Seeded save is shown with locale formatting [e2e]
- **GIVEN** `localStorage["dopamine-clicker:save"]` is seeded with `{"version":1,"state":{"balance":1234,"totalClicks":1234}}` before the first page load
- **WHEN** the page `/` is loaded (default language Ukrainian)
- **THEN** `[data-testid="balance"]` text, with every whitespace character (including U+00A0) normalized to a plain space, is `1 234`

#### Scenario: Purchases and toggles survive reload [e2e]
Existing test in `e2e/add-shop-v1.spec.ts` (partial matches, unchanged).
- **GIVEN** storage is seeded with `V2(S2({ balance: 425, totalClicks: 150 }))`
- **WHEN** the user buys `squish` (25), `double-click` (100), `lava-lamp` (200) and `monkey` (50), then clicks `[data-testid="skin-toggle-squish"]` once, then reloads the page
- **THEN** `[data-testid="skin-toggle-squish"]` has `aria-pressed="false"`, `[data-testid="shop-owned-double-click"]` and `[data-testid="shop-owned-lava-lamp"]` have text `Куплено`, `[data-testid="decor-lava-lamp"]` is visible, `[data-testid="helper-monkey-count"]` has text `×1`
- **AND** the saved state has `ownedSkins: ["squish"]`, `enabledSkins: []`, `upgrades: ["double-click"]`, `helpers` matching `{ monkey: 1 }`, one decor entry with id `lava-lamp`, and `totalClicks` ≥ 150

#### Scenario: Stage 3 purchases survive reload [e2e]
New test in `e2e/add-upgrades-v2.spec.ts`.
- **GIVEN** storage is seeded with `V3(S({ balance: 2650, totalClicks: 700 }))`
- **WHEN** the user buys `crit` (250), `combo` (400), `golden-button` (1000) and `robot` (1000), then reloads the page
- **THEN** `[data-testid="shop-level-crit"]` has text `Рівень 1 з 3`, `[data-testid="shop-owned-combo"]` and `[data-testid="shop-owned-golden-button"]` have text `Куплено`, `[data-testid="helper-robot-count"]` has text `×1`
- **AND** the saved envelope has `version: 3` and its state matches `{ upgrades: ["combo", "golden-button"], helpers: { monkey: 0, robot: 1, factory: 0 }, levels: { crit: 1, "speed-monkey": 0, "speed-robot": 0, "speed-factory": 0 } }`

#### Scenario: Runtime changes do not write storage [e2e]
New test in `e2e/add-upgrades-v2.spec.ts`.
- **GIVEN** the random hook is fixed to `0.75`, storage is seeded with `V3(S({ balance: 0, totalClicks: 700, upgrades: ["combo", "golden-button"] }))` and the clock is paused
- **WHEN** the user makes 3 clicks on the main button with the clock running 100 ms between them, the raw value of `localStorage["dopamine-clicker:save"]` is recorded as `W`, and then the clock runs 3 000 ms (combo decays, golden countdown runs)
- **THEN** `localStorage["dopamine-clicker:save"]` still equals `W` exactly

#### Scenario: Catching a golden button writes only the trophy file [e2e]
New test in `e2e/add-content-v3.spec.ts`.
- **GIVEN** the random hook is fixed to `0.75`, storage is seeded with `V4(S({ balance: 1000, totalClicks: 9000 }))` and the clock is paused
- **WHEN** the user buys `golden-button`, the clock runs 75 000 ms, the current value of `localStorage["dopamine-clicker:save"]` is recorded as `SAVE0`, and the user clicks `[data-testid="golden-button"]`
- **THEN** `[data-testid="golden-bonus"]` is visible
- **AND** the trophy file's `trophies.stats.goldenCaught` is `1` and its `trophies.unlocked` contains `first-golden`
- **AND** `localStorage["dopamine-clicker:save"]` is still exactly `SAVE0`

### Requirement: Reset progress with confirmation
The screen SHALL offer a "Reset progress" action (`[data-testid="reset"]`). Activating it SHALL
open a confirmation dialog (`role="dialog"`, `[data-testid="reset-dialog"]`) with a confirm button
(`[data-testid="reset-confirm"]`) and a cancel button (`[data-testid="reset-cancel"]`); focus
SHALL move to the cancel button; Escape SHALL act as cancel. Confirming SHALL remove
`dopamine-clicker:save` from storage, set the in-memory state to `FRESH` (counter hidden, shop
hidden, all skins, decor, upgrades, helpers and levels gone), reset the helper carry and the
main-click carry to 0 and the click runtime to `createClickRuntime()` (no combo, no golden button, no bonus, no crit effect).
Cancelling SHALL change nothing. Reset SHALL NOT touch the theme or language keys, nor the
corrupted-save backup `dopamine-clicker:save:bad`. Clearing the save SHALL never throw.

Reset SHALL keep the trophy case: it SHALL NOT remove `dopamine-clicker:trophies`. It SHALL instead
write it once with `stats.resets + 1`, `crits`, `goldenCaught` and `maxComboLevel` back to `0`, and
the unlocked set of one silent `evaluateAchievements` against the **pre-reset** state with those
counters — so `reset-once` (and any meta achievement it completes) unlocks at that moment without a
toast. Every already unlocked id stays unlocked although the wiped state no longer satisfies it
(DECISION (confirmed, changed by the human), design D12).

#### Scenario: Clear removes only the save key [unit]
- **GIVEN** an in-memory storage with `dopamine-clicker:save` = `V3(S({ balance: 3, totalClicks: 3 }))`, `dopamine-clicker:save:bad` = `"{not json"`, `dopamine-clicker:theme` = `"dark"`, `dopamine-clicker:lang` = `"en"`
- **WHEN** the game save is cleared
- **THEN** `getItem("dopamine-clicker:save")` is `null`
- **AND** `getItem("dopamine-clicker:save:bad")` is `"{not json"`
- **AND** `getItem("dopamine-clicker:theme")` is `"dark"` and `getItem("dopamine-clicker:lang")` is `"en"`

#### Scenario: Clear survives a storage error [unit]
- **GIVEN** a storage whose `removeItem` throws
- **WHEN** the game save is cleared
- **THEN** nothing is thrown

#### Scenario: Cancel keeps progress [e2e]
- **GIVEN** the user clicked the main button 5 times
- **WHEN** the user clicks `[data-testid="reset"]`
- **THEN** `[data-testid="reset-dialog"]` is visible and `[data-testid="reset-cancel"]` is focused
- **WHEN** the user clicks `[data-testid="reset-cancel"]`
- **THEN** the dialog is not visible and `[data-testid="balance"]` shows `5`

#### Scenario: Escape cancels [e2e]
- **GIVEN** the user clicked the main button 2 times and opened the reset dialog
- **WHEN** the user presses `Escape`
- **THEN** the dialog is not visible and `[data-testid="balance"]` shows `2`

#### Scenario: Reset trophies keep the unlocked ids [unit]
- **GIVEN** `B = S({ balance: 500, totalClicks: 1200, decor: [{ id: "sleeping-cat", position: null }] })` and `BT = TR({ unlocked: ["first-click", "clicks-100", "clicks-1000", "first-purchase", "first-decor", "cat-nap"], stats: { crits: 30, goldenCaught: 2, maxComboLevel: 7, resets: 0 } })`
- **WHEN** the reset trophies are computed as `stats' = { ...ST0, resets: BT.stats.resets + 1 }` and `unlocked' = evaluateAchievements(BT.unlocked, getAchievementStats(B, { unlocked: BT.unlocked, stats: stats' })).unlocked`
- **THEN** `{ unlocked: unlocked', stats: stats' }` deep-equals `TR({ unlocked: ["first-click", "clicks-100", "clicks-1000", "first-purchase", "first-decor", "cat-nap", "reset-once"], stats: { resets: 1 } })`
- **WHEN** `evaluateAchievements(unlocked', getAchievementStats(FRESH, { unlocked: unlocked', stats: stats' }))` is evaluated (the state right after the wipe)
- **THEN** its `unlocked` still deep-equals `unlocked'` and its `newlyUnlocked` is `[]`

#### Scenario: Confirm wipes game but keeps theme and language [e2e]
- **GIVEN** the user switched language to English, switched theme once (stored value recorded as `T`), and clicked the main button 5 times
- **WHEN** the user clicks `[data-testid="reset"]` and then `[data-testid="reset-confirm"]`
- **THEN** the dialog is not visible and `[data-testid="balance"]` is not visible
- **AND** `localStorage["dopamine-clicker:save"]` is `null`
- **AND** `localStorage["dopamine-clicker:lang"]` is `"en"` and `localStorage["dopamine-clicker:theme"]` is `T`
- **AND** `<html>` still has `lang="en"` and `data-theme="T"`
- **WHEN** the page is reloaded
- **THEN** `[data-testid="balance"]` is not visible and the main button text is `Click`
- **WHEN** the user clicks the main button once
- **THEN** `[data-testid="balance"]` shows `1`

#### Scenario: Reset wipes purchases [e2e]
- **GIVEN** storage is seeded with `V2(S2({ balance: 40, totalClicks: 800, ownedSkins: ["jumping-cap", "gold"], enabledSkins: ["jumping-cap"], material: "gold", decor: [{ id: "lava-lamp", position: { x: 0.8, y: 0.1 } }], upgrades: ["double-click"], helpers: { monkey: 2 } }))`
- **WHEN** the user clicks `[data-testid="reset"]` and then `[data-testid="reset-confirm"]`
- **THEN** `[data-testid="shop"]`, `[data-testid="balance"]` are not visible; `[data-testid="decor-lava-lamp"]`, `[data-testid="helper-monkey"]`, `[data-testid="jumping-cap"]` have count 0; the main button has `data-skins=""` and `data-material="classic"`
- **AND** `localStorage["dopamine-clicker:save"]` is `null`
- **WHEN** the user clicks the main button once and waits 1500 ms
- **THEN** `[data-testid="balance"]` shows `1` (no ×2, no monkey income)

#### Scenario: Reset clears Stage 3 progress and runtime [e2e]
New test in `e2e/add-upgrades-v2.spec.ts`.
- **GIVEN** the random hook is fixed to `0.01` and storage is seeded with `V3(S({ balance: 40, totalClicks: 9000, upgrades: ["combo", "golden-button"], helpers: { robot: 2, factory: 1 }, levels: { crit: 2, "speed-robot": 1 } }))`
- **WHEN** the page `/` is loaded, the user clicks the main button twice quickly (combo meter visible), then clicks `[data-testid="reset"]` and `[data-testid="reset-confirm"]`
- **THEN** `[data-testid="helper-robot"]`, `[data-testid="helper-factory"]`, `[data-testid="combo"]`, `[data-testid="golden-button"]`, `[data-testid="golden-bonus"]` have count 0 and `[data-testid="shop"]` is not visible
- **AND** `localStorage["dopamine-clicker:save"]` is `null`
- **WHEN** the user clicks the main button once and waits 1500 ms
- **THEN** `[data-testid="balance"]` shows `1` (no crit although the random hook returns 0.01, no helper income) and `[data-testid="crit-text"]` has count 0

#### Scenario: Reset keeps the trophies and unlocks the reset achievement [e2e]
New test in `e2e/add-content-v3.spec.ts`.
- **GIVEN** storage is seeded with `V4(S({ balance: 500, totalClicks: 1200 }))`, the trophy file with `TF(TR({ unlocked: ["first-click", "clicks-100", "clicks-1000"] }))`, and the clock is paused
- **WHEN** the page `/` is loaded and the user clicks `[data-testid="reset"]` and then `[data-testid="reset-confirm"]`
- **THEN** `[data-testid="balance"]` is not visible, `localStorage["dopamine-clicker:save"]` is `null` and `[data-testid="achievement-toast"]` has count 0 (the reset unlock is silent)
- **AND** the trophy file's `trophies.unlocked` is `["first-click", "clicks-100", "clicks-1000", "reset-once"]` and its `trophies.stats` deep-equals `{ crits: 0, goldenCaught: 0, maxComboLevel: 0, resets: 1 }`
- **WHEN** the user clicks `[data-testid="achievements"]`
- **THEN** `[data-testid="achievements-count"]` has text `Відкрито 4 з 30`, `[data-testid="achievement-reset-once"]` has `data-unlocked="true"`, `[data-testid="achievement-clicks-1000"]` has `data-unlocked="true"` and `[data-testid="achievement-progress-clicks-1000"]` has normalized text `0 / 1 000`

## ADDED Requirements

### Requirement: Stage 3 saves migrate to v4
`migrateV3ToV4(state)` SHALL, for a non-array object `s`, return the nine v3 fields copied as-is
(`balance`, `totalClicks`, `ownedSkins`, `enabledSkins`, `material`, `decor`, `upgrades`, `helpers`,
`levels`) plus `videos: []` (other keys dropped; values not validated here). For any other input it
SHALL return the input unchanged. A v3 save SHALL load with status `migrated` keeping every Stage
1–3 purchase, and SHALL be rewritten as v4 on the next save; loading itself SHALL NOT rewrite it
(DECISION (confirmed), design D11).

#### Scenario: Migrate a v3 payload [unit]
- **WHEN** `migrateV3ToV4(S3({ balance: 7, totalClicks: 900, ownedSkins: ["squish", "gold"], enabledSkins: ["squish"], material: "gold", decor: [{ id: "lava-lamp", position: { x: 0.8, y: 0.1 } }], upgrades: ["double-click", "combo"], helpers: { monkey: 3, robot: 1 }, levels: { crit: 2 } }))` is called
- **THEN** the result deep-equals `S({ balance: 7, totalClicks: 900, ownedSkins: ["squish", "gold"], enabledSkins: ["squish"], material: "gold", decor: [{ id: "lava-lamp", position: { x: 0.8, y: 0.1 } }], upgrades: ["double-click", "combo"], helpers: { monkey: 3, robot: 1 }, levels: { crit: 2 } })` (i.e. the same payload plus `videos: []`)

#### Scenario: Extra v3 keys are dropped and videos start empty [unit]
- **WHEN** `migrateV3ToV4({ ...S3({}), foo: 1, videos: [{ id: "video-runner", position: null }], achievements: ["first-click"], stats: { crits: 9 } })` is called
- **THEN** the result deep-equals `FRESH` (no `foo`, no `achievements`, no `stats`; `videos` is `[]`)

#### Scenario: Values are passed through for later validation [unit]
- **WHEN** `migrateV3ToV4({ ...S3({}), balance: -5 })` and `migrateV3ToV4({ ...S3({}), levels: null })` are called
- **THEN** the results deep-equal `{ ...FRESH, balance: -5 }` and `{ ...FRESH, levels: null }`

#### Scenario: Non-object payloads are returned unchanged [unit]
- **WHEN** `migrateV3ToV4` is called with `null`, `42`, `"x"`, and an array `A = [1]`
- **THEN** the results are `null`, `42`, `"x"` and `A` (same reference)

#### Scenario: v3 save loads as migrated [unit]
- **WHEN** `V3(S3({ balance: 12, totalClicks: 9000, upgrades: ["combo"], helpers: { robot: 2 }, levels: { crit: 3, "speed-robot": 1 } }))` is parsed with the default options
- **THEN** the result is `{ state: S({ balance: 12, totalClicks: 9000, upgrades: ["combo"], helpers: { robot: 2 }, levels: { crit: 3, "speed-robot": 1 } }), status: "migrated" }`

#### Scenario: Invalid v3 save is corrupted [unit]
- **WHEN** `V3(S3({ totalClicks: 250, upgrades: ["triple-click"] }))` is parsed with the default options
- **THEN** the result is `{ state: FRESH, status: "corrupted" }`

#### Scenario: Loading a v3 save does not rewrite it [unit]
- **GIVEN** an in-memory storage with `dopamine-clicker:save` = `V3(S3({ balance: 40, totalClicks: 70 }))`
- **WHEN** the game is loaded with default options
- **THEN** the status is `"migrated"`, `getItem("dopamine-clicker:save")` is still `V3(S3({ balance: 40, totalClicks: 70 }))` and `getItem("dopamine-clicker:save:bad")` is `null`

#### Scenario: A v4 save is loaded as is [unit]
- **WHEN** `V4(S({ balance: 5, totalClicks: 5, videos: [{ id: "video-runner", position: null }] }))` is parsed with the default options
- **THEN** the status is `"loaded"` and the state deep-equals the seeded state

#### Scenario: Stage 3 player continues in Stage 4 [e2e]
New test in `e2e/add-content-v3.spec.ts`.
- **GIVEN** `localStorage["dopamine-clicker:save"]` is seeded with `V3(S3({ balance: 40, totalClicks: 3000, ownedSkins: ["squish"], enabledSkins: ["squish"], upgrades: ["double-click"], helpers: { monkey: 2 }, levels: { crit: 1 } }))`, no trophy file, and the clock is paused
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="balance"]` shows `40`, `[data-testid="skin-toggle-squish"]` has `aria-pressed="true"`, `[data-testid="shop-level-crit"]` has text `Рівень 1 з 3` and `[data-testid="shop-item-video-runner"]` is visible
- **AND** `[data-testid="achievement-toast"]` has count 0 (the first evaluation is silent)
- **WHEN** the user clicks `[data-testid="achievements"]`
- **THEN** `[data-testid="achievements-count"]` has text `Відкрито 5 з 30` and exactly the rows `achievement-first-click`, `achievement-clicks-100`, `achievement-clicks-1000`, `achievement-first-purchase` and `achievement-first-helper` have `data-unlocked="true"` (purchases = 1 skin + 1 upgrade + 2 monkeys + 1 crit level = 5, so `purchases-10` stays locked)
- **WHEN** the user closes the panel and clicks the main button once
- **THEN** `localStorage["dopamine-clicker:save"]` parsed deep-equals `{ version: 4, state: S({ balance: 42, totalClicks: 3001, ownedSkins: ["squish"], enabledSkins: ["squish"], upgrades: ["double-click"], helpers: { monkey: 2 }, levels: { crit: 1 } }) }`

### Requirement: Trophy file format and validation
The trophy case SHALL be stored under `dopamine-clicker:trophies` as JSON of the envelope
`{ "version": 1, "trophies": { "unlocked": <AchievementId[]>, "stats": { "crits", "goldenCaught",
"maxComboLevel", "resets" } } }` and SHALL contain nothing else (no timestamps, no runtime values,
no game state). `validateTrophies` SHALL accept only a non-array object whose `unlocked` is an array
of distinct known `AchievementId`s and whose `stats` is a non-array object where `crits`,
`goldenCaught` and `resets` are non-negative safe integers and `maxComboLevel` is an integer in
`[0, 10]`; the result SHALL be a normalized copy with `unlocked` re-sorted into `ACHIEVEMENTS` order
and unknown keys dropped at every level. Anything else SHALL be rejected (`null`). Constants:
`TROPHIES_KEY = "dopamine-clicker:trophies"`, `TROPHIES_BACKUP_KEY =
"dopamine-clicker:trophies:bad"`, `CURRENT_TROPHIES_VERSION = 1` (DECISION (confirmed, changed by
the human), design D12).

#### Scenario: Constants and the empty trophy case [unit]
- **WHEN** the constants and `createInitialTrophies()` are read
- **THEN** `TROPHIES_KEY` is `"dopamine-clicker:trophies"`, `TROPHIES_BACKUP_KEY` is `"dopamine-clicker:trophies:bad"`, `CURRENT_TROPHIES_VERSION` is `1`
- **AND** the trophies deep-equal `{ unlocked: [], stats: { crits: 0, goldenCaught: 0, maxComboLevel: 0, resets: 0 } }`
- **WHEN** `createInitialTrophies()` is called twice
- **THEN** the two results are different objects, and so are their `unlocked` and `stats` members

#### Scenario: Serialize trophies [unit]
- **WHEN** `TR({ unlocked: ["first-click", "cat-nap"], stats: { crits: 5, resets: 2 } })` is serialized
- **THEN** `JSON.parse` of the result deep-equals `{ version: 1, trophies: { unlocked: ["first-click", "cat-nap"], stats: { crits: 5, goldenCaught: 0, maxComboLevel: 0, resets: 2 } } }`

#### Scenario: Serialize writes only schema fields [unit]
- **WHEN** `{ ...TR({ unlocked: ["first-click"] }), savedAt: 123, stats: { ...ST0, crits: 1, streak: 7 } }` (cast to `Trophies`) is serialized
- **THEN** `JSON.parse` of the result deep-equals `{ version: 1, trophies: TR({ unlocked: ["first-click"], stats: { crits: 1 } }) }` (no `savedAt`, no `streak`)

#### Scenario: Valid trophy files accepted [unit]
- **WHEN** `T0`, `TR({ unlocked: ["first-click"] })` and `TR({ unlocked: <all 30 ids>, stats: { crits: 9007199254740991, goldenCaught: 12, maxComboLevel: 10, resets: 3 } })` are validated
- **THEN** each result deep-equals its input

#### Scenario: Trophies are normalized [unit]
- **WHEN** `{ unlocked: ["cat-nap", "first-click", "not-real"], stats: { crits: 1, goldenCaught: 0, maxComboLevel: 0, resets: 0, streak: 7 }, extra: "x" }` is validated
- **THEN** the result deep-equals `TR({ unlocked: ["first-click", "cat-nap"], stats: { crits: 1 } })` (`ACHIEVEMENTS` order, no `not-real`, `streak` or `extra`)

#### Scenario: Invalid trophy files rejected [unit]
- **WHEN** each of the following is validated: `null`, `42`, `"text"`, `[]`, `{}`,
  `{ unlocked: [] }`, `{ stats: ST0 }`, `{ unlocked: "first-click", stats: ST0 }`,
  `{ unlocked: ["first-click", "first-click"], stats: ST0 }`,
  `{ unlocked: [], stats: null }`, `{ unlocked: [], stats: [] }`, `{ unlocked: [], stats: {} }`,
  `{ unlocked: [], stats: { crits: 0, goldenCaught: 0, maxComboLevel: 0 } }` (missing key),
  `{ unlocked: [], stats: { ...ST0, crits: -1 } }`, `{ unlocked: [], stats: { ...ST0, crits: 1.5 } }`,
  `{ unlocked: [], stats: { ...ST0, crits: "1" } }`, `{ unlocked: [], stats: { ...ST0, crits: NaN } }`,
  `{ unlocked: [], stats: { ...ST0, maxComboLevel: 11 } }`, `{ unlocked: [], stats: { ...ST0, maxComboLevel: -1 } }`
- **THEN** every result is `null`

### Requirement: Loading trophies with fallback
`parseTrophies(raw)` SHALL be pure (never touch storage) and return `{ trophies, status }` with
`fresh` for `null`, `loaded` for a valid `{ version: 1, ... }` envelope, and `corrupted` — with
`createInitialTrophies()` as the trophies — for anything unparseable, any envelope whose `version`
is not `1`, and any payload `validateTrophies` rejects. `loadTrophies(storage)` SHALL read
`TROPHIES_KEY`, never throw (unreadable storage counts as `fresh`), and, when the status is
`corrupted` and the raw value was non-null, copy the raw string verbatim to `TROPHIES_BACKUP_KEY`
(overwriting a previous backup; a failed backup write is ignored). It SHALL never modify
`TROPHIES_KEY` and never write the backup for other statuses. `saveTrophies` SHALL return `false`
instead of throwing when storage rejects the write. `clearTrophies` SHALL remove `TROPHIES_KEY`
only and never throw; it is not used by "Reset progress" (design D12).

#### Scenario: Nothing stored [unit]
- **GIVEN** an empty in-memory storage
- **WHEN** the trophies are loaded
- **THEN** the result is `{ trophies: T0, status: "fresh" }` and nothing was written

#### Scenario: Round trip [unit]
- **GIVEN** an empty in-memory storage and `F = TR({ unlocked: ["first-click", "clicks-100", "cat-nap"], stats: { crits: 42, goldenCaught: 3, maxComboLevel: 10, resets: 1 } })`
- **WHEN** `F` is saved and then loaded
- **THEN** the result is `{ trophies: F, status: "loaded" }`
- **AND** `getItem("dopamine-clicker:trophies")` parsed deep-equals `{ version: 1, trophies: F }` and no other key was written

#### Scenario: Corrupted trophy file is backed up [unit]
- **GIVEN** an in-memory storage with `dopamine-clicker:trophies` = `"{not json"`
- **WHEN** the trophies are loaded
- **THEN** the result is `{ trophies: T0, status: "corrupted" }`
- **AND** `getItem("dopamine-clicker:trophies:bad")` is `"{not json"` and `getItem("dopamine-clicker:trophies")` is still `"{not json"`

#### Scenario: Unknown version is corrupted [unit]
- **WHEN** `'{"version":2,"trophies":{"unlocked":[],"stats":{"crits":0,"goldenCaught":0,"maxComboLevel":0,"resets":0}}}'` and `'{"version":0,"trophies":{}}'` are parsed
- **THEN** both results are `{ trophies: T0, status: "corrupted" }`

#### Scenario: Invalid payload is corrupted [unit]
- **WHEN** `TF({ unlocked: ["first-click", "first-click"], stats: ST0 })` and `TF({ unlocked: [], stats: { ...ST0, resets: -1 } })` are parsed
- **THEN** both results are `{ trophies: T0, status: "corrupted" }`

#### Scenario: Storage errors never throw [unit]
- **GIVEN** a storage whose `getItem`, `setItem` and `removeItem` all throw
- **WHEN** the trophies are loaded, saved and cleared
- **THEN** nothing is thrown, the load result is `{ trophies: T0, status: "fresh" }` and the save returns `false`

#### Scenario: Clearing removes only the trophy key [unit]
- **GIVEN** an in-memory storage with `dopamine-clicker:trophies` = `TF(TR({ unlocked: ["first-click"] }))`, `dopamine-clicker:trophies:bad` = `"{bad"`, `dopamine-clicker:save` = `V4(FRESH)`, `dopamine-clicker:theme` = `"dark"`
- **WHEN** the trophies are cleared
- **THEN** `getItem("dopamine-clicker:trophies")` is `null`, and the other three values are unchanged

#### Scenario: A corrupted trophy file starts an empty case in the browser [e2e]
New test in `e2e/add-content-v3.spec.ts`.
- **GIVEN** `localStorage["dopamine-clicker:trophies"]` is seeded with `"{not json"` and the save with `V4(S({ balance: 0, totalClicks: 150 }))`, and the clock is paused
- **WHEN** the page `/` is loaded and the user clicks `[data-testid="achievements"]`
- **THEN** `[data-testid="achievements-count"]` has text `Відкрито 2 з 30` (`first-click`, `clicks-100`, re-earned from the loaded save)
- **AND** `localStorage["dopamine-clicker:trophies:bad"]` is `"{not json"` and `[data-testid="achievement-toast"]` has count 0
