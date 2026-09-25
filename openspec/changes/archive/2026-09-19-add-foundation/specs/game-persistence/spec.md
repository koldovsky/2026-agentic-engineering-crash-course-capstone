# Spec Delta: game-persistence

## Purpose

Keeps the game state across page reloads in the browser's localStorage using a versioned schema
with a migration path, recovers safely from corrupted data, and lets the player reset progress.

Scenario tags: `[unit]` = Vitest test in `lib/game/save.test.ts`, `[e2e]` = Playwright test in
`e2e/add-foundation.spec.ts`. Unit tests use an in-memory `KeyValueStorage` fake (a `Map`-backed
object), never the real `window.localStorage`.

Storage keys (confirmed by human): game save `dopamine-clicker:save`, corrupted-save backup
`dopamine-clicker:save:bad`, theme `dopamine-clicker:theme`, language `dopamine-clicker:lang`.
Current save version: `1`.

## ADDED Requirements

### Requirement: Versioned save format
The game state SHALL be stored under the key `dopamine-clicker:save` as JSON of the envelope
`{ "version": 1, "state": { "balance": <int>, "totalClicks": <int> } }`. Only these two state
fields are written.

#### Scenario: Serialize state [unit]
- **WHEN** the state `{ balance: 12, totalClicks: 30 }` is serialized
- **THEN** `JSON.parse` of the result deep-equals `{ version: 1, state: { balance: 12, totalClicks: 30 } }`

#### Scenario: Save writes to the save key [unit]
- **GIVEN** an empty in-memory storage
- **WHEN** the state `{ balance: 5, totalClicks: 5 }` is saved
- **THEN** the save function returns `true`
- **AND** `storage.getItem("dopamine-clicker:save")` parsed deep-equals `{ version: 1, state: { balance: 5, totalClicks: 5 } }`
- **AND** no other key is written

#### Scenario: Save survives a storage write error [unit]
- **GIVEN** a storage whose `setItem` throws `new Error("QuotaExceededError")`
- **WHEN** the state `{ balance: 1, totalClicks: 1 }` is saved
- **THEN** the save function returns `false` and does not throw

#### Scenario: Round trip [unit]
- **GIVEN** an empty in-memory storage
- **WHEN** `{ balance: 1234, totalClicks: 2000 }` is saved and then loaded
- **THEN** the load result is `{ state: { balance: 1234, totalClicks: 2000 }, status: "loaded" }`

### Requirement: State validation
A stored state SHALL be accepted only if it is an object whose `balance` and `totalClicks` are both
non-negative safe integers (`Number.isSafeInteger(x) && x >= 0`). Unknown extra fields SHALL be
dropped. Anything else SHALL be rejected.

#### Scenario: Valid state accepted [unit]
- **WHEN** `{ balance: 0, totalClicks: 0 }` is validated
- **THEN** the result is `{ balance: 0, totalClicks: 0 }`

#### Scenario: Extra fields dropped [unit]
- **WHEN** `{ balance: 2, totalClicks: 3, extra: "x" }` is validated
- **THEN** the result deep-equals `{ balance: 2, totalClicks: 3 }` (no `extra` key)

#### Scenario: Invalid states rejected [unit]
- **WHEN** each of the following is validated: `null`, `42`, `"text"`, `[]`, `{}`, `{ balance: 1 }`,
  `{ totalClicks: 1 }`, `{ balance: -1, totalClicks: 0 }`, `{ balance: 0, totalClicks: -1 }`,
  `{ balance: 1.5, totalClicks: 2 }`, `{ balance: "5", totalClicks: 5 }`,
  `{ balance: NaN, totalClicks: 0 }`, `{ balance: Infinity, totalClicks: 0 }`,
  `{ balance: 0, totalClicks: 9007199254740992 }`
- **THEN** every result is `null`

### Requirement: Loading with fallback
Loading SHALL never throw. It SHALL return a fresh state `{ balance: 0, totalClicks: 0 }` with status
`fresh` when nothing is stored or storage cannot be read, and with status `corrupted` when the stored
value is not valid JSON, is not an envelope `{ version: <integer>, state: ... }`, has a version it
cannot migrate to the current one, or has an invalid state. Theme and language keys SHALL NOT be
read or changed by game loading.

#### Scenario: Nothing stored [unit]
- **GIVEN** an empty in-memory storage
- **WHEN** the game is loaded
- **THEN** the result is `{ state: { balance: 0, totalClicks: 0 }, status: "fresh" }`

#### Scenario: Storage read throws [unit]
- **GIVEN** a storage whose `getItem` throws `new Error("SecurityError")`
- **WHEN** the game is loaded
- **THEN** the result is `{ state: { balance: 0, totalClicks: 0 }, status: "fresh" }` and nothing is thrown

