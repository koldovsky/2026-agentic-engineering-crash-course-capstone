# Tasks

## 1. Tooling and verification contract

- [x] 1.1 Add Zod, Vitest and Playwright (stable versions, with approval per AGENTS.md); verify `pnpm install` succeeds and the lockfile is updated
- [x] 1.2 Add `typecheck`, `test:unit`, `test:e2e` and `check` scripts; verify `pnpm check` runs the four steps in order and exits nonzero when one fails
- [x] 1.3 Configure Playwright with Chromium projects at 375 px and 1440 px and an automatic `webServer`; verify a smoke test passes in both projects without manually starting a server
- [x] 1.4 Document one-time setup (Node version file, Playwright Chromium install) in SETUP.md (README.md is original course material and stays unchanged) and verify the documented commands run as written

## 2. Waitlist validation logic

- [x] 2.1 Write failing Vitest tests in `lib/waitlist.test.ts` for empty, whitespace-only, invalid, valid and padded-valid email and for the exact required and invalid-format messages, and record the red run
- [x] 2.2 Implement the shared schema and messages in `lib/waitlist.ts`; verify `pnpm test:unit` passes

## 3. Page structure and static sections

- [x] 3.1 Set `lang="uk"` and AgentFlow metadata; replace the scaffold page with the eight ordered sections and anchors; verify E2E test "all eight sections render in order" passes at both widths
- [x] 3.2 Implement Navbar, Hero, Features, How It Works, Pricing, FAQ and Footer in Ukrainian, with CTAs linking to the `#waitlist` anchor; verify E2E tests for navigation links reaching their sections, CTAs pointing at the waitlist section, and no payment controls pass
- [x] 3.3 Add the responsive overflow E2E test and verify no horizontal overflow at 375 px and 1440 px

## 4. Waitlist form

- [x] 4.1 Implement the labeled client-side form in the Waitlist CTA section using the shared schema, announced feedback, demo note and local-only success state; verify E2E tests for exactly one form on the page, CTAs scrolling to the form, and empty, whitespace-only, invalid and valid submission pass
- [x] 4.2 Verify E2E tests for correction then resubmission, error after success, keyboard submission, no network request, no persistence after reload and announced error/success feedback pass at both widths

## 5. Integration, review and evidence

- [x] 5.1 Before each commit that adds or changes behavior, run the `reviewer` Checker as a separate invocation and save its report under `docs/reviews/`; verify the report names the reviewed source state
- [x] 5.2 Run the final independent review, apply fixes as Maker, and record each resolution in the saved report
- [x] 5.3 Run `pnpm check` and `pnpm build` after the fixes and save the actual output under `docs/runs/` with the tested commit SHA
- [x] 5.4 Visually inspect 375 px and 1440 px layouts and save a record of the inspection next to the run output
