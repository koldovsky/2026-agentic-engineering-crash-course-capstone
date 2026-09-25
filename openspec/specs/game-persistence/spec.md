# game-persistence Specification

## Purpose

Keeps the game state across page reloads in the browser's localStorage using a versioned schema
with a migration path, recovers safely from corrupted data, and lets the player reset progress.

Scenario tags: `[unit]` = Vitest test in `lib/game/save.test.ts`, `[e2e]` = Playwright test in
`e2e/add-foundation.spec.ts`. Unit tests use an in-memory `KeyValueStorage` fake (a `Map`-backed
object), never the real `window.localStorage`.

Storage keys (confirmed by human): game save `dopamine-clicker:save`, corrupted-save backup
`dopamine-clicker:save:bad`, theme `dopamine-clicker:theme`, language `dopamine-clicker:lang`.
Current save version: `1`.

## Requirements

### Requirement: Versioned save format
The game state SHALL be stored under the key `dopamine-clicker:save` as JSON of the envelope
`{ "version": 3, "state": <GameState> }` where the state has exactly the keys `balance`,
`totalClicks`, `ownedSkins`, `enabledSkins`, `material`, `decor`, `upgrades`, `helpers`, `levels`
(decor entries exactly `id`, `position`; positions exactly `x`, `y`; `helpers` exactly `monkey`,
`robot`, `factory`; `levels` exactly `crit`, `speed-monkey`, `speed-robot`, `speed-factory`). No
timestamps or runtime values (helper carry, main-click carry, combo, golden button, bonus timer,
crit effect) are written (DECISION (confirmed), design D2).

#### Scenario: Constants [unit]
- **WHEN** the constants are read
- **THEN** `SAVE_KEY` is `"dopamine-clicker:save"`, `SAVE_BACKUP_KEY` is `"dopamine-clicker:save:bad"` and `CURRENT_SAVE_VERSION` is `3`

#### Scenario: Serialize state [unit]
- **WHEN** the state `S({ balance: 12, totalClicks: 30 })` is serialized
- **THEN** `JSON.parse` of the result deep-equals `{ version: 3, state: S({ balance: 12, totalClicks: 30 }) }`

#### Scenario: Serialize writes only schema fields [unit]
- **WHEN** `{ ...S({ balance: 1, totalClicks: 1, decor: [{ id: "lava-lamp", position: { x: 0.5, y: 0.25 } }] }), carry: 400, clickCarry: 0.5, savedAt: 123, combo: { level: 3, lastClickAt: 5 }, golden: { nextSpawnMs: 0, visible: null, bonusMs: 1000 }, helpers: { monkey: 1, robot: 2, factory: 3, extra: 4 }, levels: { ...L0, crit: 2, bonus: 1 } }` (cast to `GameState`) is serialized
- **THEN** `JSON.parse` of the result deep-equals `{ version: 3, state: S({ balance: 1, totalClicks: 1, decor: [{ id: "lava-lamp", position: { x: 0.5, y: 0.25 } }], helpers: { monkey: 1, robot: 2, factory: 3 }, levels: { crit: 2 } }) }`

#### Scenario: Save writes to the save key [unit]
- **GIVEN** an empty in-memory storage
- **WHEN** the state `S({ balance: 5, totalClicks: 5 })` is saved
- **THEN** the save function returns `true`
- **AND** `storage.getItem("dopamine-clicker:save")` parsed deep-equals `{ version: 3, state: S({ balance: 5, totalClicks: 5 }) }`
- **AND** no other key is written

#### Scenario: Save survives a storage write error [unit]
- **GIVEN** a storage whose `setItem` throws `new Error("QuotaExceededError")`
- **WHEN** the state `S({ balance: 1, totalClicks: 1 })` is saved
- **THEN** the save function returns `false` and does not throw

#### Scenario: Round trip [unit]
- **GIVEN** an empty in-memory storage and `F = S({ balance: 1234, totalClicks: 90000, ownedSkins: ["soft-shadow", "squish", "floating-number", "jumping-cap", "gold"], enabledSkins: ["squish", "jumping-cap"], material: "gold", decor: [{ id: "sleeping-cat", position: { x: 0.125, y: 0.5 } }, { id: "lava-lamp", position: null }, { id: "hydraulic-press", position: { x: 0.75, y: 0.0625 } }], upgrades: ["double-click", "triple-click", "combo", "golden-button"], helpers: { monkey: 7, robot: 2, factory: 1 }, levels: { crit: 2, "speed-monkey": 3, "speed-robot": 1, "speed-factory": 0 } })`
- **WHEN** `F` is saved and then loaded
- **THEN** the load result is `{ state: F, status: "loaded" }`

