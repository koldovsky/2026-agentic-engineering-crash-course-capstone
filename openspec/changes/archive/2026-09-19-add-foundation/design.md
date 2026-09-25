# Design: add-foundation

## Context

See `proposal.md` for motivation. Current state: fresh Next.js 16 template (`app/layout.tsx`,
`app/page.tsx`, Tailwind v4 in `app/globals.css`), no `lib/`, no `components/`. Vitest (jsdom) and
Playwright (reuses `pnpm dev`, Desktop Chrome 1280 × 720) are configured. Stryker mutates
`lib/**/*.ts` except tests and `lib/**/types.ts`, break threshold 70%.

The shared contract is `lib/game/types.ts` (types and function signatures only).

## Goals / Non-Goals

**Goals:** a pure, fully unit-tested logic layer for state/save/preferences; a thin client UI wired
to it; a save format that later stages can extend through migrations; stable `data-testid`s.

**Non-Goals:** shop, upgrades, helpers, game tick, RNG, sounds, offline progress, API routes, any
new dependency or config change.

## Decisions

### D1. Module layout and storage keys (owner: game-logic unless noted) — confirmed

Storage keys (confirmed by human): `dopamine-clicker:save` (game save), `dopamine-clicker:save:bad`
(backup of the last corrupted raw save, see D4), `dopamine-clicker:theme`, `dopamine-clicker:lang`.

| File | Exports | Scenarios |
|---|---|---|
| `lib/game/click-value.ts` | `getClickValue: GetClickValue`, `NEUTRAL_CLICK_MODIFIERS: ClickModifiers` | clicker-core "Click value formula" |
| `lib/game/state.ts` | `createInitialState`, `clickMainButton`, `isBalanceVisible` | clicker-core |
| `lib/game/save.ts` | `SAVE_KEY = "dopamine-clicker:save"`, `SAVE_BACKUP_KEY = "dopamine-clicker:save:bad"`, `CURRENT_SAVE_VERSION = 1`, `MIGRATIONS: MigrationTable = {}`, `serializeGame`, `validateGameState`, `migrateSave`, `parseSave`, `loadGame`, `saveGame`, `clearGame` | game-persistence |
| `lib/game/preferences.ts` | `THEME_KEY = "dopamine-clicker:theme"`, `LANGUAGE_KEY = "dopamine-clicker:lang"`, `DEFAULT_LANGUAGE = "uk"`, `parseTheme`, `resolveTheme`, `toggleTheme`, `parseLanguage`, `resolveLanguage`, `toggleLanguage`, `loadPreferences`, `saveTheme`, `saveLanguage` | theme, localization (preference parts) |
| `lib/i18n/dictionaries.ts` (owner: i18n) | `uk` (the source of truth for keys), `type TranslationKey = keyof typeof uk`, `type Dictionary = Record<TranslationKey, string>`, `en: Dictionary` | localization |
| `lib/i18n/index.ts` (owner: i18n) | `t(language: Language, key: TranslationKey, params?: Record<string, string \| number>): string`, `formatNumber(value: number, language: Language): string`, re-exports dictionaries | localization |

Each function is exported as `export const name: <SignatureType> = ...` or a function declaration
matching the signature type from `types.ts`. `Language` comes from `lib/game/types.ts`.

`TranslationKey` stays in `lib/i18n` (confirmed by human), derived as `keyof typeof uk`: adding a
key to `uk` makes it available to `t()` and forces `en` (typed `Record<TranslationKey, string>`) to
add it too at compile time; the key-parity test guards the runtime side. It is not part of
`lib/game/types.ts`.

Why preferences under `lib/game/`: they share the storage abstraction and error-handling rules
with save/load, and keeping all storage keys in one package makes "reset keeps preferences" easy to
test. Alternative (`lib/preferences/`) rejected as a one-file package.

