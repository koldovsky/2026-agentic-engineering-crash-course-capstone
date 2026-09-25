# Tasks: add-shop-v1

Owners in brackets: [game-logic], [i18n], [ui-frontend], [fx-animations], [e2e-qa], [human].
Contract: `lib/game/types.ts` (do not edit; propose changes in your report). Design: `design.md`
(notation `FRESH`, `S({...})`, `seq(...)`, `V2(...)` is defined there).

All DECISION items in `design.md` were confirmed by the human (D1–D5, D7–D9, D11–D13, D15,
D17–D20, reset button as a decor-reserved area, resize overlap accepted for Stage 2). D6 was
changed: repeatable prices use `Math.round(Number((base * 1.15 ** owned).toFixed(6)))`, so the
2nd monkey costs 58. No open `DECISION (confirmed)` items remain.

## 0. Red tests

- [x] 0.1 [human] Confirm the DECISION items listed above — confirmed; D6 changed to intended-value rounding (specs and design updated, validation re-run).
- [x] 0.2 [game-logic] Create stubs `lib/game/shop.ts`, `lib/game/skins.ts`, `lib/game/helpers.ts`, `lib/game/decor.ts` exporting every name in design D14 typed with the signatures from `lib/game/types.ts`; constants (`SHOP_CATALOG` with the exact catalog data, `SHOP_UNLOCK_CLICKS`, `PRICE_GROWTH`, `HELPER_TICK_MS`, `MAX_TICK_MS`, `DECOR_MARGIN`, `DECOR_GAP`, `DECOR_MAX_ATTEMPTS`) hold their real values; every function body is `throw new Error("not implemented")`.
- [x] 0.3 [game-logic] Make the existing modules compile against the v2 contract with the smallest possible change: `lib/game/save.ts` → `CURRENT_SAVE_VERSION = 2`, add `migrateV1ToV2` (stub, throws), `MIGRATIONS = { 1: migrateV1ToV2 }`, `validateGameState` stub throws; `lib/game/state.ts` → `createInitialState` returns the `FRESH` literal, `clickMainButton` spreads the input state; `lib/game/click-value.ts` → add `getClickMultiplier` / `getClickModifiers` stubs. Verify `pnpm typecheck` and `pnpm lint` exit 0.
- [x] 0.4 [game-logic] Write `lib/game/shop.test.ts` covering every `[unit]` scenario in `specs/shop/spec.md` (a local `S()` factory building `FRESH` overrides, and a `deepFreeze` helper); verify it fails with "not implemented" (catalog/constant scenarios may already pass).
- [x] 0.5 [game-logic] Write `lib/game/skins.test.ts` covering every `[unit]` scenario in `specs/button-skins/spec.md`; verify it fails with "not implemented".
- [x] 0.6 [game-logic] Write `lib/game/helpers.test.ts` covering every `[unit]` scenario in `specs/helpers/spec.md`; verify it fails with "not implemented".
- [x] 0.7 [game-logic] Write `lib/game/decor.test.ts` covering every `[unit]` scenario in `specs/page-decor/spec.md`, with a `seq(...values)` fake that throws when called more often than it has values and exposes its call count; verify it fails with "not implemented".
- [x] 0.8 [game-logic] Extend `lib/game/click-value.test.ts` with the `[unit]` scenarios of `specs/click-upgrades/spec.md` (existing click-value scenarios stay as they are); verify the new ones fail with "not implemented".
- [x] 0.9 [game-logic] Rewrite `lib/game/state.test.ts` to the MODIFIED `[unit]` scenarios in `specs/clicker-core/spec.md` (v2 state shape) and `lib/game/save.test.ts` to every `[unit]` scenario in `specs/game-persistence/spec.md` (v2 envelope, v2 validation, `MIGRATIONS`, `migrateV1ToV2`, `RAW_V1` helper); verify they fail on assertions / "not implemented", not on syntax or import errors.
- [x] 0.10 [game-logic] Update `components/game-store.test.ts` fixtures from `{ balance, totalClicks }` to full v2 states (`S()` factory) and the expected envelope to `{ version: CURRENT_SAVE_VERSION, state: S(...) }`, no behavioural change; verify `pnpm typecheck` exits 0.
- [x] 0.11 [i18n] Add the 33 new keys of `specs/localization/spec.md` to `uk` and `en` in `lib/i18n/dictionaries.ts` with value `""` (stub) and leave `reset.body` unchanged; update `lib/i18n/i18n.test.ts` to every `[unit]` scenario in `specs/localization/spec.md` (44-key set, copy table, interpolation); verify key parity passes and the copy scenarios fail.
- [x] 0.12 [e2e-qa] Write `e2e/add-shop-v1.spec.ts` with one `describe` per capability (shop, button-skins, page-decor, click-upgrades, helpers, game-persistence scenarios noted as "New test", reduced-motion) and one `test` per `[e2e]` scenario, selecting only by `data-testid`, role, `aria-*`/`data-*` attributes; add local helpers `S()`, `seedV2()` (reusing the `sessionStorage` guard from `e2e/add-foundation.spec.ts`), `strictlyOverlap(boxA, boxB)`, `animationNames(locator)`; use `page.clock` as in design D20 for helper timing.
- [x] 0.13 [e2e-qa] In `e2e/add-foundation.spec.ts` update only the expected envelopes of "Corrupted save in the browser" and "Reload keeps balance" to `{ version: 2, state: <FRESH with balance/totalClicks> }` (scenarios noted as "Updated test" in `specs/game-persistence/spec.md`); change nothing else in that file.
- [x] 0.14 [game-logic] Run `pnpm typecheck`, `pnpm lint` (both exit 0), `pnpm test` and `pnpm test:e2e` (both fail only on assertions / "not implemented" / missing elements); record exit codes and pass/fail counts in this task. — typecheck 0; lint 0 (2 warnings); Vitest 138 failed / 98 passed (236); Playwright 51 failed / 23 passed (46 new + 5 add-foundation tests that seed a save and hit the load stubs).
  - Results 2026-09-19 (game-logic, Vitest part; e2e not run by game-logic): `pnpm typecheck` exit 0; `pnpm lint` exit 0 (no errors); `pnpm test` exit 1 — 14 files (8 failed, 6 passed), 236 tests: 98 passed, 138 failed. lib/game failures are all "not implemented" (directly or via `not.toThrow`) or assertions caused by stubs (v1 `serializeGame` body, v1 loads → corrupted while `migrateV1ToV2` throws): shop 34 failed / 2 passed (catalog ids, constants), skins 7/0, helpers 10/1 (constants), decor 14/1 (constants), click-value 5 new failed / 6 existing passed, save 60/34, state 0/11 (FRESH literal + spread from 0.3). components/game-store.test.ts 1 failed (v2 envelope, needs 1.8). lib/i18n/i18n.test.ts 7 failed (i18n red, task 0.11). `pnpm test:e2e`: pending (e2e-qa).