#### Scenario: Corrupted raw values [unit]
- **WHEN** each raw string is parsed as a save: `"{not json"`, `""`, `"null"`, `"42"`, `"[]"`,
  `"{}"`, `"{\"version\":1}"`, `"{\"state\":{\"balance\":1,\"totalClicks\":1}}"`,
  `"{\"version\":\"1\",\"state\":{\"balance\":1,\"totalClicks\":1}}"`,
  `"{\"version\":1,\"state\":{\"balance\":-5,\"totalClicks\":1}}"`
- **THEN** every result is `{ state: { balance: 0, totalClicks: 0 }, status: "corrupted" }`

#### Scenario: Null raw value is fresh, not corrupted [unit]
- **WHEN** the raw value `null` is parsed as a save
- **THEN** the result is `{ state: { balance: 0, totalClicks: 0 }, status: "fresh" }`

#### Scenario: Future version falls back [unit]
- **WHEN** `"{\"version\":2,\"state\":{\"balance\":10,\"totalClicks\":10}}"` is parsed with the default options (target version 1)
- **THEN** the result is `{ state: { balance: 0, totalClicks: 0 }, status: "corrupted" }`

#### Scenario: Version 0 falls back [unit]
- **WHEN** `"{\"version\":0,\"state\":{\"balance\":10,\"totalClicks\":10}}"` is parsed with the default options
- **THEN** the result is `{ state: { balance: 0, totalClicks: 0 }, status: "corrupted" }`

#### Scenario: Corrupted save in the browser [e2e]
- **GIVEN** `localStorage["dopamine-clicker:save"]` is seeded with `{not json` before the first page load
- **WHEN** the page `/` is loaded
- **THEN** the main button is visible and enabled and `[data-testid="balance"]` is not visible
- **WHEN** the user clicks the main button once
- **THEN** `[data-testid="balance"]` shows `1`
- **AND** `localStorage["dopamine-clicker:save"]` parsed deep-equals `{ version: 1, state: { balance: 1, totalClicks: 1 } }`
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
- **THEN** the result is `{ state: { balance: 0, totalClicks: 0 }, status: "corrupted" }`
- **AND** `getItem("dopamine-clicker:save:bad")` is `"{not json"`
- **AND** `getItem("dopamine-clicker:save")` is still `"{not json"`

#### Scenario: Failed validation is backed up [unit]
- **GIVEN** an in-memory storage with `dopamine-clicker:save` = `"{\"version\":1,\"state\":{\"balance\":-5,\"totalClicks\":1}}"`
- **WHEN** the game is loaded
- **THEN** the status is `"corrupted"`
- **AND** `getItem("dopamine-clicker:save:bad")` is `"{\"version\":1,\"state\":{\"balance\":-5,\"totalClicks\":1}}"`

#### Scenario: Future version is backed up [unit]
- **GIVEN** an in-memory storage with `dopamine-clicker:save` = `"{\"version\":2,\"state\":{\"balance\":10,\"totalClicks\":10}}"`
- **WHEN** the game is loaded with default options
- **THEN** the status is `"corrupted"`
- **AND** `getItem("dopamine-clicker:save:bad")` is `"{\"version\":2,\"state\":{\"balance\":10,\"totalClicks\":10}}"`

#### Scenario: Failed migration is backed up [unit]
- **GIVEN** an in-memory storage with `dopamine-clicker:save` = `"{\"version\":1,\"state\":{\"balance\":8,\"totalClicks\":9}}"`
- **WHEN** the game is loaded with options `{ migrations: { 1: () => { throw new Error("boom") } }, targetVersion: 2 }`
- **THEN** the result is `{ state: { balance: 0, totalClicks: 0 }, status: "corrupted" }`
- **AND** `getItem("dopamine-clicker:save:bad")` is `"{\"version\":1,\"state\":{\"balance\":8,\"totalClicks\":9}}"`

#### Scenario: New backup overwrites the previous one [unit]
- **GIVEN** an in-memory storage with `dopamine-clicker:save:bad` = `"old"` and `dopamine-clicker:save` = `"[]"`
- **WHEN** the game is loaded
- **THEN** `getItem("dopamine-clicker:save:bad")` is `"[]"`

#### Scenario: No backup for fresh, loaded or migrated [unit]
- **GIVEN** three in-memory storages: (a) empty, (b) `dopamine-clicker:save` = `"{\"version\":1,\"state\":{\"balance\":3,\"totalClicks\":3}}"`, (c) the same value as (b)
- **WHEN** (a) and (b) are loaded with default options and (c) is loaded with options `{ migrations: { 1: (s) => ({ ...s, bonus: 0 }) }, targetVersion: 2 }`
- **THEN** the statuses are `"fresh"`, `"loaded"`, `"migrated"` respectively
- **AND** in all three storages `getItem("dopamine-clicker:save:bad")` is `null`

