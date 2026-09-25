# Spec Delta: achievements

Thirty cosmetic achievements evaluated purely from the current game state plus four lifetime
counters, a sticky unlocked set kept in its own storage key (`dopamine-clicker:trophies`, design
D12 — never inside the game save), one toast per unlock with a queue, and a panel that lists all of
them with progress.

Scenario tags: `[unit]` = Vitest test in `lib/game/achievements.test.ts`, `[e2e]` = Playwright test
in `e2e/add-content-v3.spec.ts` (viewport 1280 × 720, Ukrainian, `reducedMotion:
"no-preference"` unless stated). `FRESH`, `S({...})`, `V3(...)`, `V4(...)`, `T0`, `TR({...})`,
`TF(...)`, `ST0`, "the clock is paused", "the clock runs N ms" and "the random hook is fixed to r"
are defined in `design.md`. `A({...})` = an `AchievementStats` object with every metric `0` except
the listed ones. "The trophy file" is `localStorage["dopamine-clicker:trophies"]`.

## ADDED Requirements

### Requirement: Achievement catalog
`ACHIEVEMENTS` SHALL list exactly these 30 entries in this order (display order and canonical order
of `trophies.unlocked`), each `{ id, category, metric, threshold }` (DECISION (confirmed), design D10):

| # | id | category | metric | threshold |
|---|---|---|---|---|
| 1 | `first-click` | clicks | `totalClicks` | 1 |
| 2 | `clicks-100` | clicks | `totalClicks` | 100 |
| 3 | `clicks-1000` | clicks | `totalClicks` | 1000 |
| 4 | `clicks-10000` | clicks | `totalClicks` | 10000 |
| 5 | `clicks-100000` | clicks | `totalClicks` | 100000 |
| 6 | `balance-1000` | balance | `balance` | 1000 |
| 7 | `balance-50000` | balance | `balance` | 50000 |
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

`getAchievement(id)` SHALL return the entry with that id. `isAchievementUnlocked(achievement,
stats)` SHALL be `stats[achievement.metric] >= achievement.threshold`.
`getAchievementProgress(achievement, stats)` SHALL be
`Math.min(1, Math.max(0, stats[metric] / threshold))`.

#### Scenario: Catalog ids and order [unit]
- **WHEN** `ACHIEVEMENTS.map((a) => a.id)` is read
- **THEN** it equals `["first-click", "clicks-100", "clicks-1000", "clicks-10000", "clicks-100000", "balance-1000", "balance-50000", "first-purchase", "purchases-10", "purchases-25", "skins-3", "skins-all", "gold-equipped", "first-decor", "decor-all", "cat-nap", "first-video", "videos-all", "first-helper", "helpers-10", "factory-owner", "first-crit", "crits-100", "combo-5", "combo-max", "first-golden", "golden-10", "reset-once", "achievements-10", "achievements-all"]`
- **AND** `ACHIEVEMENTS.length` is `30` and every id occurs exactly once

#### Scenario: Catalog entries [unit]
- **WHEN** each entry of `ACHIEVEMENTS` is read
- **THEN** each deep-equals its row in the table above, e.g. `getAchievement("clicks-1000")` equals `{ id: "clicks-1000", category: "clicks", metric: "totalClicks", threshold: 1000 }`, `getAchievement("gold-equipped")` equals `{ id: "gold-equipped", category: "skins", metric: "goldEquipped", threshold: 1 }` and `getAchievement("achievements-all")` equals `{ id: "achievements-all", category: "meta", metric: "achievementsUnlocked", threshold: 29 }`

#### Scenario: Unlock predicate and progress [unit]
- **WHEN** `isAchievementUnlocked(getAchievement("clicks-100"), A({ totalClicks: 99 }))` and `… A({ totalClicks: 100 })` are evaluated
- **THEN** the results are `false` and `true`
- **WHEN** `getAchievementProgress(getAchievement("clicks-100"), A({ totalClicks: 0 }))`, `… A({ totalClicks: 25 })`, `… A({ totalClicks: 100 })` and `… A({ totalClicks: 4000 })` are evaluated
- **THEN** the results are `0`, `0.25`, `1` and `1`

