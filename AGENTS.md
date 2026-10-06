<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AgentFlow — Agent Instructions

## Persistent rules

- Before implementation, read `PRODUCT_BRIEF.md`, `TECH_STACK.md`, and the active OpenSpec specification. Commit the specification before AgentFlow feature code; the existing scaffold is the baseline.
- OpenSpec is a project-local devDependency. Run its CLI as `pnpm exec openspec ...` from the repository root, including when generated workflows show bare `openspec` commands.
- Implement only specified functionality. Resolve missing or conflicting requirements in the specification first, and carry approved requirements unchanged into handoffs.
- Keep one page at `/` and stay within the approved scope. Do not add backend/API routes, authentication, databases, AI APIs, external integrations, or other excluded features. Waitlist submission stays local without email persistence.
- Keep business logic outside large UI components where practical. Share the Zod validation schema between the form and its unit tests.
- Add tests for new logic. Include a regression test with bug fixes where practical.
- Do not modify, skip, or weaken tests merely to make verification pass. Explain legitimate test corrections against the specification.
- Run `pnpm check` before declaring work complete: typecheck → lint → Vitest unit tests → Playwright E2E tests. Report failures or unavailable checks honestly.
- Keep implementation minimal, use the approved stack, preserve unrelated work, and avoid unnecessary dependencies or agent infrastructure.
- Write project documentation and commit messages in English; preserve original course materials and third-party files in their source language. Documentation language does not determine UI language.

## Definition of Done

- The eight approved sections are present; layouts work at 375 px and 1440 px without horizontal overflow and have been visually inspected.
- The labeled, keyboard-accessible waitlist form handles empty/whitespace-only and invalid emails, valid-email success, and correction followed by resubmission. Submission is visibly identified as a demo.
- Unit tests and Chromium E2E tests at both widths cover the specified behavior. `pnpm check` passes and actual verification output is saved.
- An independent Checker has reviewed the implementation without fixing code during review; findings have fixes or documented resolutions.
- Default workflow: Claude Code with Sonnet is Maker; the existing `reviewer` on Opus is Checker, invoked separately as a subagent or fresh session. A model switch in the Maker conversation alone is not independent review.
- Before commits that add or change behavior and at final review, use `.claude/agents/reviewer.md`. The Checker must not have authored the changes and reports without editing. The human or Maker saves the report with the reviewed source identity, agent/session identities, and actual model versions when available; mark unavailable details as unknown.
- The capstone PR links specifications, review reports, verification runs, and relevant commits; distinguishes human and agent decisions; and includes a 1–2 minute video showing the product and workflow.

## Conventions and boundaries

- Keep pure logic in `lib/` with a neighboring Vitest test. The import alias `@/*` points to the repository root. Use Ukrainian UI copy and carry that choice into the specification.
- Use Conventional Commits, one logical change per commit.
- Ask before adding dependencies or editing `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, agent settings, `.mcp.json`, or CI unless the current task already authorizes the change.
- Do not touch `.env*`, delete tests or disable lint rules to get green, force-push, or use `rm -rf`. Logging hooks do not enforce these boundaries.
- Never read real user-level agent configuration or transcripts in code, tests, or demos. Use synthetic event fixtures; keep live logs local and commit only reviewed evidence.
- Run `pnpm hooks:selftest` when changing logging. Distinguish synthetic checks from live hook activation; record the actual agent and full session identity.
- Do not edit the managed Next.js block above; `next dev` re-adds it.
