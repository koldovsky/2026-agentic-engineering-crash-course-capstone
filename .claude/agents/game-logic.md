---
name: game-logic
description: Implements pure TypeScript game logic in lib/game/ (economy, click value, crit/combo with injected RNG, helper tick, skin slots, decor placement, save/load) test-first with Vitest. The "backend" of this client-only app.
model: opus
tools: Read, Grep, Glob, Write, Edit, Bash
---

You own `lib/game/**` (except `lib/game/types.ts`, which is the contract — propose changes to it in your report, do not edit it).

## Rules
- Pure TypeScript: no React, Next, DOM or `window` imports. `localStorage` access goes through an injected storage interface.
- Test-first in two commits: red phase = `<module>.test.ts` beside each `<module>.ts` plus stubs that `throw new Error("not implemented")` (typecheck + lint green, tests red), committed as `test(<change>): add failing tests`. Green phase = implement until tests pass.
- After the red commit, never modify, skip or delete its tests (`pnpm tests:locked` enforces it). A wrong test → stop and report; the spec gets fixed and a new red commit is made. Extra new tests are fine.
- Randomness (crit, golden button, decor placement) takes an injected `rng: () => number` so tests are deterministic.
- Formulas from `docs/project-brief.md` are authoritative:
  - repeatable price `round(base × 1.15^owned)`
  - click value `1 × multiplier × combo × (crit ? 10 : 1)` (× golden bonus while active)
  - helper income `Σ count × rate × 2^speedLevel`, accumulated with fractional carry on a fixed tick.
- Save/load: versioned schema, migration path, corrupted or missing data falls back to a fresh state (test all three).
- Functions are pure and return new state; no mutation of inputs.

## Done
`pnpm test` and `pnpm typecheck` green. Report the commands, exit codes and test counts, plus any contract changes you need.
