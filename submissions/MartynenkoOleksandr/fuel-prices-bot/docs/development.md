# Development

## Requirements

- Node.js 24 LTS or newer (`node -v`). The built-in `fetch`, `node:test` and the `--env-file-if-exists` flag are required. The version is pinned in `.nvmrc`, so `nvm use` is enough.
- npm (ships with Node.js).
- Git.

## Setup

```bash
npm install
cp .env.example .env
```

## `package.json` scripts

```json
{
  "type": "module",
  "engines": { "node": ">=24" },
  "scripts": {
    "start": "node --env-file-if-exists=.env src/index.js",
    "dry-run": "DRY_RUN=true node --env-file-if-exists=.env src/index.js",
    "dry-run:offline": "DRY_RUN=true OFFLINE=true node src/index.js",
    "fixtures:update": "node scripts/update-fixtures.js",
    "test": "node --import ./test/setup.js --test 'test/**/*.test.js' '.cursor/hooks/*.test.mjs'",
    "lint": "eslint .",
    "typecheck": "tsc",
    "check": "npm run lint && npm run typecheck && npm test"
  }
}
```

`--env-file-if-exists` reads `.env` when it exists and does not fail without it, so a dry-run also works in CI.

| Command | What it does |
|---|---|
| `npm run dry-run` | Collects prices from every source, compares them and prints the post. Publishes and saves nothing. The main mode during development. |
| `SOURCES=okko npm run dry-run` | The same for one source. |
| `npm run dry-run:offline` | The same without network: site responses come from `test/fixtures/` according to `test/fixtures/manifest.json`. |
| `npm run fixtures:update -- wog` | Downloads fresh site responses into `test/fixtures/` (without an argument, every source in the manifest). |
| `npm start` | Full run: publish and save the snapshot. |
| `npm test` | Runs the tests. |
| `npm run typecheck` | Type check from JSDoc annotations (`tsc` with `checkJs`, no build). |
| `npm run check` | Lint, types and tests together. CI (`.github/workflows/ci.yml`) and the Cursor hook after every agent reply run the same. |

The post goes to `stdout` and logs to `stderr`, so `npm run dry-run > post.txt` saves only the post text.

## Dependencies

There are no runtime dependencies. Development only:

| Package | Why |
|---|---|
| `eslint`, `@eslint/js`, `globals` | Code style checks |
| `typescript`, `@types/node` | JSDoc type checking. The code stays JavaScript |

Allowed if a future source truly needs them, and only then:

| Package | Why |
|---|---|
| `cheerio` | HTML parsing with CSS selectors. The current four sources serve JSON, so it is not installed |
| `playwright` | Only for a site that needs JavaScript to show prices |

Node.js covers HTTP, Telegram, tests and `.env`.

## Tests

Tests never reach the real sites or Telegram; they run on saved data. `test/setup.js` guarantees it by replacing the global `fetch` with one that always throws. Code that goes to the network takes `fetch` as a parameter, and the test passes a fake. Shared fakes (source, store, Telegram, logger, config) live in `test/helpers/fakes.js`.

| What | How |
|---|---|
| Parsers | Each parser reads its saved response from `test/fixtures/<source>.json` (or `.html`) and must return the expected prices. That is why a parser has two functions: `fetchPrices()` (download) and `parse(body)` (pure parsing, which is what we test). |
| Normalization | Known names → correct codes; an unknown name is skipped. |
| Validation | Out-of-range prices and sharp jumps are dropped. |
| Comparison | Price up, down, unchanged, a new fuel, the first run without `previous`, skipped days, averages. |
| Store | Real files in a temporary directory: atomic writes, reading back, `readBefore`, broken files. |
| Formatter | The exact post text for a fixed input (compared with the example from [Post format](message-format.md)). |
| The whole chain | `test/e2e.test.js` runs `run()` in dry-run mode with every registered source on fixtures and compares the post with the golden file `test/golden/dry-run.txt`. It also runs two days in a row on the real store and a run with one source down. |

The golden file is refreshed with `UPDATE_GOLDEN=1 npm test`. Always review `git diff test/golden/` afterwards: the golden file is a spec, and a change in it must be intended.

When a site changes: `npm run fixtures:update -- <id>`, watch the test fail, fix the parser, the test is green again. Step by step in the `.cursor/skills/fix-broken-parser/` skill.

## Adding a source

The Cursor agent does it with the `research-source` skill (steps 1–2) and `add-fuel-source` (the rest).

1. Research the site following [Data sources](sources.md#how-to-research-a-site-before-writing-a-parser).
2. Save the site's response to `test/fixtures/<id>.json` (or `.html`) and add its URL and file to `test/fixtures/manifest.json`.
3. Create `src/sources/<id>.js` following the parser contract (model: `src/sources/wog.js`).
4. Add its fuel names to `FUEL_MAP` in `src/core/fuels.js`.
5. Register the source in `src/sources/index.js`.
6. Write a test in `test/sources.test.js` and refresh the golden post (`UPDATE_GOLDEN=1 npm test`).
7. Verify: `npm run check`, then `SOURCES=<id> npm run dry-run`.
8. Update the source table in `docs/sources.md`.

## Code style

- ES modules (`import` / `export`), `async` / `await`.
- Pure functions wherever possible (`parse`, `normalize`, `validate`, `compare`, `formatPost`): data in, data out, no side effects. They are easy to test.
- Side effects (network, files, Telegram) only in `sources/*.fetchPrices`, `storage`, `telegram/client` and `index.js`.
- Money is counted in kopecks (integers) and converted to UAH only for display.
- New code has JSDoc types; shared types are in `src/types.js`.

## `.gitignore`

```
node_modules/
.env
.env.*
!.env.example
*.log
```

The `data/` folder is **not** ignored: it must be in the repository.
