# Spec Delta: reduced-motion

## Purpose

Respects the operating system "reduce motion" setting so that shakes, particles and large or
decorative animations are disabled or toned down, starting with the main button and counter.

Scenario tags: `[e2e]` = Playwright test in `e2e/add-foundation.spec.ts` using
`page.emulateMedia({ reducedMotion })` or `test.use({ reducedMotion })`.

## ADDED Requirements

### Requirement: Motion mode is exposed and follows the system
The page SHALL set `data-motion="reduced"` on `<html>` when `prefers-reduced-motion: reduce`
matches and `data-motion="full"` otherwise, and SHALL update it live when the preference changes.
Later visual effects read this attribute (or the same media query) to decide what to render.

#### Scenario: Reduced motion detected [e2e]
- **GIVEN** the browser emulates `reducedMotion: "reduce"`
- **WHEN** the page `/` is loaded
- **THEN** `<html>` has `data-motion="reduced"`

#### Scenario: Full motion by default [e2e]
- **GIVEN** the browser emulates `reducedMotion: "no-preference"`
- **WHEN** the page `/` is loaded
- **THEN** `<html>` has `data-motion="full"`

#### Scenario: Live change [e2e]
- **GIVEN** the page `/` is loaded with `reducedMotion: "no-preference"`
- **WHEN** the test calls `page.emulateMedia({ reducedMotion: "reduce" })`
- **THEN** `<html>` has `data-motion="reduced"` without a reload

### Requirement: Main-button and counter animations respect reduced motion
With full motion the main button SHALL have a press feedback transition (non-zero
`transition-duration`) and the balance counter MAY play a short "bump" animation on change. With
reduced motion the main button's computed `transition-duration` SHALL be `0s` and the balance
counter's computed `animation-name` SHALL be `none`, while clicking still updates the balance.

#### Scenario: Full motion has a press transition [e2e]
- **GIVEN** the page `/` is loaded with `reducedMotion: "no-preference"`
- **WHEN** the computed `transition-duration` of `[data-testid="main-button"]` is read
- **THEN** it is not `0s`

#### Scenario: Reduced motion disables button and counter animation [e2e]
- **GIVEN** the page `/` is loaded with `reducedMotion: "reduce"`
- **WHEN** the user clicks the main button twice
- **THEN** `[data-testid="balance"]` shows `2`
- **AND** the computed `transition-duration` of `[data-testid="main-button"]` is `0s`
- **AND** the computed `animation-name` of `[data-testid="balance"]` is `none`
