# Storage and price comparison

## Why store anything

To show how prices changed («▲0.30») the bot has to remember the previous values. The script runs on GitHub Actions and nothing survives the run, so the data is kept in files inside the repository and committed after every successful run.

## Files

```
data/
├── latest.json            # the last successfully published snapshot
└── history/
    ├── 2026-09-22.json
    └── 2026-09-23.json    # a copy of the snapshot for every day
```

- `latest.json` is what the next run compares with.
- `history/` is the archive. It is not needed for the daily comparison (except for a second run on the same day, see below), but it allows charts and weekly or monthly summaries later.

## Snapshot format

```json
{
  "schemaVersion": 1,
  "date": "2026-09-23",
  "collectedAt": "2026-09-23T06:00:12.345Z",
  "postedDate": "2026-09-23",
  "stations": [
    {
      "id": "okko",
      "name": "OKKO",
      "prices": {
        "a95": 56.99,
        "a95_premium": 59.99,
        "diesel": 54.49,
        "lpg": 32.99
      }
    },
    {
      "id": "wog",
      "name": "WOG",
      "prices": {
        "a95": 56.89,
        "diesel": 54.39
      }
    }
  ],
  "failedSources": ["socar"]
}
```

| Field | Description |
|---|---|
| `schemaVersion` | Format version. Bumped when the structure changes, so the code can read old files correctly. |
| `date` | The day the prices belong to, in Kyiv time (`Europe/Kyiv`). |
| `collectedAt` | Exact collection time, UTC. |
| `postedDate` | The day the snapshot was published. Used against double posting. |
| `stations` | Prices per chain, already normalized. |
| `failedSources` | Sources that failed that day. |

Prices are stored as numbers with up to two decimals. To avoid floating point errors when subtracting, differences are computed in kopecks: `Math.round(price * 100)`.

## Comparison algorithm

Input: `previous` (the content of `latest.json` or `null`) and `current` (the snapshot just collected).

For every chain and every fuel in `current`:

| Situation | Result | Mark in the post |
|---|---|---|
| Previous price exists, the new one is higher | `delta > 0` | `▲0.30` |
| Previous price exists, the new one is lower | `delta < 0` | `▼0.20` |
| Price unchanged | `delta = 0` | `=` |
| No previous price (new fuel, the chain failed yesterday, first run) | `delta = null` | no mark |

A fuel that disappeared today is not shown.

Comparison result:

```js
{
  date: '2026-09-23',
  previousDate: '2026-09-22',     // or null
  stations: [
    {
      id: 'okko',
      name: 'OKKO',
      fuels: [
        { code: 'a95', price: 56.99, previous: 56.69, delta: 0.30 },
        { code: 'lpg', price: 32.99, previous: 32.99, delta: 0 },
        { code: 'a100', price: 64.99, previous: null, delta: null },
      ],
    },
  ],
  averages: [
    { code: 'a95', price: 56.85, previous: 56.63, delta: 0.22, stationsCount: 4 },
  ],
}
```

### Average price

For every fuel, the arithmetic mean over the chains that returned a price today, rounded to a kopeck. An average is shown only if the fuel is sold by **at least two chains**: the "average" of one chain would just repeat its prices.

For an honest average, `delta` compares only the chains priced **both yesterday and today**: `delta` is the mean change of those chains, `previous` is their mean previous price. Otherwise, if a cheaper chain failed yesterday and works today, the average would "drop" without any real price change. So `price − previous` may differ from `delta` when the set of chains changed. If no chain had a price yesterday, `previous` and `delta` are `null`.

### Skipped days

The comparison is always with `latest.json`, that is with the **last successful** snapshot, not strictly with yesterday. If runs failed for several days, the post says which date it compares with: «Зміни відносно 20 вересня» ("changes since September 20").

### A second run on the same day

If `latest.json` already has today's date (a rerun with `FORCE=true`, or a dry-run after the morning post), it cannot be compared with: every price would come out «=». Then the newest snapshot **before today** is taken from `history/`; if there is none, prices are shown without marks. Validation uses the same snapshot for the daily change check.

### Broken file

A snapshot is checked when read: valid JSON, `schemaVersion` = 1, date `YYYY-MM-DD`, an `id` and numeric prices for every chain. If something is wrong, the store throws an error naming the file (`latest.json: invalid JSON …`) instead of pretending there is no snapshot. The run continues without comparison and the admin is notified.

### A chain failed yesterday

If a chain is missing from `previous.stations` but present in `current`, its last prices could be looked up in `history/` (up to 7 days back). For now the prices are shown without change marks.

## Writing

The order after a successful publish:

1. Write `data/history/<date>.json`.
2. Overwrite `data/latest.json` with the same content.
3. On GitHub Actions, commit both files (see [Deployment](deployment.md)).

Every file is written atomically: first to a temporary file, then renamed. A crash in the middle of a write cannot leave broken JSON behind. Keys are written in the order shown above with a 2-space indent, so history diffs in git stay readable. A second write on the same day (`FORCE=true`) overwrites `history/<date>.json`.

The folder is `data/` at the repository root, regardless of the current directory of the run.

## Data volume

One snapshot is about 1–2 KB, a year is up to 1 MB. That is nothing for a repository, so the history needs no rotation.
