# Architecture

## Principles

- **One run, one job.** The script does not run continuously: it starts, does all the work and exits. No server is needed.
- **Every source is isolated.** Each gas station chain has its own parser module. If one site changes its layout or is down, the others keep working.
- **One data shape.** All parsers return data of the same structure, so the rest of the code does not know where prices came from.
- **Check first, publish second.** Suspicious data never reaches the channel.

## Data flow

```
┌──────────────┐
│  Scheduler   │  GitHub Actions, cron once a day
└──────┬───────┘
       ▼
┌──────────────┐     ┌─────────────────────────────┐
│  Collector   │────▶│ Parsers: okko, wog, upg,    │
│  (collect)   │◀────│ socar (in parallel)         │
└──────┬───────┘     └─────────────────────────────┘
       ▼
┌──────────────┐
│ Normalization│  fuel names → common codes (a95, diesel, …)
│ + validation │  implausible values dropped
└──────┬───────┘
       ▼
┌──────────────┐     ┌──────────────────┐
│  Comparison  │◀────│ data/latest.json │  previous snapshot
└──────┬───────┘     └──────────────────┘
       ▼
┌──────────────┐
│  Formatter   │  post text in Telegram HTML
└──────┬───────┘
       ▼
┌──────────────┐
│  Telegram    │  sendMessage to the channel
└──────┬───────┘
       ▼
┌──────────────┐
│  Storage     │  new snapshot → data/latest.json and data/history/
└──────────────┘  committed to the repository
```

The order matters: the snapshot is saved **after** a successful publish. If publishing fails, the next run compares against the same previous day and the post is still correct.

## Modules

| Module | Responsibility |
|---|---|
| `src/index.js` | Entry point. Runs the steps in order, handles `DRY_RUN`. |
| `src/config.js` | Reads environment variables and checks that the required ones are set. |
| `src/sources/*.js` | One parser per chain. Exports `id`, `name`, `url` and `fetchPrices()`, plus a pure `parse()`. |
| `src/sources/index.js` | Registry of all sources; its order is the order in the post. |
| `src/core/collect.js` | Runs all parsers in parallel, gathers results and errors. |
| `src/core/fuels.js` | Fuel codes, their order in the post, labels and the per-source `FUEL_MAP`. |
| `src/core/money.js` | UAH to kopecks for comparisons; strict parsing of price text (`parseUah`). |
| `src/core/normalize.js` | Maps fuel names from the sites to common codes. |
| `src/core/validate.js` | Drops implausible prices. |
| `src/core/compare.js` | Diffs against the previous snapshot, computes averages. |
| `src/storage/jsonStore.js` | Reads and atomically writes `data/latest.json` and the history files. |
| `src/telegram/formatter.js` | Builds the post and the admin notice text. |
| `src/telegram/client.js` | Sends messages through the Bot API. |
| `src/utils/http.js` | `fetch` with a timeout, retries and browser-like headers. |
| `src/utils/logger.js` | Minimal logger with `debug` / `info` / `warn` / `error` levels, writes to `stderr`. |
| `src/utils/fixtureFetch.js` | A `fetch` replacement answering from saved fixtures (`OFFLINE=true`, the end-to-end test). |
| `src/utils/date.js` | `YYYY-MM-DD` date in a given time zone (the Kyiv date for posts and files). |
| `src/utils/errors.js` | Error message helper. |
| `src/types.js` | Shared JSDoc types: `Source`, `Snapshot`, `Comparison` and others. No code. |
| `scripts/update-fixtures.js` | Refreshes fixtures from the live sites (`npm run fixtures:update`). |

## Folder layout

```
fuel-prices-bot/
├── .cursor/                     # agent hooks, rules and skills (see AGENTS.md)
├── .github/
│   ├── dependabot.yml
│   └── workflows/
│       ├── ci.yml               # lint, types, tests, offline dry-run
│       └── daily-post.yml       # schedule and the daily run
├── data/
│   ├── latest.json              # last published snapshot
│   └── history/
│       └── 2026-09-28.json      # archive, one file per day
├── docs/                        # this documentation
├── scripts/
│   └── update-fixtures.js
├── src/
│   ├── index.js
│   ├── config.js
│   ├── types.js                 # shared JSDoc types
│   ├── core/
│   │   ├── collect.js
│   │   ├── compare.js
│   │   ├── fuels.js
│   │   ├── money.js
│   │   ├── normalize.js
│   │   └── validate.js
│   ├── sources/
│   │   ├── index.js
│   │   ├── okko.js
│   │   ├── wog.js
│   │   ├── upg.js
│   │   └── socar.js
│   ├── storage/
│   │   └── jsonStore.js
│   ├── telegram/
│   │   ├── client.js
│   │   └── formatter.js
│   └── utils/
│       ├── date.js
│       ├── errors.js
│       ├── fixtureFetch.js
│       ├── http.js
│       └── logger.js
├── test/
│   ├── setup.js                 # disables the network in tests
│   ├── helpers/                 # fakes (sources, store, Telegram) and golden file helper
│   ├── fixtures/                # saved site responses + manifest.json
│   ├── golden/dry-run.txt       # expected offline post
│   └── *.test.js                # one file per module, plus e2e.test.js
├── .env.example
├── .nvmrc
├── AGENTS.md
├── eslint.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## Main steps of `index.js` (pseudocode)

In the code this sequence is the `run()` function, which receives every dependency (config, sources, store, Telegram client, clock) as a parameter. That lets `test/index.test.js` check the order of steps and the reaction to failures without network or files. A dry-run is not stopped by today's `postedDate`, because it publishes nothing.

```js
const config = loadConfig();
const previous = await store.readLatest();          // null on the first run

if (!config.force && !config.dryRun && previous?.postedDate === today()) {
  log.info('Already posted today, skipping');
  return;
}

// A second run on the same day (FORCE, dry-run) is compared not with today's snapshot
// but with the newest snapshot before today from history/.
const baseline = previous?.date === today() ? await store.readBefore(today()) : previous;

const { results, errors } = await collectAll(sources);
const snapshot = validate(normalize(results), baseline);

if (snapshot.stations.length === 0) {
  await notifyAdmin('No source returned prices', errors);
  process.exit(1);
}

const diff = compare(baseline, snapshot);
const text = formatPost(diff, errors);

if (config.dryRun) {
  console.log(text);
  return;
}

await telegram.sendMessage(config.channelId, text);
await store.save({ ...snapshot, postedDate: today() });

if (errors.length) await notifyAdmin('Some sources failed', errors);
```
