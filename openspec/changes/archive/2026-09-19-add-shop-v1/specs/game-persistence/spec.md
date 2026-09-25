# Spec Delta: game-persistence

Stage 2 bumps the save schema to version 2 (shop fields), adds the first built-in migration
(v1 → v2), saves after every kind of state change, and makes reset wipe purchases too.

Scenario tags: `[unit]` = Vitest test in `lib/game/save.test.ts` (in-memory `KeyValueStorage`
fakes, never the real `window.localStorage`), `[e2e]` = Playwright test in
`e2e/add-foundation.spec.ts` (existing tests; the two noted as "updated" change their expected
envelope) or `e2e/add-shop-v1.spec.ts` (noted as "new"). Notation `FRESH`, `S({...})`, `V2(...)` is
defined in `design.md`. `RAW_V1(b, t)` = the string `{"version":1,"state":{"balance":b,"totalClicks":t}}`.

Storage keys unchanged: `dopamine-clicker:save`, `dopamine-clicker:save:bad`,
`dopamine-clicker:theme`, `dopamine-clicker:lang`. Current save version: `2`.

## MODIFIED Requirements

### Requirement: Versioned save format
The game state SHALL be stored under the key `dopamine-clicker:save` as JSON of the envelope
`{ "version": 2, "state": <GameState> }` where the state has exactly the keys `balance`,
`totalClicks`, `ownedSkins`, `enabledSkins`, `material`, `decor`, `upgrades`, `helpers` (decor
entries exactly `id`, `position`; positions exactly `x`, `y`; `helpers` exactly `monkey`). No
timestamps or runtime values (e.g. the helper carry) are written.

#### Scenario: Constants [unit]
- **WHEN** the constants are read
- **THEN** `SAVE_KEY` is `"dopamine-clicker:save"`, `SAVE_BACKUP_KEY` is `"dopamine-clicker:save:bad"` and `CURRENT_SAVE_VERSION` is `2`

#### Scenario: Serialize state [unit]
- **WHEN** the state `S({ balance: 12, totalClicks: 30 })` is serialized
- **THEN** `JSON.parse` of the result deep-equals `{ version: 2, state: S({ balance: 12, totalClicks: 30 }) }`

#### Scenario: Serialize writes only schema fields [unit]
- **WHEN** `{ ...S({ balance: 1, totalClicks: 1, decor: [{ id: "lava-lamp", position: { x: 0.5, y: 0.25 } }] }), carry: 400, savedAt: 123 }` (cast to `GameState`) is serialized
- **THEN** `JSON.parse` of the result deep-equals `{ version: 2, state: S({ balance: 1, totalClicks: 1, decor: [{ id: "lava-lamp", position: { x: 0.5, y: 0.25 } }] }) }` (no `carry`, no `savedAt`)

#### Scenario: Save writes to the save key [unit]
- **GIVEN** an empty in-memory storage
- **WHEN** the state `S({ balance: 5, totalClicks: 5 })` is saved
- **THEN** the save function returns `true`
- **AND** `storage.getItem("dopamine-clicker:save")` parsed deep-equals `{ version: 2, state: S({ balance: 5, totalClicks: 5 }) }`
- **AND** no other key is written

#### Scenario: Save survives a storage write error [unit]
- **GIVEN** a storage whose `setItem` throws `new Error("QuotaExceededError")`
- **WHEN** the state `S({ balance: 1, totalClicks: 1 })` is saved
- **THEN** the save function returns `false` and does not throw

#### Scenario: Round trip [unit]
- **GIVEN** an empty in-memory storage and `F = S({ balance: 1234, totalClicks: 2000, ownedSkins: ["soft-shadow", "squish", "floating-number", "jumping-cap", "gold"], enabledSkins: ["squish", "jumping-cap"], material: "gold", decor: [{ id: "sleeping-cat", position: { x: 0.125, y: 0.5 } }, { id: "lava-lamp", position: null }, { id: "hydraulic-press", position: { x: 0.75, y: 0.0625 } }], upgrades: ["double-click", "triple-click"], helpers: { monkey: 7 } })`
- **WHEN** `F` is saved and then loaded
- **THEN** the load result is `{ state: F, status: "loaded" }`