### Requirement: State validation
A stored v3 state SHALL be accepted only if: it is a non-array object; `balance` and `totalClicks`
are non-negative safe integers; `ownedSkins` is an array of distinct `SkinId`s; `enabledSkins` is an
array of distinct `StackSkinId`s each contained in `ownedSkins`; `material` is `"classic"` or
`"gold"` and `"gold"` only if Gold is owned; `decor` is an array of objects with a distinct `DecorId`
`id` and a `position` that is `null` or an object with finite `x`, `y` in `[0, 1]`; `upgrades` is an
array of distinct `UpgradeId`s (`double-click`, `triple-click`, `combo`, `golden-button`) containing
`"triple-click"` only together with `"double-click"`; `helpers` is a non-array object whose
`monkey`, `robot` and `factory` are non-negative safe integers; `levels` is a non-array object whose
`crit`, `speed-monkey`, `speed-robot`, `speed-factory` are integers in `[0, 3]`, and a speed-up level
is > 0 only if its helper count is ≥ 1. The result SHALL be a normalized copy: every array re-sorted
into catalog order and unknown keys dropped at every level. Anything else SHALL be rejected (`null`)
(DECISION (confirmed), add-shop-v1 design D13; DECISION (confirmed), design D15).

#### Scenario: Valid state accepted [unit]
- **WHEN** `FRESH` is validated
- **THEN** the result deep-equals `FRESH`

#### Scenario: Extra fields dropped [unit]
- **WHEN** `{ ...S({ balance: 2, totalClicks: 3 }), extra: "x" }` is validated
- **THEN** the result deep-equals `S({ balance: 2, totalClicks: 3 })` (no `extra` key)

#### Scenario: Normalization [unit]
- **WHEN** `{ ...S({ totalClicks: 300, ownedSkins: ["gold", "jumping-cap", "soft-shadow"], enabledSkins: ["jumping-cap", "soft-shadow"], material: "gold", decor: [{ id: "lava-lamp", position: { x: 0.5, y: 0.5, z: 1 } }, { id: "sleeping-cat", position: null, hidden: true }], upgrades: ["golden-button", "triple-click", "combo", "double-click"] }), helpers: { monkey: 2, robot: 1, factory: 0, cat: 5 }, levels: { ...L0, crit: 1, "speed-cat": 2 }, extra: "x" }` is validated
- **THEN** the result deep-equals `S({ totalClicks: 300, ownedSkins: ["soft-shadow", "jumping-cap", "gold"], enabledSkins: ["soft-shadow", "jumping-cap"], material: "gold", decor: [{ id: "sleeping-cat", position: null }, { id: "lava-lamp", position: { x: 0.5, y: 0.5 } }], upgrades: ["double-click", "triple-click", "combo", "golden-button"], helpers: { monkey: 2, robot: 1 }, levels: { crit: 1 } })` (no `extra`, `z`, `hidden`, `cat`, `speed-cat`)

#### Scenario: Position bounds are inclusive [unit]
- **WHEN** `S({ decor: [{ id: "lava-lamp", position: { x: 0, y: 1 } }] })` is validated
- **THEN** the result deep-equals the input

#### Scenario: Maximum levels with owned helpers accepted [unit]
- **WHEN** `S({ totalClicks: 100000, helpers: { monkey: 1, robot: 1, factory: 1 }, levels: { crit: 3, "speed-monkey": 3, "speed-robot": 3, "speed-factory": 3 } })` is validated
- **THEN** the result deep-equals the input

#### Scenario: Invalid states rejected [unit]
- **WHEN** each of the following is validated: `null`, `42`, `"text"`, `[]`, `{}`, `{ balance: 0, totalClicks: 0 }` (a v1 payload), `S2({})` (a v2 payload),
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

### Requirement: Loading with fallback
Loading SHALL never throw. It SHALL return a fresh state `FRESH` with status `fresh` when nothing is
stored or storage cannot be read, and with status `corrupted` when the stored value is not valid
JSON, is not an envelope `{ version: <integer>, state: ... }`, has a version it cannot migrate to
the current one, or has an invalid state after migration. Theme and language keys SHALL NOT be read
or changed by game loading.

#### Scenario: Nothing stored [unit]
- **GIVEN** an empty in-memory storage
- **WHEN** the game is loaded
- **THEN** the result is `{ state: FRESH, status: "fresh" }`

