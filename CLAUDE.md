# CLAUDE.md

## What this checkout is

My fork of `koldovsky/2026-agentic-engineering-crash-course-capstone`, the capstone
of the fwdays course "Crash Course: Agentic Engineering" (Sept 2026).

- The task is in `README.md`. What counts as proof is in `RUBRIC.md`. Read them before
  you plan capstone work. Do not restate them here.
- Course files at the root are upstream property: `README.md`, `RUBRIC.md`, `.github/`,
  `templates/`. Never edit them. Add my work beside them.
- Submission = branch in this fork + PR to upstream, filled from
  `.github/PULL_REQUEST_TEMPLATE.md`. The PR stays open, nobody merges it.

## Where my work goes

`submissions/oleksii-sanin/` on a branch of the same name. Any stack.
Small project, full cycle, not a big one that "seems to work".

## Rules for capstone work

- Every agentic practice I claim needs a link: a file, a commit, a test, a run, a recording.
  A named practice without proof is the one frequent cause of rework.
- Build the proof trail while working, not before submission. A retroactive log is visible.
- Record what I decided and what the agent decided, as it happens. The PR asks for it.
- Do not smooth over failures in notes or in the PR. Reviewers return "everything went fine".

## Traps

- `.gitignore` is broad: it drops `bin/`, `vendor/`, `dist/`, `build/`, `out/`, `target/`
  at any depth. Use `git add -f` if my project must track a file there.
- Course files change upstream. Run `git fetch upstream` before capstone work, then
  rebase `main` on `upstream/main`. The `upstream` remote points at `koldovsky/...`.
