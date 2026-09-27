## Context

The repository holds an agent harness, `docs/mvp-plan.md` and `docs/capstone-spec.md`. It holds no
application. This change adds the first code, so it also picks the scaffold, the parser and the test
runner for everything that follows.

`AGENTS.md` fixes the stack: Next.js 16, TypeScript, pnpm, Vitest. It also fixes two conventions that
shape this design. Pure logic lives in `lib/`, with no React import and no Next import. A route
handler stays thin and calls `lib/`.

`docs/mvp-plan.md` holds the research. Three of the four outputs need no model. The transform is
deterministic text work.

## Goals / Non-Goals

**Goals:**

- One pure function that returns four outputs, testable without a browser and without a server.
- `pnpm check` exists and exits 0. `AGENTS.md` names that command, and today it does not exist.
- Every rule in `specs/` maps to a Vitest case. A scenario that no test covers is not done.
- The X thread splitter handles the edge cases that break a naive split: an emoji, a long sentence,
  a code fence, and a URL.

**Non-Goals:**

- The landing page, the email capture and the Vercel deployment. They are the next change.
- Accounts, a database, publish integrations, a scheduler, and the AI hook generator.
- A design system, a component library, and a theme switch. Tailwind utility classes are the whole
  style layer for this change.

## Decisions

**Parse with `unified`, not with a regex.** `remark-parse` gives an AST. The four outputs are four
walks over the same tree. The alternative is a hand-written parser, and `docs/mvp-plan.md` rejects it
in one line: the parser exists, do not write one. A regex over markdown breaks on nested emphasis and
on fenced code.

**Split with `Intl.Segmenter`, not with `twitter-text`.** The human chose this on 2026-09-20. It is
native, so it adds no dependency. The cost is real and it is recorded: X applies a weighted count in
which a URL counts as 23 characters, and a CJK character counts as 2. A grapheme count differs from
that. A `ponytail:` comment marks the ceiling at the split site, and `twitter-text` is the upgrade
path when a user reports an off-by-a-few split.

**Inline the email styles during the tree walk, not with a post-processor.** A style map applied to
the rehype tree costs about 20 lines. The alternative is a library such as `juice`, which is a fourth
dependency for work this small.

**Style with Tailwind CSS v4, not with CSS modules.** The human decided this on 2026-09-20, after
the first scaffold landed. The first scaffold used CSS modules, which this document called enough
for week one. The tool page holds four tabs, a textarea and a copy button for each X part. That is
enough state-dependent styling that utility classes cost less than a module per component. The cost
is two dev dependencies and one PostCSS configuration file. `create-next-app --tailwind` produced
the wiring, so no file here is hand-written.

**Keep the transform behind a route handler.** The function is pure and holds no secret, so it could
run in the browser instead. Two reasons hold the route. The `unified` stack stays out of the client
bundle. The trust boundary gets explicit input validation, which `specs/transform-tool/spec.md`
requires with a 400 and a 413 case. The cost is one network round trip for each transform, and a
public endpoint that accepts text. This decision is reversible. To move the transform to the browser,
edit the spec first.

**Scaffold in a temporary directory, then move the files in.** `create-next-app` refuses a directory
that holds unknown files, and this directory holds `AGENTS.md`, `.claude/`, `docs/` and `openspec/`.
The safe order is: scaffold in a temporary directory, then copy `package.json`, the configuration
files and `app/` into place.

## Risks / Trade-offs

- **The grapheme count is not the X count.** → The comment names the ceiling. The fix is one
  dependency, and it does not change the shape of the function.
- **`create-next-app` overwrites `AGENTS.md` or `.claude/`.** → Scaffold in a temporary directory.
  Copy in one file at a time. Run `git status` before the first commit.
- **The scaffold adds files that the root `.gitignore` drops.** The root file drops `build/`, `dist/`
  and `out/` at any depth. → `.next/` stays untracked on purpose. If a build output must be tracked,
  use `git add -f`.
- **Next.js 16 differs from the versions in the model's memory.** `params`, `searchParams`, `cookies()`
  and `headers()` are async. Interception is `proxy.ts`, not `middleware.ts`. → `AGENTS.md` names both.
  Read `node_modules/next/dist/docs/` before you use an unfamiliar API.
- **A public transform endpoint accepts text from anyone.** → The 100 KB body cap in the spec is the
  first guard. No rate limit ships in this change, because no deployment ships in this change.
- **Vitest and the Next.js scaffold can disagree on the TypeScript configuration.** → Keep the
  `lib/` tests free of React and free of Next. That keeps the test environment `node`, not `jsdom`.

## Migration Plan

Nothing exists yet, so nothing migrates. A rollback is `git revert` of the change commits.

The scaffold lands in its own commit, before any `lib/` code. That keeps the revert of the logic
apart from the revert of the toolchain.

## Open Questions

1. Does the demo video record a local `pnpm dev`, or a Vercel deployment? The answer decides whether
   the deployment moves into this change.
2. Does the tool page need a rendered preview of the blog HTML, or is the source enough for week one?
   The spec asks for the source only.
