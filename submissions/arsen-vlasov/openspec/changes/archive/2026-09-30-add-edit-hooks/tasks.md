# Tasks

## 1. Tests first (red)

- [x] 1.1 Unit tests for `checksFor`, `docFindings`, the pre-commit checks, `newestBlock`, and the new guard rules
- [x] 1.2 `hooks:selftest` cases: red and green for each hook, spawned with real event JSON
- [x] 1.3 See them red

## 2. Implementation (green)

- [ ] 2.1 Guard rules and `classify(text, toolName)`
- [ ] 2.2 `rules:lint` also checks files that git does not track
- [ ] 2.3 `post-edit-check.mjs`, `session-start.mjs`, wiring in `.claude/settings.json`
- [ ] 2.4 `pre-commit.mjs`, `.githooks/pre-commit`, `npm run hooks:install`
- [ ] 2.5 `npm run check` and `npm run hooks:selftest` green

## 3. Close

- [x] 3.1 Live proof: one real edit shows the hook finding, and one real commit with a grown baseline is blocked
- [x] 3.2 Docs (`docs/harness/control.md`, the tech-debt tracker), autonomy log, `openspec validate --strict`, archive
