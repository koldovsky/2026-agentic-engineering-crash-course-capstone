# Design

## Context

AgentFlow is a static, single-route Next.js App Router app over the existing scaffold (Next.js 16, React 19, Tailwind 4). TECH_STACK.md fixes the stack and `pnpm check` contract; AGENTS.md requires pure logic in `lib/` with a neighboring Vitest test. See proposal.md for scope and the two capability specs for requirements.

## Goals / Non-Goals

**Goals:**
- Keep the page static and server-rendered; only the form is a client component.
- Single source of truth for email rules shared by the form and unit tests.
- Make every spec scenario map to a unit or E2E test.

**Non-Goals:**
- No design system, theming, i18n framework, analytics, or animations.
- No extra form or state libraries.

## Decisions

- **Structure:** `app/page.tsx` composes one component per section under `components/` (plain server components); `components/WaitlistForm.tsx` is the only `"use client"` component. Section content lives next to its component as static Ukrainian strings, which avoids an i18n dependency for a one-language page.
- **Validation:** `lib/waitlist.ts` exports a Zod schema (trim, then required, then email format) and the Ukrainian messages from the spec; the form calls `safeParse()` and renders the first issue. `lib/waitlist.test.ts` imports the same export. Alternative (hand-written regex) rejected: the stack mandates Zod and it keeps messages and rules together.
- **Submission:** `onSubmit` calls `preventDefault`, validates, and sets React state (`error` or `success`). No `fetch`, no storage. The form uses `noValidate` so the application's own messages are shown rather than browser-native ones, with `aria-describedby`/`role="alert"` or `role="status"` for feedback.
- **Navigation:** section links are in-page anchors (`#features`, `#how-it-works`, `#pricing`, `#faq`, `#waitlist`); all signup CTAs link to `#waitlist`. Smooth scrolling is optional CSS and not required. Anchors avoid JavaScript and work without hydration.
- **FAQ:** native `<details>/<summary>` for keyboard accessibility without JavaScript.
- **Responsiveness:** Tailwind mobile-first utilities; navbar links may collapse into a compact wrapped row on mobile instead of a JS menu.
- **Tests:** Vitest for `lib/`; Playwright with two Chromium projects (375×812 and 1440×900) and `webServer` running the app. Overflow check compares `document.documentElement.scrollWidth` with the viewport width. The "no network" scenario is checked by recording requests during submit.
- **Language:** `<html lang="uk">` in `app/layout.tsx`; scaffold metadata replaced with AgentFlow metadata.

## Risks / Trade-offs

- [Next.js 16 differs from prior versions] → read `node_modules/next/dist/docs/` before writing code, per AGENTS.md.
- [Email regex differences between Zod versions] → tests assert product behavior on specified inputs, not Zod internals.
- [Dependency and config edits (Vitest, Playwright, tsconfig/eslint) need approval per AGENTS.md] → request them when reached; the tasks flag these steps.
- [Spec-fixed message texts make copy changes spec changes] → deliberate, so tests stay deterministic.
