# Tasks: add-foundation

Owners in brackets: [game-logic], [i18n], [ui-frontend], [fx-animations], [e2e-qa], [human].
Contract: `lib/game/types.ts` (do not edit; propose changes in your report). Design: `design.md`.

All decisions in `design.md` were confirmed by the human (D1 storage keys incl.
`dopamine-clicker:save:bad`, D3, D4 with corrupted-save backup, D8, D10, D13). No open
`DECISION (needs human confirm)` items remain.

## 0. Red tests

- [x] 0.1 [human] Confirm the DECISION items listed above (or update the specs first); confirmed — D4 changed to add the `dopamine-clicker:save:bad` backup, specs updated.
- [x] 0.2 [game-logic] Create stubs `lib/game/click-value.ts`, `lib/game/state.ts`, `lib/game/save.ts`, `lib/game/preferences.ts` exporting every name in design D1 with the signature types from `lib/game/types.ts`; constants (`SAVE_KEY`, `SAVE_BACKUP_KEY`, `CURRENT_SAVE_VERSION`, `MIGRATIONS`, `THEME_KEY`, `LANGUAGE_KEY`, `DEFAULT_LANGUAGE`, `NEUTRAL_CLICK_MODIFIERS`) hold their real values, every function body is `throw new Error("not implemented")`; verify `pnpm typecheck` and `pnpm lint` exit 0.
- [x] 0.3 [game-logic] Write `lib/game/click-value.test.ts` covering all `[unit]` scenarios of requirement "Click value formula" (clicker-core); verify it fails with "not implemented".
- [x] 0.4 [game-logic] Write `lib/game/state.test.ts` covering the `[unit]` scenarios of "Initial game state", "Main-button click updates balance and total clicks", "Balance counter visibility" (clicker-core); verify it fails with "not implemented".
- [x] 0.5 [game-logic] Write `lib/game/save.test.ts` covering every `[unit]` scenario in `specs/game-persistence/spec.md`, using a `Map`-backed `KeyValueStorage` fake and throwing fakes; including the "Corrupted-save backup" scenarios; also assert `SAVE_KEY === "dopamine-clicker:save"`, `SAVE_BACKUP_KEY === "dopamine-clicker:save:bad"` and `CURRENT_SAVE_VERSION === 1`; verify it fails with "not implemented".
- [x] 0.6 [game-logic] Write `lib/game/preferences.test.ts` covering every `[unit]` scenario in `specs/theme/spec.md` and the "Language preference" scenarios in `specs/localization/spec.md`; also assert `THEME_KEY === "dopamine-clicker:theme"` and `LANGUAGE_KEY === "dopamine-clicker:lang"`; verify it fails with "not implemented".
- [x] 0.7 [i18n] Create stubs `lib/i18n/dictionaries.ts` (`uk` with the 11 keys all set to `""`, `type TranslationKey = keyof typeof uk`, `type Dictionary = Record<TranslationKey, string>`, `en: Dictionary` with every key set to `""`) and `lib/i18n/index.ts` (`t`, `formatNumber` throwing "not implemented"); verify `pnpm typecheck` exits 0.
- [x] 0.8 [i18n] Write `lib/i18n/i18n.test.ts` covering every `[unit]` scenario of "Dictionaries with identical keys", "Translation function", "Number formatting" (localization); verify key parity passes and the rest fail on empty values / "not implemented".
- [x] 0.9 [e2e-qa] Write `e2e/add-foundation.spec.ts` with one `describe` per capability (clicker-core, game-persistence, theme, localization, reduced-motion) and one `test` per `[e2e]` scenario, selecting only by `data-testid`, role, or `<html>` attributes; seed storage per design D12; verify `pnpm test:e2e` runs and these tests fail on missing elements/assertions (not on syntax or import errors).
- [x] 0.10 [game-logic] Run `pnpm typecheck`, `pnpm lint` (both exit 0), `pnpm test` and `pnpm test:e2e` (both fail only on assertions / "not implemented"); record exit codes and counts. — typecheck 0, lint 0 (9 warnings); Vitest 92 failed / 12 passed; Playwright 27 failed / 1 passed (smoke).
- [x] 0.11 [human] Commit stubs + tests as `test(add-foundation): add failing tests`; verify `git log --oneline --grep "^test(add-foundation)"` shows it and `pnpm tests:locked` prints `ok add-foundation`.

## 1. Game logic (lib/game) [game-logic]

- [x] 1.1 Implement `getClickValue` in `lib/game/click-value.ts`; verify `pnpm test lib/game/click-value.test.ts` passes.
- [x] 1.2 Implement `createInitialState`, `clickMainButton`, `isBalanceVisible` in `lib/game/state.ts` (pure, returns new objects); verify `pnpm test lib/game/state.test.ts` passes.
- [x] 1.3 Implement `serializeGame`, `validateGameState`, `migrateSave` in `lib/game/save.ts`; verify their scenarios in `lib/game/save.test.ts` pass.
- [x] 1.4 Implement `parseSave` (pure), `saveGame` and `clearGame` (removes only `SAVE_KEY`) in `lib/game/save.ts` with try/catch around all storage calls; verify their scenarios in `lib/game/save.test.ts` pass.
- [x] 1.5 Implement `loadGame` in `lib/game/save.ts`: read `SAVE_KEY`, `parseSave`, and on status `corrupted` with a non-null raw string write it to `SAVE_BACKUP_KEY` in its own try/catch; verify `pnpm test lib/game/save.test.ts` passes fully, including the "Corrupted-save backup" scenarios.
- [x] 1.6 Implement all functions in `lib/game/preferences.ts`; verify `pnpm test lib/game/preferences.test.ts` passes.
- [x] 1.7 Run `pnpm test:mutation`; verify mutation score ≥ 70% for `lib/game/**`, adding new (not editing locked) tests for surviving mutants. — 94.56% after `chore: fix mutation testing` (vitest 5 never activated mutants).

