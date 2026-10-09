# Java Interview Prep — agent rules

`docs/spec.md` is the single source of truth. Read it before writing code; the code follows the spec.
`docs/capstone-dod.md` is the main instruction and Definition of Done (deadline 4 Oct);
`docs/design.md` holds the design rules (colour values live in `src/app/globals.css`).

## Main rule: KISS (keep it simple)
Do the simplest thing that satisfies the task. No extra features, abstractions,
dependencies, config or files beyond what a requirement asks for. When two solutions work,
pick the plainer one. If something can be deleted instead of added, delete it. Use
subagents and heavy process only when they clearly earn their cost.

## Workflow
1. Spec first. Any behaviour change starts in `docs/spec.md` (requirement text plus a "Spec changes"
   entry with the reason); code only what the spec says. If code and spec disagree, the code is the
   bug unless the author decides to change the spec first.
2. Test first. Write the failing test, run it red, commit it with `RED_COMMIT=1` (the only
   allowed hook bypass; never use `--no-verify`); then implement, run green, commit normally.
3. Never claim something works without pasting the real command output.
4. Definition of Done: when finishing a slice, or before any PR/submission step, open
   `docs/capstone-dod.md` (do not load it otherwise) and update its checkboxes. Tick a box
   only with a commit hash, file or command output as proof; never tick on a claim alone.
5. Keep this file short. Put long reference material in `docs/` and read it on demand.

## Boundaries
- Next.js App Router, TypeScript strict, Vitest.
- Question data comes from the question bank module only; UI code never hard-codes questions.
- Tests use synthetic fixtures only. Never commit API keys; secrets live in `.env.local`.
- Check command: `npm run check` (lint + typecheck + tests). It must pass before any commit.
- Do not modify files outside `submissions/ivan-mykhalevych/`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
