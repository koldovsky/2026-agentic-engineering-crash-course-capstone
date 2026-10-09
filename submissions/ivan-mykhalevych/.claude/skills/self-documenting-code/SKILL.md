---
name: self-documenting-code
description: Project code style - do not write code comments; make code self-explanatory. Use whenever writing, editing or reviewing TypeScript/React source or tests in this project.
---

# Self-documenting code (no comments)

**Rule: we do not comment code. The code must explain itself.**

## Instead of a comment
- Rename: a precise variable, function or test name replaces most comments.
- Extract: pull a block that needs explaining into a function named for what it does.
- Name magic values: `const MIN_OPTIONS = 4`, not `4 // options per question`.
- Use types to state intent (`Level`, `Question`) instead of describing shapes in prose.
- Put the "why" in the test name or in `docs/` (spec, design), not next to the code.

## Not comments, so allowed
- Tool directives that must exist (`// eslint-disable-next-line ...`, `"use client"`).
- Licence headers a dependency requires.
- Shell and config files where a one-line usage note is the convention (e.g. the git hook).

## When you are tempted to write a comment
Ask "what would make this unnecessary?" and do that. If the answer is a long explanation,
it belongs in `docs/spec.md` or `docs/design.md`, linked from the commit message.

## When reviewing
Flag any comment that only restates the code or marks a section. Delete it, or rename
something so it is not needed.