### D2. Click value shaped for later multipliers
`getClickValue(mods) = 1 × multiplier × combo × (crit ? 10 : 1) × goldenBonus`, and
`clickMainButton(state, mods)` takes modifiers explicitly. Stage 1 UI always passes
`NEUTRAL_CLICK_MODIFIERS`. Later stages add a pure `getClickModifiers(state, ctx)` without changing
these signatures. Rounding of fractional combo values is deliberately left to Stage 3 (all Stage 1
scenarios use integers).

### D3. totalClicks counts presses — confirmed
`totalClicks += 1` per main-button press regardless of click value. Brief says "Total clicks"; this
keeps shop unlock at "10 clicks" meaning ten presses even after ×2/×3. Alternative: total earned
(lifetime balance). Note for Stage 2: helper clicks will likely also count toward `totalClicks`;
that is decided in the Stage 2 change, not here.

### D4. Save envelope, migrations and corrupted-save backup — confirmed (backup changed by human)
Stored JSON: `{ "version": 1, "state": { "balance", "totalClicks" } }` under
`dopamine-clicker:save`. Envelope keeps the version out of `GameState`. `migrateSave` walks
`migrations[v]` from `file.version` up to `targetVersion`; failure modes return `null` (see spec).
`parseSave(raw, options)` = JSON parse → envelope check (`version` is an integer, `state` key
present) → migrate → `validateGameState` → status. `parseSave` is pure and never touches storage.
Unknown/future versions, invalid JSON, failed validation and failed migrations all yield status
`corrupted` and a fresh state.

Backup: `loadGame(storage, options)` reads the raw string, calls `parseSave`, and when the status
is `corrupted` and the raw string was non-null it writes the raw string verbatim to
`SAVE_BACKUP_KEY` (`dopamine-clicker:save:bad`), overwriting any previous backup, inside its own
`try/catch` (a failed backup write is ignored and does not change the result). It never writes the
backup for `fresh` / `loaded` / `migrated` and does not modify `SAVE_KEY`; the fresh state
overwrites the save on the next click. `clearGame` (reset) removes only `SAVE_KEY`, so the backup
survives resets. Only one backup is kept (the most recent corrupted value).

### D5. Storage is injected and never throws
All storage access goes through `KeyValueStorage`; every read/write/remove is wrapped in
`try/catch` (private-mode Safari, quota, disabled storage). UI passes `window.localStorage`
(guarded by a `typeof window` check inside the client component, not in `lib/`).

### D6. When state is saved
After every state change (each click, each confirmed reset) the UI calls `saveGame` (reset calls
`clearGame`) synchronously. A click is a single tiny `setItem`; no debounce needed in Stage 1.
The helper tick in Stage 2 may introduce throttled saving.

### D7. Hydration and the "disabled until loaded" rule
Server HTML cannot know `localStorage`. The game UI is a `'use client'` component that renders the
main button `disabled` on the server and first client render, loads state in an effect, then
enables the button. Playwright's `click()` waits for enabled, which makes persistence tests
deterministic and prevents a pre-load click from being overwritten. The balance element is always
rendered with reserved height and hidden via `visibility: hidden` (or `hidden` attribute inside a
fixed-height wrapper) until `isBalanceVisible`, so the button never moves.

### D8. Theme and language applied before paint
`app/layout.tsx` renders `<html lang="uk" data-theme="light" data-motion="full"
suppressHydrationWarning>` and an inline blocking script in `<head>` that reads
`dopamine-clicker:theme` / `dopamine-clicker:lang` and `matchMedia` and sets `data-theme`, `lang`
and `data-motion` before first paint (no flash). The script duplicates the tiny parse rules
(valid strings only); the React client then owns these attributes, subscribes to
`matchMedia('(prefers-color-scheme: dark)')` (only while no saved choice) and
`matchMedia('(prefers-reduced-motion: reduce)')`. ui-frontend must read
`node_modules/next/dist/docs/` for the Next 16 way to add an inline script in the root layout.

Tailwind v4 dark mode is switched from the media query to the attribute with
`@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));` in
`app/globals.css`, and CSS variables `--background` / `--foreground` are defined per
`[data-theme]` (the existing `@media (prefers-color-scheme: dark)` block is removed). `color-scheme`
is set to match so native controls follow.