### Requirement: Achievement stats derived from the state and the trophy counters
`getAchievementStats(state, trophies)` SHALL return an object with exactly the 15 metric keys of
design D10, each a number: `totalClicks` and `balance` copied from the state; `purchases` =
`ownedSkins.length + decor.length + videos.length + upgrades.length + helpers.monkey +
helpers.robot + helpers.factory + levels.crit + levels["speed-monkey"] + levels["speed-robot"] +
levels["speed-factory"]`; `skinsOwned` = `ownedSkins.length`; `goldEquipped` = `material === "gold"
? 1 : 0`; `decorOwned` = `decor.length`; `catOwned` = `1` iff a `sleeping-cat` entry is in `decor`;
`videosOwned` = `videos.length`; `helpersTotal` = the sum of the three helper counts; `factories` =
`helpers.factory`; `crits`, `maxComboLevel`, `goldenCaught` and `resets` copied from
`trophies.stats`; `achievementsUnlocked` = `0` (the evaluation fills it in, see below). It SHALL NOT
mutate its inputs. The eleven state-derived metrics always describe the **current** save, so after a
progress reset they are `0` again while the four counters survive in the trophy file (DECISION
(confirmed, changed by the human), design D12).

#### Scenario: Fresh state has zero everywhere [unit]
- **WHEN** `getAchievementStats(FRESH, T0)` is evaluated
- **THEN** every one of the 15 values is `0`

#### Scenario: A rich state [unit]
- **GIVEN** `R = S({ balance: 1234, totalClicks: 90000, ownedSkins: ["soft-shadow", "squish", "gold"], enabledSkins: ["squish"], material: "gold", decor: [{ id: "sleeping-cat", position: null }, { id: "lava-lamp", position: { x: 0.5, y: 0.5 } }], videos: [{ id: "video-runner", position: { x: 0.1, y: 0.1 } }], upgrades: ["double-click", "combo"], helpers: { monkey: 4, robot: 2, factory: 1 }, levels: { crit: 2, "speed-monkey": 1 } })` and `RT = TR({ stats: { crits: 17, goldenCaught: 3, maxComboLevel: 8, resets: 2 } })`
- **WHEN** `getAchievementStats(R, RT)` is evaluated
- **THEN** it deep-equals `{ totalClicks: 90000, balance: 1234, purchases: 18, skinsOwned: 3, goldEquipped: 1, decorOwned: 2, catOwned: 1, videosOwned: 1, helpersTotal: 7, factories: 1, crits: 17, maxComboLevel: 8, goldenCaught: 3, resets: 2, achievementsUnlocked: 0 }`

#### Scenario: Gold owned but not equipped [unit]
- **WHEN** `getAchievementStats(S({ ownedSkins: ["gold"], material: "classic" }), T0)` is evaluated
- **THEN** `goldEquipped` is `0` and `skinsOwned` is `1`

#### Scenario: Cat detected only by its id [unit]
- **WHEN** `getAchievementStats(S({ decor: [{ id: "lava-lamp", position: null }] }), T0)` and `getAchievementStats(S({ decor: [{ id: "sleeping-cat", position: null }] }), T0)` are evaluated
- **THEN** their `catOwned` values are `0` and `1`

#### Scenario: Counters survive a wiped state [unit]
- **WHEN** `getAchievementStats(FRESH, TR({ stats: { crits: 120, goldenCaught: 4, maxComboLevel: 10, resets: 2 } }))` is evaluated
- **THEN** `crits` is `120`, `goldenCaught` is `4`, `maxComboLevel` is `10` and `resets` is `2`
- **AND** `totalClicks`, `balance`, `purchases`, `skinsOwned`, `goldEquipped`, `decorOwned`, `catOwned`, `videosOwned`, `helpersTotal` and `factories` are all `0`