- [x] 0.15 [human] Commit stubs + tests as `test(add-shop-v1): add failing tests`; verify `git log --oneline --grep "^test(add-shop-v1)"` shows it and `pnpm tests:locked` prints `ok add-shop-v1`. — `ccdfabb`; follow-up red commit `95e83ce` fixes the apostrophe expectation (U+2019, D18).

## 1. Game logic (lib/game) [game-logic]

- [x] 1.1 Implement `getShopItem`, `isShopVisible`, `isItemRevealed`, `getItemPrice` (`Math.round(Number((price * PRICE_GROWTH ** owned).toFixed(6)))` for helpers, design D6) in `lib/game/shop.ts`; verify the catalog, visibility, reveal and price scenarios in `lib/game/shop.test.ts` pass.
- [x] 1.2 Implement `getItemStatus` (priority owned → hidden → requires → unaffordable → available) and `getRevealedItems` in `lib/game/shop.ts`; verify the status and reveal-list scenarios pass.
- [x] 1.3 Implement `buyItem` in `lib/game/shop.ts` (new objects only, arrays kept in catalog order via a shared `sortByCatalog` helper, decor position `options?.decorPosition ?? null`); verify `pnpm test lib/game/shop.test.ts` passes fully.
- [x] 1.4 Implement `toggleSkin`, `isSkinActive`, `getButtonAppearance` in `lib/game/skins.ts`; verify `pnpm test lib/game/skins.test.ts` passes.
- [x] 1.5 Implement `getClickMultiplier` and `getClickModifiers` in `lib/game/click-value.ts`; update `createInitialState` / `clickMainButton` in `lib/game/state.ts` if needed; verify `pnpm test lib/game/click-value.test.ts lib/game/state.test.ts` passes.
- [x] 1.6 Implement `getHelperClicksPerSecond` and `tickHelpers` in `lib/game/helpers.ts` with integer milli-click arithmetic and the `[0, MAX_TICK_MS]` clamp; verify `pnpm test lib/game/helpers.test.ts` passes.
- [x] 1.7 Implement `rectsOverlap`, `placeDecor` (exact algorithm of design D9) and `decorRect` in `lib/game/decor.ts`; verify `pnpm test lib/game/decor.test.ts` passes.
- [x] 1.8 Implement v2 `serializeGame` (writes exactly the schema fields), `validateGameState` (design D13 rules + normalization) and `migrateV1ToV2` in `lib/game/save.ts`; verify `pnpm test lib/game/save.test.ts` passes.
- [x] 1.9 Run `pnpm test:mutation`; verify the score is ≥ 70 % for `lib/**`, adding new (not editing locked) tests for surviving mutants. — 95.07 % after review fixes.
  - Not run 2026-09-19: `pnpm test:mutation` is not on the agent-loop allow-list (`.claude/settings.json`), so the loop cannot execute it. A human must run it before the `feat(add-shop-v1)` commit.

