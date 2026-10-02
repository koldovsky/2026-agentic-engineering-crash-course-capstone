# 0006. Vitest for frontend unit tests (Jest dropped)

- Status: accepted · Date: 2026-09-27 · Decided by: human

## Context
The first AGENTS.md named Jest. Angular 22's official test builder supports Vitest and Karma only.

## Decision
Use Vitest through `ng test`. HTTP services are tested with `HttpTestingController`. E2E uses Playwright.

## Consequences
- No custom Jest builder to maintain, and it matches the `angular-developer` skill.
- The tech stack in AGENTS.md was updated.
