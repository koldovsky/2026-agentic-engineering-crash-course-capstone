# Proposal

## Why

The capstone needs a small, verifiable product to carry a complete spec-driven, Maker/Checker workflow. PRODUCT_BRIEF.md approves a single-page landing page for AgentFlow, a fictional AI-assisted development service. The repository only contains a generic Next.js scaffold, so the product behavior must be specified and committed before any AgentFlow code is written.

## What Changes

- Replace the scaffold home page at `/` with the AgentFlow landing page containing eight sections in a fixed order: Navbar, Hero, Features, How It Works, Pricing, FAQ, Waitlist CTA, Footer.
- Add a single waitlist form (the only form and only interactive feature) with required-email validation, error states, a success state, correction and resubmission, and a visible demo disclaimer. Submission is simulated locally; nothing is sent or stored.
- Require responsive layouts at 375 px and 1440 px without horizontal overflow, and keyboard-accessible, labeled form controls.
- Fix UI copy language as Ukrainian; planning artifacts, code identifiers and documentation stay in English.
- Require unit tests for the email validation rules and Chromium E2E tests at both viewport widths.

Nothing is **BREAKING**: the scaffold page has no product behavior to preserve.

## Capabilities

### New Capabilities
- `landing-page`: Structure, navigation, static content, responsiveness and copy language of the single page at `/`.
- `waitlist-signup`: Behavior of the demo waitlist form: validation, error and success feedback, correction and resubmission, local-only submission, accessibility.

### Modified Capabilities

None. `openspec/specs/` is empty.

## Impact

- Code: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, new components and a pure validation module with neighboring tests.
- Dependencies (to be added during implementation, as already approved in TECH_STACK.md): Zod, Vitest, Playwright. No other libraries.
- Tooling: `pnpm typecheck`, `pnpm test:unit`, `pnpm test:e2e` and `pnpm check` scripts.
- Excluded: backend or API routes, authentication, databases, AI APIs, payments, dashboards, extra pages, external integrations, complex animations.