### Requirement: State validation
A stored v2 state SHALL be accepted only if: it is a non-array object; `balance`, `totalClicks` and
`helpers.monkey` are non-negative safe integers; `ownedSkins` is an array of distinct `SkinId`s;
`enabledSkins` is an array of distinct `StackSkinId`s each contained in `ownedSkins`; `material` is
`"classic"` or `"gold"` and `"gold"` only if Gold is owned; `decor` is an array of objects with a
distinct `DecorId` `id` and a `position` that is `null` or an object with finite `x`, `y` in `[0, 1]`;
`upgrades` is an array of distinct `ClickUpgradeId`s containing `"triple-click"` only together with
`"double-click"`; `helpers` is a non-array object. The result SHALL be a normalized copy: every
array re-sorted into catalog order and unknown keys dropped at every level. Anything else SHALL be
rejected (`null`) (DECISION (confirmed), design D13).

#### Scenario: Valid state accepted [unit]
- **WHEN** `FRESH` is validated
- **THEN** the result deep-equals `FRESH`

#### Scenario: Extra fields dropped [unit]
- **WHEN** `{ ...S({ balance: 2, totalClicks: 3 }), extra: "x" }` is validated
- **THEN** the result deep-equals `S({ balance: 2, totalClicks: 3 })` (no `extra` key)

#### Scenario: Normalization [unit]
- **WHEN** `{ ...S({ totalClicks: 300, ownedSkins: ["gold", "jumping-cap", "soft-shadow"], enabledSkins: ["jumping-cap", "soft-shadow"], material: "gold", decor: [{ id: "lava-lamp", position: { x: 0.5, y: 0.5, z: 1 } }, { id: "sleeping-cat", position: null, hidden: true }], upgrades: ["triple-click", "double-click"], helpers: { monkey: 2, robot: 5 } }), extra: "x" }` is validated
- **THEN** the result deep-equals `S({ totalClicks: 300, ownedSkins: ["soft-shadow", "jumping-cap", "gold"], enabledSkins: ["soft-shadow", "jumping-cap"], material: "gold", decor: [{ id: "sleeping-cat", position: null }, { id: "lava-lamp", position: { x: 0.5, y: 0.5 } }], upgrades: ["double-click", "triple-click"], helpers: { monkey: 2 } })` (no `extra`, `z`, `hidden`, `robot`)

#### Scenario: Position bounds are inclusive [unit]
- **WHEN** `S({ decor: [{ id: "lava-lamp", position: { x: 0, y: 1 } }] })` is validated
- **THEN** the result deep-equals the input

#### Scenario: Invalid states rejected [unit]
- **WHEN** each of the following is validated: `null`, `42`, `"text"`, `[]`, `{}`, `{ balance: 0, totalClicks: 0 }` (a v1 payload),
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
  `{ ...FRESH, upgrades: ["triple-click"] }`, `{ ...FRESH, upgrades: ["crit"] }`, `{ ...FRESH, upgrades: ["double-click", "double-click"] }`,
  `{ ...FRESH, helpers: null }`, `{ ...FRESH, helpers: [] }`, `{ ...FRESH, helpers: {} }`, `{ ...FRESH, helpers: { monkey: -1 } }`, `{ ...FRESH, helpers: { monkey: 1.5 } }`
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
  `"{\"version\":2,\"state\":{\"balance\":10,\"totalClicks\":10}}"` (v2 envelope with a v1 payload)
- **THEN** every result is `{ state: FRESH, status: "corrupted" }`

#### Scenario: Null raw value is fresh, not corrupted [unit]
- **WHEN** the raw value `null` is parsed as a save
- **THEN** the result is `{ state: FRESH, status: "fresh" }`

#### Scenario: Future version falls back [unit]
- **WHEN** `{"version":3,"state":<S({ balance: 10, totalClicks: 10 }) as JSON>}` is parsed with the default options (target version 2)
- **THEN** the result is `{ state: FRESH, status: "corrupted" }`

#### Scenario: Version 0 falls back [unit]
- **WHEN** `"{\"version\":0,\"state\":{\"balance\":10,\"totalClicks\":10}}"` is parsed with the default options
- **THEN** the result is `{ state: FRESH, status: "corrupted" }`

#### Scenario: Current version loads [unit]
- **WHEN** `V2(S({ balance: 4, totalClicks: 20, upgrades: ["double-click"] }))` is parsed with the default options
- **THEN** the result is `{ state: S({ balance: 4, totalClicks: 20, upgrades: ["double-click"] }), status: "loaded" }`

