## 1. Specification

- [x] 1.1 Run `pnpm exec openspec validate polish-waitlist-and-faq --strict`, run the `reviewer` Checker on the change artifacts as a separate invocation, save the report under `docs/reviews/`, resolve findings, then commit the change before any code

## 2. Waitlist error clears on valid input

- [x] 2.1 Write failing Vitest tests in `lib/waitlist.test.ts` for the pure edit rule (no error shown stays null; error shown plus valid value gives null; required switching to invalid-format; still-invalid keeps message) and failing Playwright tests for the clear-on-valid, text-follows-value and no-error-before-submit scenarios; record the red runs under `docs/runs/`
- [x] 2.2 Implement the helper in `lib/waitlist.ts` and use it from the change handler in `components/WaitlistForm.tsx`; verify the new unit and E2E tests pass at both widths and save the green output under `docs/runs/`

## 3. Animated FAQ

- [x] 3.1 Write failing Playwright tests in `tests/e2e/landing.spec.ts` for marker rotation (open vs closed transform), non-zero transition on item content and marker, and no transition under emulated reduced motion, durations at most 250 ms, and no non-zero transition or animation on any other element or pseudo-element; also add E2E cases for editing after success and for a cleared error not returning while typing; record the red run under `docs/runs/`
- [x] 3.2 Implement the CSS-only animation and chevron marker in `app/globals.css` and `components/Faq.tsx` (native `<details>` kept); verify the tests pass at both widths, save green output, and visually inspect 375 px and 1440 px with the item open and closed

## 4. Review and evidence

- [x] 4.1 Run the `reviewer` Checker on the implementation diff (separate invocation, Opus), save the report under `docs/reviews/` with the reviewed source state, and record each resolution
- [x] 4.2 Run `pnpm check` and `pnpm build`, save the output under `docs/runs/` with the tested commit SHA
- [ ] 4.3 Archive the change with `pnpm exec openspec archive polish-waitlist-and-faq` and commit locally (Conventional Commits, one logical change per commit, no push)