#### Scenario: Storage read throws [unit]
- **GIVEN** a storage whose `getItem` throws `new Error("SecurityError")`
- **WHEN** the game is loaded
- **THEN** the result is `{ state: FRESH, status: "fresh" }` and nothing is thrown

#### Scenario: Corrupted raw values [unit]
- **WHEN** each raw string is parsed as a save: `"{not json"`, `""`, `"null"`, `"42"`, `"[]"`,
  `"{}"`, `"{\"version\":1}"`, `"{\"state\":{\"balance\":1,\"totalClicks\":1}}"`,
  `"{\"version\":\"1\",\"state\":{\"balance\":1,\"totalClicks\":1}}"`,
  `"{\"version\":1,\"state\":{\"balance\":-5,\"totalClicks\":1}}"`,
  `"{\"version\":2,\"state\":{\"balance\":10,\"totalClicks\":10}}"` (v2 envelope with a v1 payload),
  `"{\"version\":3,\"state\":{\"balance\":10,\"totalClicks\":10}}"` (v3 envelope with a v1 payload)
- **THEN** every result is `{ state: FRESH, status: "corrupted" }`

#### Scenario: Null raw value is fresh, not corrupted [unit]
- **WHEN** the raw value `null` is parsed as a save
- **THEN** the result is `{ state: FRESH, status: "fresh" }`

#### Scenario: Future version falls back [unit]
- **WHEN** `{"version":4,"state":<S({ balance: 10, totalClicks: 10 }) as JSON>}` is parsed with the default options (target version 3)
- **THEN** the result is `{ state: FRESH, status: "corrupted" }`

#### Scenario: Version 0 falls back [unit]
- **WHEN** `"{\"version\":0,\"state\":{\"balance\":10,\"totalClicks\":10}}"` is parsed with the default options
- **THEN** the result is `{ state: FRESH, status: "corrupted" }`

#### Scenario: Current version loads [unit]
- **WHEN** `V3(S({ balance: 4, totalClicks: 200, upgrades: ["double-click", "combo"], levels: { crit: 1 } }))` is parsed with the default options
- **THEN** the result is `{ state: S({ balance: 4, totalClicks: 200, upgrades: ["double-click", "combo"], levels: { crit: 1 } }), status: "loaded" }`

#### Scenario: Corrupted save in the browser [e2e]
Updated test in `e2e/add-foundation.spec.ts` (expected envelope is now v3).
- **GIVEN** `localStorage["dopamine-clicker:save"]` is seeded with `{not json` before the first page load
- **WHEN** the page `/` is loaded
- **THEN** the main button is visible and enabled and `[data-testid="balance"]` is not visible
- **WHEN** the user clicks the main button once
- **THEN** `[data-testid="balance"]` shows `1`
- **AND** `localStorage["dopamine-clicker:save"]` parsed deep-equals `{ version: 3, state: S({ balance: 1, totalClicks: 1 }) }`
- **AND** `localStorage["dopamine-clicker:save:bad"]` is `{not json`

### Requirement: Corrupted-save backup
Whenever loading the game from storage yields status `corrupted` and the raw stored string was
non-null, the raw string SHALL be copied verbatim to `dopamine-clicker:save:bad` (overwriting any
previous backup) before the fresh state is returned. Loading SHALL NOT write the backup key for
statuses `fresh`, `loaded` or `migrated`, and SHALL NOT modify `dopamine-clicker:save` itself (the
next save overwrites it). A failing backup write SHALL NOT throw and SHALL NOT change the load
result. The pure raw-string parser does not touch storage; only loading from storage writes the
backup.

#### Scenario: Invalid JSON is backed up [unit]
- **GIVEN** an in-memory storage with `dopamine-clicker:save` = `"{not json"`
- **WHEN** the game is loaded
- **THEN** the result is `{ state: FRESH, status: "corrupted" }`
- **AND** `getItem("dopamine-clicker:save:bad")` is `"{not json"`
- **AND** `getItem("dopamine-clicker:save")` is still `"{not json"`

#### Scenario: Failed validation is backed up [unit]
- **GIVEN** an in-memory storage with `dopamine-clicker:save` = `RAW_V1(-5, 1)`
- **WHEN** the game is loaded
- **THEN** the status is `"corrupted"`
- **AND** `getItem("dopamine-clicker:save:bad")` is `RAW_V1(-5, 1)`

