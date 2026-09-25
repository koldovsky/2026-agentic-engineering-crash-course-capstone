<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules — fwdays Crash Course · Capstone

Trust level 1 ("Assistant"): propose, then wait for a human decision before changing more
than one file or running anything that is not on the allow-list in `.claude/settings.json`.

## Commands (pnpm only — never npm or yarn)

- `pnpm dev` — dev server (Turbopack, http://localhost:3000). Never start a second one.
- `pnpm check` — typecheck + lint + tests. Run it before saying a task is done and quote the output.
- `pnpm test:mutation` — Stryker mutation testing of `lib/` (slow, not in `pnpm check`); fails below 70% mutation score. Report: `reports/mutation/index.html`.
- `pnpm typecheck` = `next typegen && tsc --noEmit` · `pnpm lint` = `eslint` (`next lint` no longer exists) · `pnpm test` = `vitest run`
- `pnpm agent:log` — summary of `.agent-log/actions.jsonl`: what you actually did this session.
- `pnpm agent:loop <change>` — green phase of an OpenSpec change: runs `claude -p` until `pnpm check` + `pnpm test:e2e` are green (max 5, stops on no progress). Needs the `test(<change>):` red commit; never commits. Log: `.agent-log/loops/`. With `.githooks` enabled (`git config core.hooksPath .githooks`, a human step) it starts automatically in the background after a red commit; skip once with `AGENT_LOOP=off`.

## Definition of done

- `pnpm check` is green; new behaviour has a test next to the code (`*.test.ts` / `*.test.tsx`).
- Changes to `lib/` keep `pnpm test:mutation` at ≥ 70% (break threshold in `stryker.config.mjs`); surviving mutants are fixed with new tests (never by editing locked red tests), or explained in the PR.
- User-visible flows (pages, clicks, navigation) also get a Playwright test in `e2e/*.spec.ts`; `pnpm test:e2e` is green (reuses the running `pnpm dev`).
- OpenSpec changes go red → green: first commit `test(<change>): add failing tests` (Vitest + Playwright + stubs), then `pnpm agent:loop <change>` until green, then `feat(<change>): ...`. Tests from the red commit are locked — `pnpm tests:locked` (inside `pnpm check`) fails if they change. Rules live in `openspec/config.yaml`.
- Evidence, not claims: report the command you ran and its exit code / test count — for both Vitest and Playwright.

## Next.js 16 rules that differ from what you may remember

- `params`, `searchParams`, `cookies()`, `headers()` are async — always `await` them.
- Request interception is `proxy.ts` (exports `proxy`), not `middleware.ts`.
- Caching is opt-in (`cacheComponents`, `'use cache'`) — do not enable it without asking.
- Server Components by default; `'use client'` only for hooks, browser APIs, event handlers.
- When unsure about an API, read `node_modules/next/dist/docs/` first (see the block above).

## Conventions the linter does not enforce

- Pure logic lives in `lib/` (no React or Next imports) with a Vitest test beside it; route handlers in `app/api/**/route.ts` stay thin.
- Import alias `@/*` = repo root. Ukrainian UI copy; English code, comments and commit messages.
- Conventional Commits (`feat:`, `fix:`, `chore:`), one logical change per commit.

## Boundaries

- Ask before: adding a dependency, editing `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.claude/settings.json`, `.mcp.json` or CI.
- Never: touch `.env*` (a hook blocks it anyway), delete tests or disable lint rules to get green, `git push --force`, `rm -rf`.
- Do not edit the managed Next.js block above — `next dev` re-adds it.

<!-- Maintainers: keep everything below the managed block under ~50 lines. Add a rule only after the
     agent gets something wrong twice. No repo overview, no file map, no linter rules, no API docs. -->
