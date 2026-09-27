<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ETF Dashboard — project rules

A small Next.js web app: a list of ETFs with filters, sorting and a details page. Demo data only —
no live market data, no investment advice. It is a course capstone: every step must leave evidence
(a file, a commit, a test run, a log line).

## Scope (enforced by a hook)

- This folder is the whole project. Write only inside it. `.claude/hooks/guard-scope.mjs` blocks
  writes outside it; the scope is in `.agents/scope.json`. Do not try to work around a block — report it.
- `.agents/` is the source of truth for skills, hooks and subagents. `.claude/{skills,hooks,agents}`
  are generated copies: edit `.agents/`, then run `pnpm agents:sync`.
- Only the human edits `.agents/scope.json` and `.claude/settings.json`.

## Commands (pnpm only — never npm or yarn)

- `pnpm dev` — dev server (http://localhost:3000). Never start a second one.
- `pnpm check` — typecheck + lint + tests + `agents:check` (+ `spec:validate` once OpenSpec is set up).
  Run it before you say a task is done, and quote the result.
- `pnpm typecheck` = `next typegen && tsc --noEmit` · `pnpm lint` = `eslint` · `pnpm test` = `vitest run`
- `pnpm hooks:selftest` — tests the hooks without an agent. `pnpm agent:log` — what you actually did.
- If a command in this file does not exist yet, say so. Do not invent a replacement.

## Workflow (spec first)

1. Every feature starts as an OpenSpec change in `openspec/changes/<id>/`. The human approves it before code.
2. Write failing tests for the change scenarios first. They are committed red.
3. Implement until `pnpm check` is green (a loop may do this).
4. A separate reviewer subagent checks the diff against the spec. You do not review your own work.
5. If reality differs from the spec, update the spec in its own commit and write why.

## Trust levels

- Level 1 — propose and wait: config, dependencies, scaffolding, anything in Boundaries.
- Level 2 — edit files freely, ask for commands not on the allow-list: code and tests inside an approved change.
- Level 3 — run to green and bring evidence: `pnpm agent:loop` runs. Stop and report at the iteration limit.

## Definition of done

- `pnpm check` is green; new behaviour has a test next to the code (`*.test.ts` / `*.test.tsx`).
- Evidence, not claims: report the command you ran and its exit code / test count.

## Docs map (link, do not copy between them)

why/what → `docs/PRD.md` · behaviour → `openspec/specs/` · how → `docs/architecture.md` ·
UI → `docs/design.md` · data → `docs/data-model.md` · decisions → `docs/decisions/`

## Next.js 16 rules that differ from what you may remember

- `params`, `searchParams`, `cookies()`, `headers()` are async — always `await` them.
- Request interception is `proxy.ts` (exports `proxy`), not `middleware.ts`.
- Caching is opt-in (`cacheComponents`, `'use cache'`) — do not enable it without asking.
- Server Components by default; `'use client'` only for hooks, browser APIs, event handlers.

## Conventions the linter does not enforce

- Pure logic lives in `lib/` (no React or Next imports) with a Vitest test beside it.
- Filter, sort and page state lives in the URL (`searchParams`), so every view has a shareable link.
- Import alias `@/*` = project root. English everywhere: UI copy, code, comments, docs, commit messages.
- Conventional Commits: `spec:`, `test:`, `feat:`, `fix:`, `review:`, `docs:`, `chore:` — one logical change per commit.

## Boundaries

- Ask before: adding a dependency, editing `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.mcp.json` or `package.json` scripts.
- Never: touch `.env*` (a hook blocks it), delete or skip tests, disable lint rules to get green,
  `git push --force`, `rm -rf`, fetch live market data.
- Do not edit the managed Next.js block above — `next dev` re-adds it.

<!-- Maintainers: keep our part under ~80 lines. Add a rule only after the agent gets something wrong twice. -->
