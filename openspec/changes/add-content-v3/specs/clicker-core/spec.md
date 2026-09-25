# Spec Delta: clicker-core

Stage 4 adds exactly one field to the state: `videos` (bought video decor with its saved
position). The unlocked achievements and their counters deliberately stay **out** of `GameState` —
they live in their own storage key (design D12) — so nothing about the click value, the carry, the
reset or the layout changes.

Scenario tags: `[unit]` = Vitest test in `lib/game/state.test.ts`. `FRESH` and `S({...})` are
defined in `design.md`.

## MODIFIED Requirements

### Requirement: Initial game state
A new game SHALL start with balance 0, total clicks 0 and nothing bought:
`FRESH = { balance: 0, totalClicks: 0, ownedSkins: [], enabledSkins: [], material: "classic",
decor: [], videos: [], upgrades: [], helpers: { monkey: 0, robot: 0, factory: 0 }, levels: { crit: 0,
"speed-monkey": 0, "speed-robot": 0, "speed-factory": 0 } }` — the v3 state plus `videos`
(DECISION (confirmed), design D11). It SHALL contain no achievement or counter field
(DECISION (confirmed, changed by the human), design D12).

#### Scenario: Fresh state values [unit]
- **WHEN** the initial state is created
- **THEN** it deep-equals `{ balance: 0, totalClicks: 0, ownedSkins: [], enabledSkins: [], material: "classic", decor: [], videos: [], upgrades: [], helpers: { monkey: 0, robot: 0, factory: 0 }, levels: { crit: 0, "speed-monkey": 0, "speed-robot": 0, "speed-factory": 0 } }`
- **AND** `Object.keys(state)` equals `["balance", "totalClicks", "ownedSkins", "enabledSkins", "material", "decor", "videos", "upgrades", "helpers", "levels"]` (no `achievements`, no `stats`)

#### Scenario: Fresh state is a new object each time [unit]
- **WHEN** the initial state is created twice
- **THEN** both results deep-equal `FRESH`
- **AND** they are not the same object reference, and neither are their `ownedSkins`, `decor`, `videos`, `helpers` or `levels` members