#### Scenario: Stats do not mutate their inputs [unit]
- **GIVEN** a deeply frozen `S({ totalClicks: 5 })` and a deeply frozen `TR({ stats: { crits: 3 } })`
- **WHEN** `getAchievementStats` is called with them
- **THEN** nothing is thrown and both inputs still deep-equal their original values

### Requirement: Fixed-point evaluation with sticky unlocks
`evaluateAchievements(unlocked, stats)` SHALL repeat passes over `ACHIEVEMENTS` until a pass adds
no id (at most `ACHIEVEMENTS.length` passes), where each pass first sets
`stats.achievementsUnlocked` to the current size of the growing set and then adds every achievement
whose predicate holds. It SHALL return `{ unlocked, newlyUnlocked }` with both arrays in catalog
order and free of duplicates; `unlocked` SHALL contain every input id even when its metric no longer
reaches the threshold — in particular after a progress reset, when every state-derived metric is
back to `0` (unlocks are sticky, design D12) — and SHALL ignore unknown input ids. It SHALL NOT mutate
its inputs, and SHALL return `newlyUnlocked: []` when nothing new unlocks.

#### Scenario: Nothing unlocks on a fresh state [unit]
- **WHEN** `evaluateAchievements([], getAchievementStats(FRESH, T0))` is evaluated
- **THEN** the result deep-equals `{ unlocked: [], newlyUnlocked: [] }`

#### Scenario: First click [unit]
- **WHEN** `evaluateAchievements([], getAchievementStats(S({ balance: 1, totalClicks: 1 }), T0))` is evaluated
- **THEN** the result deep-equals `{ unlocked: ["first-click"], newlyUnlocked: ["first-click"] }`

#### Scenario: Several unlocks come back in catalog order [unit]
- **WHEN** `evaluateAchievements([], A({ totalClicks: 100, balance: 1000 }))` is evaluated
- **THEN** the result deep-equals `{ unlocked: ["first-click", "clicks-100", "balance-1000"], newlyUnlocked: ["first-click", "clicks-100", "balance-1000"] }`

#### Scenario: Already unlocked ids are not reported again [unit]
- **WHEN** `evaluateAchievements(["first-click"], A({ totalClicks: 100 }))` is evaluated
- **THEN** the result deep-equals `{ unlocked: ["first-click", "clicks-100"], newlyUnlocked: ["clicks-100"] }`

#### Scenario: Unlocks are sticky [unit]
- **WHEN** `evaluateAchievements(["clicks-1000", "balance-50000"], getAchievementStats(FRESH, T0))` is evaluated (the state after a progress reset)
- **THEN** the result deep-equals `{ unlocked: ["clicks-1000", "balance-50000"], newlyUnlocked: [] }`

#### Scenario: Input order does not matter [unit]
- **WHEN** `evaluateAchievements(["balance-50000", "clicks-1000"], A({}))` is evaluated
- **THEN** `unlocked` is `["clicks-1000", "balance-50000"]` (catalog order)

#### Scenario: Unknown ids are dropped [unit]
- **WHEN** `evaluateAchievements(["not-an-achievement", "first-click"], A({}))` is evaluated
- **THEN** the result deep-equals `{ unlocked: ["first-click"], newlyUnlocked: [] }`

#### Scenario: The meta achievement counts the others [unit]
- **WHEN** `evaluateAchievements([], A({ totalClicks: 100000, balance: 50000, purchases: 25 }))` is evaluated
- **THEN** `newlyUnlocked` deep-equals `["first-click", "clicks-100", "clicks-1000", "clicks-10000", "clicks-100000", "balance-1000", "balance-50000", "first-purchase", "purchases-10", "purchases-25", "achievements-10"]` (ten unlocks make `achievements-10` true in the next pass)