#### Scenario: Corrupted save in the browser [e2e]
Updated test in `e2e/add-foundation.spec.ts` (expected envelope is now v2).
- **GIVEN** `localStorage["dopamine-clicker:save"]` is seeded with `{not json` before the first page load
- **WHEN** the page `/` is loaded
- **THEN** the main button is visible and enabled and `[data-testid="balance"]` is not visible
- **WHEN** the user clicks the main button once
- **THEN** `[data-testid="balance"]` shows `1`
- **AND** `localStorage["dopamine-clicker:save"]` parsed deep-equals `{ version: 2, state: S({ balance: 1, totalClicks: 1 }) }`
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
- **GIVEN** an in-memory storage with `dopamine-clicker:save` = `"{\"version\":3,\"state\":{\"balance\":10,\"totalClicks\":10}}"`
- **WHEN** the game is loaded with default options
- **THEN** the status is `"corrupted"`
- **AND** `getItem("dopamine-clicker:save:bad")` is `"{\"version\":3,\"state\":{\"balance\":10,\"totalClicks\":10}}"`

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
- **GIVEN** three in-memory storages: (a) empty, (b) `dopamine-clicker:save` = `V2(S({ balance: 3, totalClicks: 3 }))`, (c) `dopamine-clicker:save` = `RAW_V1(3, 3)`
- **WHEN** all three are loaded with default options
- **THEN** the statuses are `"fresh"`, `"loaded"`, `"migrated"` respectively
- **AND** in all three storages `getItem("dopamine-clicker:save:bad")` is `null`

#### Scenario: Existing backup untouched by a valid load [unit]
- **GIVEN** an in-memory storage with `dopamine-clicker:save:bad` = `"old"` and `dopamine-clicker:save` = `V2(S({ balance: 3, totalClicks: 3 }))`
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
loading SHALL fall back as `corrupted`. The built-in table is `MIGRATIONS = { 1: migrateV1ToV2 }`
(current version 2). Tests may inject a table and a target version.

#### Scenario: Built-in table [unit]
- **WHEN** `MIGRATIONS` is read
- **THEN** `Object.keys(MIGRATIONS)` equals `["1"]` and `MIGRATIONS[1]` is `migrateV1ToV2`

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
- **WHEN** `{ version: 3, state: { balance: 0, totalClicks: 0 } }` is migrated with an empty table to target 2
- **THEN** the result is `null`

#### Scenario: Migrated load reports status migrated [unit]
- **WHEN** `RAW_V1(8, 9)` is parsed with the default options
- **THEN** the result is `{ state: S({ balance: 8, totalClicks: 9 }), status: "migrated" }`

#### Scenario: Migrated state that fails validation is corrupted [unit]
- **GIVEN** options `{ migrations: { 1: () => ({ balance: -1, totalClicks: 0 }) }, targetVersion: 2 }`
- **WHEN** `RAW_V1(8, 9)` is parsed with those options
- **THEN** the result is `{ state: FRESH, status: "corrupted" }`

### Requirement: Progress persists across reloads
The UI SHALL load the saved state before enabling the main button and SHALL save the state after
every change: every main-button click, purchase, skin toggle, every helper tick that adds at least
one whole click, and every reset (DECISION (confirmed), design D11).

#### Scenario: Reload keeps balance [e2e]
Updated test in `e2e/add-foundation.spec.ts` (expected envelope is now v2).
- **GIVEN** the page `/` is loaded with empty storage
- **WHEN** the user clicks the main button 5 times and reloads the page
- **THEN** `[data-testid="balance"]` shows `5`
- **AND** `localStorage["dopamine-clicker:save"]` parsed deep-equals `{ version: 2, state: S({ balance: 5, totalClicks: 5 }) }`

#### Scenario: Seeded save is shown with locale formatting [e2e]
- **GIVEN** `localStorage["dopamine-clicker:save"]` is seeded with `{"version":1,"state":{"balance":1234,"totalClicks":1234}}` before the first page load
- **WHEN** the page `/` is loaded (default language Ukrainian)
- **THEN** `[data-testid="balance"]` text, with every whitespace character (including U+00A0) normalized to a plain space, is `1 234`

#### Scenario: Purchases and toggles survive reload [e2e]
New test in `e2e/add-shop-v1.spec.ts`.
- **GIVEN** storage is seeded with `V2(S({ balance: 425, totalClicks: 150 }))`
- **WHEN** the user buys `squish` (25), `double-click` (100), `lava-lamp` (200) and `monkey` (50), then clicks `[data-testid="skin-toggle-squish"]` once, then reloads the page
- **THEN** `[data-testid="skin-toggle-squish"]` has `aria-pressed="false"`, `[data-testid="shop-owned-double-click"]` and `[data-testid="shop-owned-lava-lamp"]` have text `Куплено`, `[data-testid="decor-lava-lamp"]` is visible, `[data-testid="helper-monkey-count"]` has text `×1`
- **AND** the saved state has `ownedSkins: ["squish"]`, `enabledSkins: []`, `upgrades: ["double-click"]`, `helpers: { monkey: 1 }`, one decor entry with id `lava-lamp`, and `totalClicks` ≥ 150

