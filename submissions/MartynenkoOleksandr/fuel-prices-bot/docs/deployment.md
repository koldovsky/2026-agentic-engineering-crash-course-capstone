# Deployment: GitHub Actions

## Why GitHub Actions

- Free for public repositories; for private ones the monthly minutes are far more than enough (one run takes about a minute).
- No server to rent or maintain.
- Every run's log is kept in the Actions tab.
- The data (price snapshots) lives right in the repository.

## Workflow

The file is [`.github/workflows/daily-post.yml`](../.github/workflows/daily-post.yml). What it contains:

- **Triggers:** three schedules, the main `17 6 * * *` and the backups `47 6 * * *` and `47 7 * * *` (UTC, see below), plus a manual run from the Actions tab (`workflow_dispatch`) with two checkboxes: `dry_run` only prints the post in the log, `force` posts again on the same day.
- **`permissions: contents: write`** to commit `data/`.
- **`concurrency: daily-post`** without cancellation: two runs never go in parallel, the second waits for the first and is then skipped thanks to `postedDate`. For that, `actions/checkout` gets `ref: ${{ github.ref_name }}`: without it, it checks out the commit the run was created at, and the second run would not see the snapshot committed by the first.
- **Steps:** `actions/checkout@v7`, `actions/setup-node@v7` with `node-version-file: .nvmrc`, `npm ci`, `node src/index.js`.
- **Variables for the script:** `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ADMIN_CHAT_ID` from Secrets, `TELEGRAM_CHANNEL_ID` from Variables (see [Configuration](configuration.md#github-actions)), `DRY_RUN` and `FORCE` from the manual run checkboxes (`false` on schedule).
- **Committing the snapshot** runs even after a failed publish step (but not in dry-run and not when cancelled). The script saves the snapshot only after a successful publish, so if files in `data/` changed, the post is out, and the snapshot must reach the repository, or the next run would not know today was posted. With no changes the step does nothing. `git pull --rebase` runs before `git push`, so a push to the branch in the meantime does not break it.

Commits made with `GITHUB_TOKEN` do not trigger other workflows, so the daily snapshot commit does not start CI.

The action versions are current as of September 2026 (`@v7`); Node.js comes from `.nvmrc`. Dependabot proposes further action updates (`.github/dependabot.yml`).

## Schedule and time zones

- GitHub Actions cron runs **in UTC only**.
- Ukraine switches to daylight saving time: UTC+3 in summer, UTC+2 in winter. So `17 6 * * *` is 09:17 in summer and 08:17 in winter.
- For the same Kyiv time all year there are two options:
  1. Schedules for both offsets, with the script checking the Kyiv hour and the extra run exiting without doing anything.
  2. Accept the one-hour difference, which is usually fine for a daily post.
- **Scheduled runs can be late or not happen at all.** GitHub does not guarantee them: under load the queue is delayed and some runs are dropped. In practice, the 06:17 UTC slot of September 28, 2026 started at 13:59 UTC, and on September 29 no run had started by 07:00 UTC. Therefore:
  - the schedule is not on `:00` but on `:17` and `:47`, since the queue is longest at the top of the hour;
  - there are two backup schedules, `47 6 * * *` and `47 7 * * *`. The first run that actually starts posts; the others see today's `postedDate` and exit within seconds. If none starts, run the workflow by hand;
  - if a guaranteed time is ever needed, there are two ways: an external scheduler that calls `workflow_dispatch` through the GitHub API (needs a separate token), or a VPS (see below).

## Protection against double posting

A run can happen twice: a manual rerun, several schedules, a retry after a failure. To avoid two posts a day, the script checks `postedDate` in `data/latest.json`: if it equals today's Kyiv date, publishing is skipped. `FORCE=true` overrides it.

## Inactive repositories

GitHub disables scheduled workflows in public repositories after 60 days without activity. The daily snapshot commits are activity, so normally this is not a problem. But if the bot fails for a long time and commits nothing, the workflow may be disabled; re-enable it in the Actions tab.

## Playwright (if ever needed)

If a source ever needs a headless browser, the workflow gets a step before the run:

```yaml
      - run: npx playwright install --with-deps chromium
```

That adds 30–60 seconds to every run. The browser can be cached with `actions/cache` for `~/.cache/ms-playwright`.

## Alternative: VPS

If an exact start time or heavy computation is ever needed, the same script runs unchanged on any server via cron:

```cron
17 9 * * * cd /opt/fuel-prices-bot && node --env-file=.env src/index.js >> logs/run.log 2>&1
```

On a VPS you can set `CRON_TZ=Europe/Kyiv`, which removes the daylight saving problem. The only difference is that snapshots stay on the server's disk and need no commits.
