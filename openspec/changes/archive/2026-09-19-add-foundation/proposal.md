# Proposal: add-foundation (Stage 1 "Foundation")

## Why

Dopamine Clicker (see `docs/project-brief.md`) has no game yet — `app/page.tsx` is the Next.js
template. Every later stage (shop, upgrades, helpers, content) needs the same base: a clickable main
button with a balance, a lifetime click counter, state that survives reloads, a reset, theme and
language switchers, and a reduced-motion baseline. Building and locking this first keeps later
changes small and testable.

## What Changes

- Main screen replaces the Next.js template: one centered main button ("Клік" / "Click"), balance
  counter above it that appears after the first click, theme toggle and language switcher in the
  top-right corner, and a "Reset progress" action with a confirmation step.
- Pure game logic in `lib/game/` (no React/Next imports): initial state, main-button click, click
  value function already shaped as `1 × multiplier × combo × (crit ? 10 : 1) × goldenBonus` with
  neutral modifiers in this stage (value = 1), balance-visibility rule.
- Persistence in `localStorage` with a versioned save envelope (`version: 1`), a migration hook
  (table of per-version steps), and a fallback to a fresh state for missing, corrupted or
  unknown-version data. A corrupted raw save is copied to `dopamine-clicker:save:bad` before
  starting fresh. Storage errors never crash the app.
- Theme (light/dark; default follows the system preference, explicit choice saved) and language
  (Ukrainian default, English; choice saved) stored under their own keys so reset keeps them.
- Ukrainian/English dictionaries in `lib/i18n/` with a key-parity test and locale-aware number
  formatting for the counter.
- `prefers-reduced-motion` respected: main-button and counter animations are disabled under
  reduced motion; the current motion mode is exposed on `<html data-motion>` for later effects.
- Shared type contract `lib/game/types.ts`.

Out of scope (later stages): shop box and 10-click unlock, skins, decor, upgrades (Double/Triple,
Crit, Combo, Golden button), helpers and game tick, sounds, offline progress, any `app/api` route.

## Capabilities

### New Capabilities

- `clicker-core`: main button, click value formula, balance and total-click counters, counter
  visibility and placement.
- `game-persistence`: versioned save/load in `localStorage`, migration hook, corrupted-data
  fallback, reset progress with confirmation.
- `theme`: light/dark theme toggle, system default, saved choice.
- `localization`: Ukrainian/English dictionaries, language switcher, saved choice, number
  formatting.
- `reduced-motion`: honouring `prefers-reduced-motion` for motion on the main screen.

### Modified Capabilities

(none — `openspec/specs/` is empty)

## Impact

- New: `lib/game/{types,click-value,state,save,preferences}.ts` + tests, `lib/i18n/**` + test,
  client components under `components/`, `e2e/add-foundation.spec.ts`.
- Changed: `app/layout.tsx` (html `lang`/`data-theme`/`data-motion`, pre-paint preference script,
  metadata), `app/page.tsx` (template removed), `app/globals.css` (theme variables, dark variant,
  reduced-motion rules).
- No new dependencies, no config changes, no API routes. The existing `e2e/smoke.spec.ts` (expects
  a visible `<main>`) must keep passing.
