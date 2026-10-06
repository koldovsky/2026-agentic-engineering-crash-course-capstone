## Context

The FAQ uses native `<details>`/`<summary>`; the browser default marker is a triangle that swaps glyphs. `WaitlistForm` stores `error` in state and sets it only in the submit handler. Project rules forbid new dependencies and config edits, so both fixes stay inside existing files.

## Goals / Non-Goals

**Goals:** error clears (and follows the value) while editing once an error is shown; smooth, motion-safe FAQ open/close and marker rotation; keep native disclosure semantics and keyboard behavior.
**Non-Goals:** validating on blur or before first submit; animating anything else; a JavaScript accordion; changing messages or Zod rules.

## Decisions

1. **Live re-validation lives in the change handler, gated by `error !== null`.** `onChange` sets the value, and if an error is currently shown, calls the existing `validateEmail` and sets the error to its message or `null`. No new state, no new rules; success state is untouched. A tiny pure helper `nextErrorOnEdit(currentError, value)` in `lib/waitlist.ts` carries this rule so it is unit-testable (red first), per the rule to keep logic out of components. Alternative (validate on every keystroke from the start) rejected: it would show errors before submit, which the spec forbids.
2. **FAQ animation via CSS only, on native `<details>`.** Use `interpolate-size: allow-keywords` with a transition on `block-size` of `details::details-content` plus `content-visibility` (with `transition-behavior: allow-discrete`), so both opening and closing animate while `<details>` keeps its semantics. The marker is a custom `summary::before` chevron drawn with borders and `content: ""` (so it adds nothing to the question's accessible name), with the default marker hidden (`list-style: none`, `::-webkit-details-marker`), rotated by `details[open] > summary::before` with a transition. Browsers without support degrade to instant toggling; the spec scopes the animation requirement to supporting browsers, with Chromium as the verified target. Alternative (JS height animation or `<div>` accordion with ARIA) rejected as more code and more risk.
3. **Reduced motion:** a `@media (prefers-reduced-motion: reduce)` rule sets `transition: none` for those selectors. Durations are 200 ms (spec maximum 250 ms).
4. **Where the CSS lives:** `app/globals.css` with a `.faq-item` class; no config changes.

## Risks / Trade-offs

- `::details-content` requires a recent Chromium (the E2E browser supports it). Mitigation: graceful degradation; E2E asserts the rotated marker transform (`getComputedStyle(summary, '::before')`) and uses `document.getAnimations()` after a toggle to find a CSSTransition on `::details-content`; if `getComputedStyle` of `::details-content` proves unreliable in the red run, `getAnimations()` is the assertion method. No pixel timing.
- Animations in tests can be flaky; E2E checks computed styles and final states with web-first assertions, and a reduced-motion test uses `page.emulateMedia`.