### Requirement: Reset progress with confirmation
The screen SHALL offer a "Reset progress" action (`[data-testid="reset"]`). Activating it SHALL
open a confirmation dialog (`role="dialog"`, `[data-testid="reset-dialog"]`) with a confirm button
(`[data-testid="reset-confirm"]`) and a cancel button (`[data-testid="reset-cancel"]`); focus
SHALL move to the cancel button; Escape SHALL act as cancel. Confirming SHALL remove
`dopamine-clicker:save` from storage, set the in-memory state to `FRESH` (counter hidden, shop
hidden, all skins, decor, upgrades and helpers gone) and reset the helper carry to 0. Cancelling
SHALL change nothing. Reset SHALL NOT touch the theme or language keys, nor the corrupted-save
backup `dopamine-clicker:save:bad`. Clearing the save SHALL never throw.

#### Scenario: Clear removes only the save key [unit]
- **GIVEN** an in-memory storage with `dopamine-clicker:save` = `V2(S({ balance: 3, totalClicks: 3 }))`, `dopamine-clicker:save:bad` = `"{not json"`, `dopamine-clicker:theme` = `"dark"`, `dopamine-clicker:lang` = `"en"`
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
New test in `e2e/add-shop-v1.spec.ts`.
- **GIVEN** storage is seeded with `V2(S({ balance: 40, totalClicks: 800, ownedSkins: ["jumping-cap", "gold"], enabledSkins: ["jumping-cap"], material: "gold", decor: [{ id: "lava-lamp", position: { x: 0.8, y: 0.1 } }], upgrades: ["double-click"], helpers: { monkey: 2 } }))`
- **WHEN** the user clicks `[data-testid="reset"]` and then `[data-testid="reset-confirm"]`
- **THEN** `[data-testid="shop"]`, `[data-testid="balance"]` are not visible; `[data-testid="decor-lava-lamp"]`, `[data-testid="helper-monkey"]`, `[data-testid="jumping-cap"]` have count 0; the main button has `data-skins=""` and `data-material="classic"`
- **AND** `localStorage["dopamine-clicker:save"]` is `null`
- **WHEN** the user clicks the main button once and waits 1500 ms
- **THEN** `[data-testid="balance"]` shows `1` (no ×2, no monkey income)

## ADDED Requirements

### Requirement: Stage 1 saves migrate to v2
`migrateV1ToV2(state)` SHALL, for a non-array object, return `{ balance: state.balance,
totalClicks: state.totalClicks, ownedSkins: [], enabledSkins: [], material: "classic", decor: [],
upgrades: [], helpers: { monkey: 0 } }` (other v1 keys dropped; values not validated here), and for
any other input return the input unchanged (so validation rejects it). A v1 save SHALL therefore
load with status `migrated`, keeping its balance and total clicks, and SHALL be rewritten as v2 on
the next save; loading itself SHALL NOT rewrite it.

#### Scenario: Migrate a v1 payload [unit]
- **WHEN** `migrateV1ToV2({ balance: 7, totalClicks: 9 })` is called
- **THEN** the result deep-equals `S({ balance: 7, totalClicks: 9 })`

#### Scenario: Extra v1 keys are dropped [unit]
- **WHEN** `migrateV1ToV2({ balance: 1, totalClicks: 2, foo: 3 })` is called
- **THEN** the result deep-equals `S({ balance: 1, totalClicks: 2 })` (no `foo`)

#### Scenario: Values are passed through for later validation [unit]
- **WHEN** `migrateV1ToV2({ balance: -5, totalClicks: 1 })` is called
- **THEN** the result deep-equals `{ ...FRESH, balance: -5, totalClicks: 1 }`

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
New test in `e2e/add-shop-v1.spec.ts`.
- **GIVEN** `localStorage["dopamine-clicker:save"]` is seeded with `{"version":1,"state":{"balance":40,"totalClicks":12}}`
- **WHEN** the page `/` is loaded
- **THEN** `[data-testid="balance"]` shows `40`, `[data-testid="shop"]` is visible and `[data-testid="shop-buy-soft-shadow"]` is enabled
- **WHEN** the user clicks the main button once
- **THEN** `localStorage["dopamine-clicker:save"]` parsed deep-equals `{ version: 2, state: S({ balance: 41, totalClicks: 13 }) }`
