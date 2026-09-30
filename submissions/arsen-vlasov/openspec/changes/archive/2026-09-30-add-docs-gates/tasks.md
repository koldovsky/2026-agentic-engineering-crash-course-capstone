# Tasks

## 1. Tests first (red)

- [x] 1.1 `scripts/docs/docs-lint.test.mjs`: one test per scenario, on in-memory file maps
- [x] 1.2 `scripts/docs/docs-ste.test.mjs`: the ratchet cases, the missing-Python case
- [x] 1.3 See them red

## 2. Implementation (green)

- [x] 2.1 `scripts/docs/docs-lint.mjs` (pure `lintDocs`, `ratchet`, CLI)
- [x] 2.2 `scripts/docs/docs-ste.mjs` (calls the vendored linter, ratchet, `--update-baseline`)
- [x] 2.3 Baselines recorded before the English and STE pass. `docs:lint` and `docs:ste` in `check`
- [x] 2.4 `npm run check` green

## 3. After the pass

- [x] 3.1 Baselines updated to the lower counts in the commit of the English and STE pass
- [x] 3.2 `openspec validate --strict`, then archive