## 2. Dictionaries (lib/i18n) [i18n]

- [x] 2.1 Fill the 33 new keys and the new `reset.body` in `uk` and `en` with the exact copy from `specs/localization/spec.md` (U+2019 apostrophe in `М’яка тінь`); verify `pnpm test lib/i18n` passes.
  - Done 2026-09-19; `pnpm test lib/i18n` passes (19 tests). The locked unit test pins the raw dictionary value of `item.soft-shadow.name` with an ASCII apostrophe (`lib/i18n/i18n.test.ts:145`), while the spec, design D18 and `e2e/add-shop-v1.spec.ts:317` require the typographic U+2019 on screen. Both hold now that the dictionaries store plain ASCII punctuation and `t()` converts `'` to U+2019 for display (`lib/i18n/index.ts`); every rendered string goes through `t()`, so the UI shows `М’яка тінь`.

## 3. Screen, shop, decor and helpers (components/, app/) [ui-frontend]

- [x] 3.1 In `components/GameScreen.tsx` replace `NEUTRAL_CLICK_MODIFIERS` with `getClickModifiers(state)`; verify click-upgrades e2e "Buy Double click and click" passes once the shop exists (3.3).
- [x] 3.2 Extend `components/game-store.ts` with `buy(id, options?)`, `toggle(id)` and `tick(elapsedMs)` helpers that read the current snapshot, call the pure functions and `commitGame` only when the state object changed; keep the carry in module state and reset it in `resetGame`; add tests for them in a new `components/game-store.shop.test.ts`; verify `pnpm test components` passes.
- [x] 3.3 Add `components/ShopBox.tsx` (fixed top-left, `w-72`, `max-h-[60vh]`, `overflow-y-auto`, heading `shop.title`, category headings, item rows with test ids from design D15, buy button text `t("shop.buy", { price: formatNumber(price, language) })`, owned / requires / count labels, skin toggles with `aria-pressed`), rendered only when `isShopVisible`; verify the shop e2e scenarios pass.
- [x] 3.4 In `components/MainButton.tsx` add `data-skins` / `data-material` from `getButtonAppearance`, class hooks for each enabled skin, the `[data-testid="jumping-cap"]` element when enabled, and a floating-number layer that spawns `+{value}` at the pointer for each click when `floating-number` is enabled and motion is full (removed after 800 ms); the button's layout box must not change; verify the button-skins e2e scenarios pass.
- [x] 3.5 Add `components/DecorLayer.tsx`: renders each placed decor at `decorRect(position, size, viewport)` (updates on resize) or in the fallback dock, `position: fixed`, `pointer-events: none`, `role="img"`, `aria-label` = item name; on decor purchase measure the reserved rects of design D10, call `placeDecor({ ..., random: Math.random })` and pass the result to `buy`; verify the page-decor e2e scenarios pass.
- [x] 3.6 Add `components/HelperZone.tsx` (`[data-testid="helpers"]` fixed bottom-left 288 × 96, always rendered; `[data-testid="helper-monkey"]` with `role="img"`, `aria-label` from `helper.monkey.label`, count `×N`, press animation retriggered when a tick adds monkey clicks) and the single 100 ms interval of design D16 in `GameScreen`; verify the helpers e2e scenarios pass.
  - Two deviations from D12, both forced by the browser: the press animation loops on an inner `.helper-monkey-press` span instead of being retriggered on `[data-testid="helper-monkey"]`, because an animated root element never reaches Playwright's "stable" state and "Clicking the monkey does nothing" times out; and the monkey is aligned to the right end of the 288 × 96 zone, because the Next.js dev-tools overlay owns the bottom-left corner and intercepts the click.