#### Scenario: Future version is backed up [unit]
- **GIVEN** an in-memory storage with `dopamine-clicker:save` = `"{\"version\":4,\"state\":{\"balance\":10,\"totalClicks\":10}}"`
- **WHEN** the game is loaded with default options
- **THEN** the status is `"corrupted"`
- **AND** `getItem("dopamine-clicker:save:bad")` is `"{\"version\":4,\"state\":{\"balance\":10,\"totalClicks\":10}}"`

#### Scenario: Failed migration is backed up [unit]
- **GIVEN** an in-memory storage with `dopamine-clicker:save` = `RAW_V1(8, 9)`
- **WHEN** the game is loaded with options `{ migrations: { 1: () => { throw new Error("boom") } }, targetVersion: 2 }`
- **THEN** the result is `{ state: FRESH, status: "corrupted" }`
- **AND** `getItem("dopamine-clicker:save:bad")` is `RAW_V1(8, 9)`

#### Scenario: New backup overwrites the previous one [unit]
- **GIVEN** an in-memory storage with `dopamine-clicker:save:bad` = `"old"` and `dopamine-clicker:save` = `"[]"`
- **WHEN** the game is loaded
- **THEN** `getItem("dopamine-clicker:save:bad")` is `"[]"`

#### Scenario: No backup for fresh, loaded or migrated [unit]
- **GIVEN** four in-memory storages: (a) empty, (b) `dopamine-clicker:save` = `V3(S({ balance: 3, totalClicks: 3 }))`, (c) `dopamine-clicker:save` = `RAW_V1(3, 3)`, (d) `dopamine-clicker:save` = `V2(S2({ balance: 3, totalClicks: 3 }))`
- **WHEN** all four are loaded with default options
- **THEN** the statuses are `"fresh"`, `"loaded"`, `"migrated"`, `"migrated"` respectively
- **AND** in all four storages `getItem("dopamine-clicker:save:bad")` is `null`

#### Scenario: Existing backup untouched by a valid load [unit]
- **GIVEN** an in-memory storage with `dopamine-clicker:save:bad` = `"old"` and `dopamine-clicker:save` = `V3(S({ balance: 3, totalClicks: 3 }))`
- **WHEN** the game is loaded
- **THEN** the status is `"loaded"` and `getItem("dopamine-clicker:save:bad")` is still `"old"`

#### Scenario: Backup write failure does not throw [unit]
- **GIVEN** a storage whose `getItem("dopamine-clicker:save")` returns `"{not json"` and whose `setItem` always throws `new Error("QuotaExceededError")`
- **WHEN** the game is loaded
- **THEN** nothing is thrown and the result is `{ state: FRESH, status: "corrupted" }`