#### Scenario: The last achievement closes the set [unit]
- **GIVEN** `TWENTY_NINE` = the 30 catalog ids without `achievements-all`
- **WHEN** `evaluateAchievements(TWENTY_NINE, A({}))` is evaluated
- **THEN** `newlyUnlocked` deep-equals `["achievements-all"]` and `unlocked` deep-equals all 30 ids in catalog order

#### Scenario: Evaluation does not mutate its inputs [unit]
- **GIVEN** a frozen array `["first-click"]` and a frozen `A({ totalClicks: 100 })`
- **WHEN** `evaluateAchievements` is called with them
- **THEN** nothing is thrown, the input array still deep-equals `["first-click"]` and the input stats still have `achievementsUnlocked: 0`

### Requirement: Toast queue
Constants SHALL be `ACHIEVEMENT_TOAST_MS = 4000` and `ACHIEVEMENT_TOAST_GAP_MS = 300`.
`createToastQueue()` SHALL return `{ current: null, remainingMs: 0, pending: [] }` (a new object
each call). `enqueueToasts(queue, ids)` SHALL append the ids that are neither `current` nor already
`pending`, in the given order, and — when nothing is showing and no gap is running — immediately
promote the first of them to `current` with `remainingMs = ACHIEVEMENT_TOAST_MS`; with no id to add
it SHALL return the input object. `advanceToastQueue(queue, elapsedMs)` SHALL clamp `elapsedMs` to
`[0, MAX_TICK_MS]` (NaN / negative count as 0), return the input object when the effective elapsed
is 0 or the queue is idle (`current === null && remainingMs === 0 && pending.length === 0`), and
otherwise count down: a running toast whose time is up is replaced by a gap of
`ACHIEVEMENT_TOAST_GAP_MS` when something is pending (else the queue becomes idle); a finished gap
promotes the first pending id with `remainingMs = ACHIEVEMENT_TOAST_MS`. Leftover time SHALL NOT be
carried into the next phase (DECISION (confirmed), design D13).

#### Scenario: Constants and empty queue [unit]
- **WHEN** the constants and `createToastQueue()` are read
- **THEN** `ACHIEVEMENT_TOAST_MS` is `4000`, `ACHIEVEMENT_TOAST_GAP_MS` is `300` and the queue deep-equals `{ current: null, remainingMs: 0, pending: [] }`

#### Scenario: Enqueue promotes the first id [unit]
- **WHEN** `enqueueToasts(createToastQueue(), ["first-click", "clicks-100"])` is evaluated
- **THEN** the result deep-equals `{ current: "first-click", remainingMs: 4000, pending: ["clicks-100"] }`

#### Scenario: Enqueue while a toast runs only appends [unit]
- **GIVEN** `Q = { current: "first-click", remainingMs: 1500, pending: ["clicks-100"] }`
- **WHEN** `enqueueToasts(Q, ["balance-1000"])` is evaluated
- **THEN** the result deep-equals `{ current: "first-click", remainingMs: 1500, pending: ["clicks-100", "balance-1000"] }`

#### Scenario: Duplicates are ignored [unit]
- **GIVEN** `Q = { current: "first-click", remainingMs: 1500, pending: ["clicks-100"] }`
- **WHEN** `enqueueToasts(Q, ["first-click", "clicks-100"])` and `enqueueToasts(Q, [])` are evaluated
- **THEN** both results are the same object as `Q` (`toBe`)

#### Scenario: One toast runs out and the next follows after the gap [unit]
- **GIVEN** `Q = { current: "first-click", remainingMs: 4000, pending: ["clicks-100"] }`
- **WHEN** `advanceToastQueue` is applied with 1000, 1000, 1000, 1000
- **THEN** the intermediate results are `{ current: "first-click", remainingMs: 3000, pending: ["clicks-100"] }`, `… 2000 …`, `… 1000 …` and the fourth is `{ current: null, remainingMs: 300, pending: ["clicks-100"] }`
- **WHEN** `advanceToastQueue` is applied to that result with 300
- **THEN** the result deep-equals `{ current: "clicks-100", remainingMs: 4000, pending: [] }`

