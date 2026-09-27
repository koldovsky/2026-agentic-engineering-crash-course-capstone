## Why

A creator writes one post in markdown, then spends an hour to reformat it for four places. Ghost
covers the blog and the email. Buffer covers social. No product takes one `.md` file and returns all
four text outputs. `docs/mvp-plan.md` holds the research behind this claim.

This change builds the thin slice of that product. It is also the first code in this capstone, so it
carries requirements R1, R2 and R3 of `docs/capstone-spec.md`.

## What Changes

- The repository gets a Next.js 16 application, TypeScript, pnpm and Vitest. Today it holds only the
  agent harness and two documents.
- `package.json` defines `check` as typecheck, then lint, then tests. `AGENTS.md` already names that
  command. The command does not exist yet.
- A new pure function in `lib/transform/` accepts markdown text. It returns four outputs: blog HTML,
  email HTML, X thread parts, and LinkedIn text.
- A thin route handler at `app/api/transform/route.ts` calls that function.
- One page accepts markdown in a textarea. It shows the four outputs in four tabs, each with a copy
  button.
- No database, no accounts, and no publish integrations. The transform is pure, so the browser holds
  the result.

Not in this change: the landing page, the email capture, and the deployment. They become a second
change. The human decided this order on 2026-09-20, against day 1 of `docs/mvp-plan.md`.

## Capabilities

### New Capabilities

- `markdown-transform`: one markdown source, four channel outputs. It covers the parse step, the
  four output rules, and the split rules for the X thread.
- `transform-tool`: the browser surface. It covers the textarea, the four tabs, the copy action, and
  the thin route handler behind them.

### Modified Capabilities

None. `openspec/specs/` is empty, because this is the first change in the project.

## Impact

**New code.** `lib/transform/`, `app/api/transform/route.ts`, `app/page.tsx`, and a Vitest file
beside each `lib/` module.

**New configuration.** `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`,
`postcss.config.mjs`, and `vitest.config.mts`. `AGENTS.md` requires a human decision before an agent
edits the last five.

**New dependencies.** `next`, `react`, `typescript`, `vitest`, the `unified` stack (`unified`,
`remark-parse`, `remark-rehype`, `rehype-stringify`), and Tailwind CSS v4 (`tailwindcss`,
`@tailwindcss/postcss`). `AGENTS.md` requires a human decision before an agent adds any dependency.
The apply step asked once, on 2026-09-20. The human approved the list, then added Tailwind to it.

**No new dependency for the splitter.** The X thread splitter uses `Intl.Segmenter`, which is native.
The human chose it over `twitter-text` on 2026-09-20. The ceiling is a grapheme count, not the
weighted count that X applies. A `ponytail:` comment marks it in the code.

**Existing harness.** The hooks, the allow-list and the `reviewer` subagent stay as they are. The
scaffold makes `pnpm check`, `pnpm agent:log` and `pnpm hooks:selftest` executable for the first time.