#### Scenario: Parsing a raw string never writes storage [unit]
- **WHEN** the raw string `"{not json"` is parsed as a save (no storage involved)
- **THEN** the result is `{ state: FRESH, status: "corrupted" }` (the parser has no storage parameter; the backup is the loader's job)

### Requirement: Migration hook
Loading SHALL pass the envelope through a migration table keyed by source version, where entry `N`
converts a version-`N` state payload into a version-`N+1` payload. Steps SHALL run in ascending
order until the target version is reached; the result is then validated. If a step is missing, a
step throws, the version is below 1, or the version is above the target, migration SHALL fail and
loading SHALL fall back as `corrupted`. The built-in table is `MIGRATIONS = { 1: migrateV1ToV2,
2: migrateV2ToV3 }` (current version 3). Tests may inject a table and a target version.

#### Scenario: Built-in table [unit]
- **WHEN** `MIGRATIONS` is read
- **THEN** `Object.keys(MIGRATIONS)` equals `["1", "2"]`, `MIGRATIONS[1]` is `migrateV1ToV2` and `MIGRATIONS[2]` is `migrateV2ToV3`

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
- **WHEN** `{ version: 4, state: { balance: 0, totalClicks: 0 } }` is migrated with an empty table to target 3
- **THEN** the result is `null`

#### Scenario: Migrated load reports status migrated [unit]
- **WHEN** `RAW_V1(8, 9)` is parsed with the default options
- **THEN** the result is `{ state: S({ balance: 8, totalClicks: 9 }), status: "migrated" }` (v1 → v2 → v3)

#### Scenario: Migrated state that fails validation is corrupted [unit]
- **GIVEN** options `{ migrations: { 1: () => ({ balance: -1, totalClicks: 0 }) }, targetVersion: 2 }`
- **WHEN** `RAW_V1(8, 9)` is parsed with those options
- **THEN** the result is `{ state: FRESH, status: "corrupted" }`

### Requirement: Progress persists across reloads
The UI SHALL load the saved state before enabling the main button and SHALL save the state after
every change: every main-button press, purchase, skin toggle, every helper tick that adds at least
one whole click, and every reset (DECISION (confirmed), add-shop-v1 design D11). Runtime-only
changes (combo decay, golden-button countdown / spawn / expiry / catch, bonus timer, crit effect,
main-click carry) SHALL NOT write storage (DECISION (confirmed), design D2).

#### Scenario: Reload keeps balance [e2e]
Updated test in `e2e/add-foundation.spec.ts` (expected envelope is now v3).
- **GIVEN** the page `/` is loaded with empty storage
- **WHEN** the user clicks the main button 5 times and reloads the page
- **THEN** `[data-testid="balance"]` shows `5`
- **AND** `localStorage["dopamine-clicker:save"]` parsed deep-equals `{ version: 3, state: S({ balance: 5, totalClicks: 5 }) }`

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

### Requirement: Stage 1 saves migrate to v2
`migrateV1ToV2(state)` SHALL, for a non-array object, return `{ balance: state.balance,
totalClicks: state.totalClicks, ownedSkins: [], enabledSkins: [], material: "classic", decor: [],
upgrades: [], helpers: { monkey: 0 } }` (the v2 payload; other v1 keys dropped; values not
validated here), and for any other input return the input unchanged (so validation rejects it). A
v1 save SHALL be migrated v1 → v2 → v3 on load, keep its balance and total clicks, load with status
`migrated`, and be rewritten as v3 on the next save; loading itself SHALL NOT rewrite it.

#### Scenario: Migrate a v1 payload [unit]
- **WHEN** `migrateV1ToV2({ balance: 7, totalClicks: 9 })` is called
- **THEN** the result deep-equals `S2({ balance: 7, totalClicks: 9 })`

#### Scenario: Extra v1 keys are dropped [unit]
- **WHEN** `migrateV1ToV2({ balance: 1, totalClicks: 2, foo: 3 })` is called
- **THEN** the result deep-equals `S2({ balance: 1, totalClicks: 2 })` (no `foo`)

#### Scenario: Values are passed through for later validation [unit]
- **WHEN** `migrateV1ToV2({ balance: -5, totalClicks: 1 })` is called
- **THEN** the result deep-equals `S2({ balance: -5, totalClicks: 1 })`

#### Scenario: Non-object payloads are returned unchanged [unit]
- **WHEN** `migrateV1ToV2` is called with `null`, `42`, `"x"`, and an array `A = [1]`
- **THEN** the results are `null`, `42`, `"x"` and `A` (same reference)
- **AND** parsing `"{\"version\":1,\"state\":null}"` with default options gives `{ state: FRESH, status: "corrupted" }`

#### Scenario: Loading a v1 save does not rewrite it [unit]
- **GIVEN** an in-memory storage with `dopamine-clicker:save` = `RAW_V1(40, 12)`
- **WHEN** the game is loaded with default options
- **THEN** the result is `{ state: S({ balance: 40, totalClicks: 12 }), status: "migrated" }`
- **AND** `getItem("dopamine-clicker:save")` is still `RAW_V1(40, 12)` and `getItem("dopamine-clicker:save:bad")` is `null`

#### Scenario: Stage 1 player continues in Stage 2 [e2e]
Updated test in `e2e/add-shop-v1.spec.ts` (expected envelope is now v3).
- **GIVEN** `localStorage["dopamine-clicker:save"]` is seeded with `{"version":1,"state":{"balance":40,"totalClicks":12}}`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="balance"]` shows `40`, `[data-testid="shop"]` is visible and `[data-testid="shop-buy-soft-shadow"]` is enabled
- **WHEN** the user clicks the main button once
- **THEN** `localStorage["dopamine-clicker:save"]` parsed deep-equals `{ version: 3, state: S({ balance: 41, totalClicks: 13 }) }`

### Requirement: Stage 2 saves migrate to v3
`migrateV2ToV3(state)` SHALL, for a non-array object `s`, return `{ balance: s.balance,
totalClicks: s.totalClicks, ownedSkins: s.ownedSkins, enabledSkins: s.enabledSkins, material:
s.material, decor: s.decor, upgrades: s.upgrades, helpers: <see below>, levels: { crit: 0,
"speed-monkey": 0, "speed-robot": 0, "speed-factory": 0 } }` where `helpers` is `{ monkey:
s.helpers.monkey, robot: 0, factory: 0 }` when `s.helpers` is a non-array object and `s.helpers`
unchanged otherwise (other keys dropped; values not validated here). For any other input it SHALL
return the input unchanged. A v2 save SHALL load with status `migrated` keeping every Stage 2
purchase, and SHALL be rewritten as v3 on the next save; loading itself SHALL NOT rewrite it
(design D16).

#### Scenario: Migrate a v2 payload [unit]
- **WHEN** `migrateV2ToV3(S2({ balance: 7, totalClicks: 900, ownedSkins: ["squish", "gold"], enabledSkins: ["squish"], material: "gold", decor: [{ id: "lava-lamp", position: { x: 0.8, y: 0.1 } }], upgrades: ["double-click"], helpers: { monkey: 3 } }))` is called
- **THEN** the result deep-equals `S({ balance: 7, totalClicks: 900, ownedSkins: ["squish", "gold"], enabledSkins: ["squish"], material: "gold", decor: [{ id: "lava-lamp", position: { x: 0.8, y: 0.1 } }], upgrades: ["double-click"], helpers: { monkey: 3 } })`

#### Scenario: Extra v2 keys are dropped and new fields start at 0 [unit]
- **WHEN** `migrateV2ToV3({ ...S2({}), foo: 1, helpers: { monkey: 2, robot: 5 }, levels: { crit: 3 } })` is called
- **THEN** the result deep-equals `S({ helpers: { monkey: 2 } })` (no `foo`; `robot`, `factory` and every level are `0`)

#### Scenario: Values are passed through for later validation [unit]
- **WHEN** `migrateV2ToV3({ ...S2({}), balance: -5 })` and `migrateV2ToV3({ ...S2({}), helpers: null })` are called
- **THEN** the results deep-equal `{ ...FRESH, balance: -5 }` and `{ ...FRESH, helpers: null }`

#### Scenario: Non-object payloads are returned unchanged [unit]
- **WHEN** `migrateV2ToV3` is called with `null`, `42`, `"x"`, and an array `A = [1]`
- **THEN** the results are `null`, `42`, `"x"` and `A` (same reference)

#### Scenario: v2 save loads as migrated [unit]
- **WHEN** `V2(S2({ balance: 12, totalClicks: 80, upgrades: ["double-click"], helpers: { monkey: 2 } }))` is parsed with the default options
- **THEN** the result is `{ state: S({ balance: 12, totalClicks: 80, upgrades: ["double-click"], helpers: { monkey: 2 } }), status: "migrated" }`

#### Scenario: Invalid v2 save is corrupted [unit]
- **WHEN** `V2(S2({ totalClicks: 250, upgrades: ["triple-click"] }))` is parsed with the default options
- **THEN** the result is `{ state: FRESH, status: "corrupted" }`

#### Scenario: Loading a v2 save does not rewrite it [unit]
- **GIVEN** an in-memory storage with `dopamine-clicker:save` = `V2(S2({ balance: 40, totalClicks: 70 }))`
- **WHEN** the game is loaded with default options
- **THEN** the status is `"migrated"`, `getItem("dopamine-clicker:save")` is still `V2(S2({ balance: 40, totalClicks: 70 }))` and `getItem("dopamine-clicker:save:bad")` is `null`

#### Scenario: Stage 2 player continues in Stage 3 [e2e]
New test in `e2e/add-upgrades-v2.spec.ts`.
- **GIVEN** `localStorage["dopamine-clicker:save"]` is seeded with `V2(S2({ balance: 40, totalClicks: 70, ownedSkins: ["squish"], enabledSkins: ["squish"], upgrades: ["double-click"] }))`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="balance"]` shows `40`, `[data-testid="skin-toggle-squish"]` has `aria-pressed="true"` and `[data-testid="shop-owned-double-click"]` has text `Куплено`
- **WHEN** the user clicks the main button once
- **THEN** `localStorage["dopamine-clicker:save"]` parsed deep-equals `{ version: 3, state: S({ balance: 42, totalClicks: 71, ownedSkins: ["squish"], enabledSkins: ["squish"], upgrades: ["double-click"] }) }`

#### Scenario: Stage 2 monkeys keep their count [e2e]
New test in `e2e/add-upgrades-v2.spec.ts`.
- **GIVEN** `localStorage["dopamine-clicker:save"]` is seeded with `V2(S2({ balance: 0, totalClicks: 100, helpers: { monkey: 3 } }))`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="helper-monkey-count"]` has text `×3` and `[data-testid="shop-count-monkey"]` has text `Маєте: 3`