#### Scenario: The last toast leaves the queue idle [unit]
- **GIVEN** `Q = { current: "clicks-100", remainingMs: 100, pending: [] }`
- **WHEN** `advanceToastQueue(Q, 100)` is evaluated
- **THEN** the result deep-equals `{ current: null, remainingMs: 0, pending: [] }`
- **WHEN** `advanceToastQueue` is applied to that result with 1000
- **THEN** the result is the same object as its input (`toBe`)

#### Scenario: Elapsed time is clamped and never carried over [unit]
- **GIVEN** `Q = { current: "first-click", remainingMs: 4000, pending: ["clicks-100"] }`
- **WHEN** `advanceToastQueue(Q, 5000)` is evaluated
- **THEN** the result deep-equals `{ current: "first-click", remainingMs: 3000, pending: ["clicks-100"] }` (clamped to `MAX_TICK_MS` = 1000)
- **WHEN** `advanceToastQueue({ current: "first-click", remainingMs: 200, pending: ["clicks-100"] }, 1000)` is evaluated
- **THEN** the result deep-equals `{ current: null, remainingMs: 300, pending: ["clicks-100"] }` (the 800 ms left over do not shorten the gap)
- **WHEN** `advanceToastQueue(Q, NaN)` and `advanceToastQueue(Q, -50)` are evaluated
- **THEN** both results are the same object as `Q` (`toBe`)

### Requirement: Unlocked achievements live in the trophy file
The unlocked ids and the four lifetime counters SHALL be stored under `dopamine-clicker:trophies`
(envelope `{ version: 1, trophies: { unlocked, stats } }`), never inside the game save, and SHALL
survive "Reset progress" (DECISION (confirmed, changed by the human), design D12). The UI SHALL
write the trophy file after every evaluation that added an id and after every counter change (a crit
press, a caught golden button, a combo record, a reset), and SHALL NOT write the game save for a
counter change alone. The file format, its validation and its corrupted-file fallback are specified
in the `game-persistence` capability.

#### Scenario: The game state has no trophy fields [unit]
- **WHEN** `Object.keys(createInitialState())` is read
- **THEN** it equals `["balance", "totalClicks", "ownedSkins", "enabledSkins", "material", "decor", "videos", "upgrades", "helpers", "levels"]` (no `achievements`, no `stats`)

#### Scenario: A crit writes the trophy file, not the save [e2e]
- **GIVEN** the random hook is fixed to `0.01`, storage is seeded with `V4(S({ balance: 0, totalClicks: 200, levels: { crit: 1 } }))` and the clock is paused
- **WHEN** the page `/` is loaded and the user clicks the main button once
- **THEN** `[data-testid="balance"]` shows `10`, the trophy file's `trophies.stats.crits` is `1` and its `trophies.unlocked` contains `first-crit`
- **AND** the parsed save deep-equals `{ version: 4, state: S({ balance: 10, totalClicks: 201, levels: { crit: 1 } }) }` (no `achievements`, no `stats` key in the save)

### Requirement: Toast in the page
Every achievement that unlocks through a player action SHALL be shown once in
`[data-testid="achievement-toast"]` (`role="status"`, `aria-live="polite"`, text
`achievements.toast` with the localized achievement name), at most one at a time, in catalog order,
each for 4 000 ms with a 300 ms gap, driven by the existing 100 ms game tick. Achievements that are
already satisfied when the save and the trophy file are loaded SHALL be unlocked and written to the
trophy file **without** a toast (DECISION (confirmed), design D13).