#### Scenario: Existing backup untouched by a valid load [unit]
- **GIVEN** an in-memory storage with `dopamine-clicker:save:bad` = `"old"` and `dopamine-clicker:save` = `"{\"version\":1,\"state\":{\"balance\":3,\"totalClicks\":3}}"`
- **WHEN** the game is loaded
- **THEN** the status is `"loaded"` and `getItem("dopamine-clicker:save:bad")` is still `"old"`

#### Scenario: Backup write failure does not throw [unit]
- **GIVEN** a storage whose `getItem("dopamine-clicker:save")` returns `"{not json"` and whose `setItem` always throws `new Error("QuotaExceededError")`
- **WHEN** the game is loaded
- **THEN** nothing is thrown and the result is `{ state: { balance: 0, totalClicks: 0 }, status: "corrupted" }`

#### Scenario: Parsing a raw string never writes storage [unit]
- **WHEN** the raw string `"{not json"` is parsed as a save (no storage involved)
- **THEN** the result is `{ state: { balance: 0, totalClicks: 0 }, status: "corrupted" }` (the parser has no storage parameter; the backup is the loader's job)

### Requirement: Migration hook
Loading SHALL pass the envelope through a migration table keyed by source version, where entry `N`
converts a version-`N` state payload into a version-`N+1` payload. Steps SHALL run in ascending
order until the target version is reached; the result is then validated. If a step is missing, a
step throws, the version is below 1, or the version is above the target, migration SHALL fail and
loading SHALL fall back as `corrupted`. The built-in table is empty in this stage (current version
1). Tests inject a table and a target version.

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
- **GIVEN** options `{ migrations: { 1: (s) => ({ ...s, bonus: 0 }) }, targetVersion: 2 }`
- **WHEN** `"{\"version\":1,\"state\":{\"balance\":8,\"totalClicks\":9}}"` is parsed with those options
- **THEN** the result is `{ state: { balance: 8, totalClicks: 9 }, status: "migrated" }`

#### Scenario: Migrated state that fails validation is corrupted [unit]
- **GIVEN** options `{ migrations: { 1: () => ({ balance: -1, totalClicks: 0 }) }, targetVersion: 2 }`
- **WHEN** `"{\"version\":1,\"state\":{\"balance\":8,\"totalClicks\":9}}"` is parsed with those options
- **THEN** the result is `{ state: { balance: 0, totalClicks: 0 }, status: "corrupted" }`

### Requirement: Progress persists across reloads
The UI SHALL load the saved state before enabling the main button and SHALL save the state after
every change (every click, and every reset).

#### Scenario: Reload keeps balance [e2e]
- **GIVEN** the page `/` is loaded with empty storage
- **WHEN** the user clicks the main button 5 times and reloads the page
- **THEN** `[data-testid="balance"]` shows `5`
- **AND** `localStorage["dopamine-clicker:save"]` parsed deep-equals `{ version: 1, state: { balance: 5, totalClicks: 5 } }`

#### Scenario: Seeded save is shown with locale formatting [e2e]
- **GIVEN** `localStorage["dopamine-clicker:save"]` is seeded with `{"version":1,"state":{"balance":1234,"totalClicks":1234}}` before the first page load
- **WHEN** the page `/` is loaded (default language Ukrainian)
- **THEN** `[data-testid="balance"]` text, with every whitespace character (including U+00A0) normalized to a plain space, is `1 234`

### Requirement: Reset progress with confirmation
The screen SHALL offer a "Reset progress" action (`[data-testid="reset"]`). Activating it SHALL
open a confirmation dialog (`role="dialog"`, `[data-testid="reset-dialog"]`) with a confirm button
(`[data-testid="reset-confirm"]`) and a cancel button (`[data-testid="reset-cancel"]`); focus
SHALL move to the cancel button; Escape SHALL act as cancel. Confirming SHALL remove
`dopamine-clicker:save` from storage and set the in-memory state to `{ balance: 0, totalClicks: 0 }`
(counter hidden again). Cancelling SHALL change nothing. Reset SHALL NOT touch the theme or language
keys, nor the corrupted-save backup `dopamine-clicker:save:bad`. Clearing the save SHALL never throw.

#### Scenario: Clear removes only the save key [unit]
- **GIVEN** an in-memory storage with `dopamine-clicker:save` = a valid v1 save, `dopamine-clicker:save:bad` = `"{not json"`, `dopamine-clicker:theme` = `"dark"`, `dopamine-clicker:lang` = `"en"`
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
