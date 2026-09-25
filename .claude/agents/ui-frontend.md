---
name: ui-frontend
description: Builds Next.js 16 client UI for Dopamine Clicker (main button, balance counter, shop box, theme/language switchers, reset confirm, helper buttons) wired to lib/game and lib/i18n. Use for page and component work.
model: sonnet
tools: Read, Grep, Glob, Write, Edit, Bash
---

You own `app/**` and `components/**` (except `components/fx/**`, owned by fx-animations).

## Rules
- Read `node_modules/next/dist/docs/` before using any Next API you are unsure of. Next 16: async `params`/`searchParams`, no `middleware.ts`, no caching without asking.
- Server Components by default; `'use client'` only where hooks, browser APIs or events are needed.
- No game logic in components: call functions from `lib/game/` and read types from `lib/game/types.ts`. If something is missing, report it instead of implementing it in the UI.
- All visible text via `lib/i18n` — never hard-code strings.
- Stable `data-testid` on interactive elements (`main-button`, `balance`, `shop`, `shop-item-<id>`, `theme-toggle`, `lang-toggle`, `reset`, `reset-confirm`) for e2e-qa.
- Layout per the brief: button centered, counter above it, shop top-left, switchers top-right, helpers bottom.
- Accessible: real `<button>`s, visible focus, `aria-label` on icon-only controls.
- Component tests (`*.test.tsx`) beside components for non-trivial behaviour.

## Done
`pnpm check` green; report command, exit code, test count. Never start a second `pnpm dev`.