#### Scenario: The first click shows one toast [e2e]
- **GIVEN** the page `/` is loaded with empty storage and the clock is paused
- **WHEN** the user clicks `[data-testid="main-button"]` once
- **THEN** `[data-testid="achievement-toast"]` has count 1 with text `Досягнення: Перший клік`
- **AND** the trophy file parsed deep-equals `{ version: 1, trophies: TR({ unlocked: ["first-click"] }) }`
- **WHEN** the clock runs 4 000 ms
- **THEN** `[data-testid="achievement-toast"]` has count 0

#### Scenario: Two unlocks queue instead of stacking [e2e]
- **GIVEN** storage is seeded with `V4(S({ balance: 999, totalClicks: 99 }))`, the trophy file with `TF(TR({ unlocked: ["first-click"] }))`, and the clock is paused
- **WHEN** the page `/` is loaded and the user clicks the main button once (balance 1 000, total clicks 100)
- **THEN** `[data-testid="achievement-toast"]` has count 1 with text `Досягнення: Сотня`
- **WHEN** the clock runs 4 000 ms
- **THEN** `[data-testid="achievement-toast"]` has count 0
- **WHEN** the clock runs 300 ms
- **THEN** `[data-testid="achievement-toast"]` has count 1 with text `Досягнення: Скарбничка`
- **WHEN** the clock runs 4 300 ms
- **THEN** `[data-testid="achievement-toast"]` has count 0 and the trophy file's `trophies.unlocked` is `["first-click", "clicks-100", "balance-1000"]`

#### Scenario: A loaded save unlocks silently [e2e]
- **GIVEN** storage is seeded with `V4(S({ balance: 1500, totalClicks: 1500 }))` and the clock is paused
- **WHEN** the page `/` is loaded and the clock runs 1 000 ms
- **THEN** `[data-testid="achievement-toast"]` has count 0
- **AND** the trophy file's `trophies.unlocked` is `["first-click", "clicks-100", "clicks-1000", "balance-1000"]` and its `trophies.stats` deep-equals `ST0`

### Requirement: Achievements panel
`[data-testid="achievements"]` SHALL be a `<button>` in the top-right cluster (left of
`[data-testid="lang-toggle"]`) with the text `achievements.open`. Activating it SHALL open the modal
`<dialog data-testid="achievements-dialog">` labelled by its `achievements.title` heading, move
focus to `[data-testid="achievements-close"]`, and close on Escape or on that button. The dialog
SHALL contain `[data-testid="achievements-count"]` with `achievements.count` (`{unlocked}`,
`{total}` = 30, formatted with `formatNumber`) and `[data-testid="achievements-list"]` with exactly
30 `<li data-testid="achievement-<id>">` in catalog order, each with `data-unlocked="true"` or
`"false"`, the localized name and description, and — only for achievements with `threshold > 1` —
`[data-testid="achievement-progress-<id>"]` with `achievements.progress` where `current =
min(stats[metric], threshold)` and `goal = threshold` (both formatted with `formatNumber`), with
`stats = getAchievementStats(currentState, currentTrophies)` and `data-unlocked` read from
`trophies.unlocked` — so after a progress reset a row can be unlocked while its progress shows
`0 / goal` (DECISION (confirmed), design D14).

#### Scenario: Panel lists all thirty with their state [e2e]
- **GIVEN** storage is seeded with `V4(S({ balance: 0, totalClicks: 120, decor: [{ id: "sleeping-cat", position: { x: 0.1, y: 0.1 } }] }))`
- **WHEN** the page `/` is loaded and the user clicks `[data-testid="achievements"]`
- **THEN** `[data-testid="achievements-dialog"]` is visible and `[data-testid="achievements-list"] > li` has count 30
- **AND** `[data-testid="achievements-count"]` has text `Відкрито 5 з 30` (`first-click`, `clicks-100`, `first-purchase`, `first-decor`, `cat-nap`)
- **AND** `[data-testid="achievement-first-click"]` has `data-unlocked="true"` and contains the texts `Перший клік` and `Зроби один клік`
- **AND** `[data-testid="achievement-cat-nap"]`, `[data-testid="achievement-first-purchase"]` and `[data-testid="achievement-clicks-100"]` have `data-unlocked="true"`
- **AND** `[data-testid="achievement-clicks-1000"]` has `data-unlocked="false"` and `[data-testid="achievement-progress-clicks-1000"]` has normalized text `120 / 1 000`
- **AND** `[data-testid="achievement-progress-first-click"]` has count 0 (threshold 1)
- **AND** the ids of the 30 rows, in DOM order, are the catalog order of the design D10 table

