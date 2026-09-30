# Design

## Contracts

- **PostToolUse (Claude Code).** The hook reads the event JSON on stdin (`tool_name`,
  `tool_input.file_path`). Exit 2 sends stderr back to the agent. The edit has already happened, so the
  hook reports and does not undo.
- **SessionStart.** The hook prints to stdout, and Claude Code adds stdout to the context.
- **git pre-commit.** `.githooks/pre-commit` calls `node scripts/harness/pre-commit.mjs`. Exit 1 stops
  the commit. `npm run hooks:install` runs `git config core.hooksPath .githooks`.

## Pure core, thin shell

As in the other harness scripts, the tests call pure functions:

- `post-edit-check.mjs` exports `checksFor(path)` (which checks apply) and `docFindings({ path,
  content, steReport, baselines })`.
- `pre-commit.mjs` exports `checkEnvFiles(paths)`, `baselineGrowth(name, head, staged)` and
  `knownFailureIssues(head, staged)`.
- `session-start.mjs` exports `newestBlock(text)`.
- `guard-policy.mjs` gets an optional second argument: `classify(text, toolName)`. The `Grep`/`Glob`
  rule needs the tool name. The Cursor adapter keeps calling `classify(text)`.

## Reuse

- The doc checks import `inScope` and `cyrillicProseLines` from `scripts/docs/docs-lint.mjs`, and
  `STE_EXEMPT` from `scripts/docs/docs-ste.mjs`. There is one definition of the scope.
- The code check runs the whole `rules:lint` (0.2 s) and keeps only the lines about the edited file.
  Per-file mode is not worth a second code path.
- ESLint runs only on `.ts` files under `tests/` and `page-objects/`, with `--quiet`. It takes about
  5 s per file, so it does not run for other files.

## Baselines as flat keys

Each baseline becomes a map of `key → number` before the comparison:

- `.ste-baseline.json`, `.docs-language-baseline.json`: `file`.
- `.rules-lint-baseline.json`: `check › file`.
- `eslint-suppressions.json`: `file › rule`, from `count`.

A key that is new or larger in the staged version fails.

## Limits that stay

- A person can still run `git commit --no-verify` in a terminal. The guard blocks it only for the agent.
- `git -c core.hooksPath=…` and other git-config tricks are not in the guard. They go to the tech-debt
  tracker.
- Bash reads of `test-data/users/static/stage.json` are not blocked. The provisioning flow and
  `git diff --numstat` need the path. They go to the tech-debt tracker.