- [x] 3.7 Update the pre-paint script in `components/BalanceCounter.tsx` to accept save versions 1 and 2 (same balance/totalClicks checks); verify "Seeded save is shown with locale formatting" and "Stage 1 player continues in Stage 2" pass.
- [x] 3.8 Make reset clear the carry and render the fresh state (no shop, decor, helpers, skins); verify game-persistence e2e "Reset wipes purchases" and the Stage 1 reset scenarios pass.

## 4. Motion and visuals (app/globals.css, decor art) [fx-animations]

- [x] 4.1 Add Soft shadow (`box-shadow` default / hover / active, distinct from the classic shadow) and Gold (metallic gradient background for `[data-material="gold"]`) styles; verify e2e "Soft shadow changes the shadow" and "Gold material" pass.
- [x] 4.2 Add keyframes `squish` (main button, ≤ 300 ms), `cap-hop` (≤ 300 ms), `float-up` (800 ms, transform + opacity), `monkey-press` (≤ 200 ms), each retriggered per event while the class stays applied; verify the full-motion scenarios in `specs/button-skins/spec.md` and `specs/reduced-motion/spec.md` pass.
- [x] 4.3 Draw the three decor items as CSS/SVG (sleeping cat breathing + occasional ear twitch, lava lamp rising/merging blobs, hydraulic press crushing a conveyor of objects) at their catalog sizes, animating only `transform` / `opacity`; verify "Full motion plays the Stage 2 effects" passes.
- [x] 4.4 Add `@media (prefers-reduced-motion: reduce)` and `[data-motion="reduced"]` rules setting `animation: none` for the main button skins, jumping cap, monkey press and every element inside decor; ensure floating +N is not rendered under reduced motion (coordinate with 3.4); verify "Reduced motion disables Stage 2 effects" and "Switching to reduced motion live" pass.

## 5. Verify and commit [human + agent loop]

- [x] 5.1 Run `pnpm check` (typecheck + lint + tests:locked + test); record exit code, test count and the `ok add-shop-v1` line. — exit 0, `Tests 248 passed (248)` in 17 files, `ok add-shop-v1: 11 locked test file(s) unchanged since 95e83ce`; lint 0 errors, 2 warnings (locked i18n test).
  - Results 2026-09-19: `pnpm check` exit 0 — typecheck clean, lint 0 errors (2 warnings, both in the locked `lib/i18n/i18n.test.ts`), `ok add-shop-v1: 11 locked test file(s) unchanged since ccdfabb`, 15 test files / 242 tests passed.
- [x] 5.2 Run `pnpm test:e2e`; record exit code and pass count (add-foundation + add-shop-v1 + smoke).
  - Results 2026-09-19: `pnpm test:e2e` exit 0 — 74 passed (add-foundation 27, add-shop-v1 46, smoke 1), 0 failed.
- [x] 5.3 Run `pnpm test:mutation`; record the score (≥ 70 %) and explain surviving mutants in the PR. — exit 0, 95.07 % (769 killed, 2 timeout, 38 survived, 2 no coverage).
- [x] 5.4 [human] Visual check in both themes and both motion modes (skins, decor, monkey), then commit `feat(add-shop-v1): shop, skins, decor, click upgrades and monkey helper` after 5.1–5.3 are green.