#### Scenario: Progress is capped at the goal [e2e]
- **GIVEN** storage is seeded with `V4(S({ balance: 0, totalClicks: 5000 }))`
- **WHEN** the page `/` is loaded and the panel is opened
- **THEN** `[data-testid="achievement-progress-clicks-1000"]` has normalized text `1 000 / 1 000` and `[data-testid="achievement-clicks-1000"]` has `data-unlocked="true"`
- **AND** `[data-testid="achievement-progress-clicks-10000"]` has normalized text `5 000 / 10 000`

#### Scenario: Dialog is accessible and Escape closes it [e2e]
- **GIVEN** the page `/` is loaded with empty storage
- **WHEN** the user clicks `[data-testid="achievements"]`
- **THEN** `[data-testid="achievements-dialog"]` has role `dialog` with accessible name `Досягнення` and `[data-testid="achievements-close"]` is focused
- **WHEN** the user presses `Escape`
- **THEN** `[data-testid="achievements-dialog"]` is not visible
- **WHEN** the user clicks `[data-testid="achievements"]` and then `[data-testid="achievements-close"]`
- **THEN** `[data-testid="achievements-dialog"]` is not visible

#### Scenario: Panel is localized [e2e]
- **GIVEN** the page `/` is loaded with empty storage and the user clicked `[data-testid="lang-toggle"]`
- **WHEN** the user clicks `[data-testid="achievements"]`
- **THEN** `[data-testid="achievements-count"]` has text `0 of 30 unlocked` and `[data-testid="achievement-first-click"]` contains `First click` and `Make one click`

### Requirement: Achievements are cosmetic only
Unlocking an achievement SHALL NOT change balance, total clicks, prices, reveal thresholds, click
value or helper income. No function in `lib/game/{shop,click-value,press,helpers,state,save}.ts`
SHALL take, import or read a `Trophies` value; the dependency goes only from `achievements.ts` and
`trophies.ts` towards the game modules (DECISION (confirmed), design D10).

#### Scenario: The economy does not know about trophies [unit]
- **GIVEN** `B = S({ balance: 50, totalClicks: 99 })`, `T_FULL = TR({ unlocked: <all 30 ids>, stats: { crits: 100, goldenCaught: 10, maxComboLevel: 10, resets: 1 } })`
- **WHEN** `getClickValue(getClickModifiers(B))`, `getItemPrice(B, "monkey")`, `isItemRevealed(B, "soft-shadow")` and `getHelperClicksPerSecond(B)` are evaluated (each with the state as their only game argument)
- **THEN** the results are `1`, `50`, `true` and `0`
- **WHEN** `getAchievementStats(B, T0)` and `getAchievementStats(B, T_FULL)` are compared
- **THEN** they differ only in `crits`, `goldenCaught`, `maxComboLevel` and `resets`; all eleven state-derived metrics are equal

#### Scenario: A full trophy case earns nothing [e2e]
- **GIVEN** storage is seeded with `V4(S({ balance: 7, totalClicks: 200000 }))`, the trophy file with `TF(TR({ unlocked: <all 30 ids>, stats: { crits: 100, goldenCaught: 10, maxComboLevel: 10, resets: 1 } }))`, and the clock is paused
- **WHEN** the page `/` is loaded and the user clicks the main button once
- **THEN** `[data-testid="balance"]` shows `8` and `[data-testid="achievement-toast"]` has count 0