## 2. Dictionaries (lib/i18n) [i18n]

- [x] 2.1 Fill `uk` and `en` in `lib/i18n/dictionaries.ts` with the exact copy from the table in `specs/localization/spec.md`; verify dictionary scenarios in `lib/i18n/i18n.test.ts` pass.
- [x] 2.2 Implement `t` with `{name}` interpolation and `formatNumber` via `Intl.NumberFormat(language)` in `lib/i18n/index.ts`; verify `pnpm test lib/i18n` passes.

## 3. Theme, layout and screen (app/, components/) [ui-frontend]

- [x] 3.1 Read the Next 16 docs in `node_modules/next/dist/docs/` on root layout, metadata and inline scripts; note the chosen API in the PR description.
- [x] 3.2 Update `app/globals.css`: replace the `prefers-color-scheme` block with `[data-theme="light"]` / `[data-theme="dark"]` variables (distinct `--background`), `color-scheme`, and `@custom-variant dark` per design D8; verify `pnpm lint` passes.
- [x] 3.3 Update `app/layout.tsx`: `<html lang="uk" data-theme="light" data-motion="full" suppressHydrationWarning>`, pre-paint inline script per D8, metadata title `Dopamine Clicker`; verify theme e2e "Default follows system dark" passes.
- [x] 3.4 Add `components/PreferencesProvider.tsx` (client): theme + language state from `loadPreferences`/`resolveTheme`/`resolveLanguage`, toggles using `toggleTheme`/`toggleLanguage` + `saveTheme`/`saveLanguage`, live `matchMedia` listeners for color scheme (only while no saved theme) and reduced motion, syncs `<html>` `data-theme`, `lang`, `data-motion`, exposes `useT()`; verify theme, localization and reduced-motion "Motion mode" e2e scenarios pass.
- [x] 3.5 Add `components/ThemeToggle.tsx` and `components/LanguageToggle.tsx` fixed top-right with test ids and aria-labels from D10; verify layout scenario "Counter above button, switchers top-right" passes.
- [x] 3.6 Add `components/GameScreen.tsx`, `MainButton.tsx`, `BalanceCounter.tsx`: load via `loadGame(window.localStorage)` through `useSyncExternalStore` (`components/game-store.ts`) instead of an effect — the `react-hooks/set-state-in-effect` lint rule forbids `setState` in an effect body — button disabled until loaded, click → `clickMainButton(state, NEUTRAL_CLICK_MODIFIERS)` → `saveGame`, reserved counter space, `formatNumber`; render inside `<main>`; verify clicker-core and persistence e2e scenarios pass.
- [x] 3.7 Add `components/ResetProgress.tsx` (native `<dialog>`, focus on cancel, Escape cancels, confirm → `clearGame` + `createInitialState`), fixed bottom-right; verify reset e2e scenarios pass.
- [x] 3.8 Replace the template in `app/page.tsx` with the provider + game screen (remove `next/image` template assets usage); verify `e2e/smoke.spec.ts` and `e2e/add-foundation.spec.ts` pass.
- [x] 3.9 Add component tests (`*.test.tsx`, new files, not locked) for `ResetProgress` (cancel vs confirm calls) if not already covered; verify `pnpm test` passes.

## 4. Motion (CSS) [fx-animations]

- [x] 4.1 Add main-button press feedback (`transition` on transform/box-shadow 150 ms, `:active` scale 0.95) scoped to the main button; verify e2e "Full motion has a press transition" passes.
- [ ] 4.2 Add the balance `bump` keyframe (≤ 200 ms, transform only) retriggered on value change (implemented via `bumpKey`, skipped on the load-time correction); implemented and unit-tested, awaiting a human visual check.
- [x] 4.3 Add `@media (prefers-reduced-motion: reduce)` rules setting `transition-duration: 0s` and `animation: none` for the main button and balance; verify e2e "Reduced motion disables button and counter animation" passes.

## 5. Verify and commit [human + agent loop]

- [x] 5.1 Run `pnpm check` (typecheck + lint + tests:locked + test); exit 0, `Tests 119 passed (119)` in 10 files (after review fixes), `ok add-foundation: 6 locked test file(s) unchanged since 338dd80`, lint clean apart from 2 pre-existing warnings in the locked `lib/i18n/i18n.test.ts`.
- [x] 5.2 Run `pnpm test:e2e`; exit 0, `28 passed` (27 add-foundation scenarios + smoke), 0 failed.
- [x] 5.3 Run `pnpm test:mutation`; verify score ≥ 70% (or explain surviving mutants in the PR). — exit 0, 94.56% (225 killed, 1 timeout, 13 survived: save.ts 8, i18n/index.ts 4, preferences.ts 1).
- [x] 5.4 Commit `feat(add-foundation): theme, language, main button, persistence and reset` after 5.1–5.3 are green.