Confirmed by human: an explicit theme choice (clicking the toggle) overrides the system preference
permanently; there is no "follow system" option, and none is planned.

### D9. Language state shared through a client context
A small `PreferencesProvider` (`'use client'`, in `components/`) holds `{ theme, language }`,
exposes toggles and a `useT()` hook that binds `t(language, ...)`. It writes via `saveTheme` /
`saveLanguage` and updates `<html>` attributes. Metadata (`title: "Dopamine Clicker"`) stays static
in `layout.tsx`.

### D10. UI components and test ids (owner: ui-frontend)

| Component (`components/…`) | Test id | Notes |
|---|---|---|
| `GameScreen.tsx` (client) | — | owns `GameState`, loads/saves, renders `<main>` |
| `MainButton.tsx` | `main-button` | real `<button>`, label `t("mainButton.label")`, disabled until loaded |
| `BalanceCounter.tsx` | `balance` | `formatNumber`, `aria-label` = `t("balance.ariaLabel", { value })` |
| `ThemeToggle.tsx` | `theme-toggle` | icon only (sun/moon), `aria-label` = switchToDark/switchToLight |
| `LanguageToggle.tsx` | `lang-toggle` | text `language.short`, `aria-label` `language.switch` |
| `ResetProgress.tsx` | `reset`, `reset-dialog`, `reset-confirm`, `reset-cancel` | native `<dialog>` + `showModal()`; Escape fires `cancel`; initial focus on cancel (`autoFocus`) |

Placement — confirmed: theme + language toggles fixed top-right (`top-4
right-4`); reset is a small text button fixed bottom-right (away from the main button to avoid
accidental taps; the confirm dialog is the real safeguard).

### D11. Reduced motion (owner: fx-animations for CSS, ui-frontend for the attribute)
Main button: `transition: transform 150ms, box-shadow 150ms` and `:active { transform:
scale(0.95) }`. Balance: a 200 ms `bump` keyframe animation, retriggered on value change by
changing a `key` or toggling a class. Under
`@media (prefers-reduced-motion: reduce)` (and `[data-motion="reduced"]` for JS-driven effects)
both are disabled: `transition-duration: 0s; animation: none;` for these elements. Only
`transform`/`opacity` are animated.

### D12. E2E seeding
`page.addInitScript` runs on every navigation, including `page.reload()`, which would re-seed and
break reload tests. e2e-qa seeds with a guard (e.g. set only if `sessionStorage` flag
`__seeded` is absent, then set the flag) or seeds via `page.evaluate` after a first `goto` followed
by `reload`. Each Playwright test has a fresh context, so storage starts empty.

### D13. Copy and number formatting — confirmed
All Stage 1 strings are listed in `specs/localization/spec.md` (confirmed as-is). The language
toggle shows the current language (`УКР` / `ENG`). The balance uses locale number formatting
(`Intl.NumberFormat`): `1 234` with U+00A0 in Ukrainian, `1,234` in English.

## Risks / Trade-offs

- [Pre-paint script duplicates parse rules from `lib/game/preferences.ts`] → it is ~10 lines;
  e2e scenarios on reload catch divergence.
- [ICU differences in `Intl.NumberFormat("uk")` separator] → unit test pins U+00A0 (verified in
  Node); e2e normalizes whitespace.
- [Hydration mismatch warnings on `<html>` attributes] → `suppressHydrationWarning` on `<html>`
  only.
- [Future-version or corrupted saves are discarded from play] → the raw value is kept in
  `dopamine-clicker:save:bad` for manual recovery; only the latest one is kept.
- [Mutation score ≥ 70% on lib/] → unit scenarios cover every branch of validation/migration;
  constants and key strings are asserted directly.

## Migration Plan

No existing users/data. Rollback = revert the `feat(add-foundation)` commit; the save key is
namespaced so it cannot collide with anything.
