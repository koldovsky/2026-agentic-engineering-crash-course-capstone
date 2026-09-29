# Roadmap

## Stage 0. Research

- [x] For every chain (OKKO, WOG, UPG, SOCAR), find the page with prices.
- [x] Pick the method: JSON API, static HTML, JSON in a `<script>` or Playwright.
- [x] Record URLs, paths and fuel names in [Data sources](sources.md).
- [x] Check `robots.txt` and the terms of use of the sites.
- [x] Save sample responses to `test/fixtures/`.

## Stage 1. Project skeleton

- [x] `package.json`, `.gitignore`, `.env.example`.
- [x] `config.js` with variable checks.
- [x] `logger.js`, `http.js` with timeout and retries.
- [x] An empty `index.js` that goes through every step with stubs.
- [x] ESLint, JSDoc type checking, `npm run check`, CI, Dependabot.

## Stage 2. First source end to end

- [x] A parser for one chain plus a fixture test (WOG).
- [x] Normalization and validation.
- [x] Post formatter (no comparison yet).
- [x] `npm run dry-run` prints a correct post.
- [x] Offline dry-run on fixtures, golden post, fixture refresh, Cursor rules and skills.

## Stage 3. Telegram

- [x] Create the bot and a test channel ([guide](telegram-setup.md)).
- [x] `telegram/client.js`, publishing to the test channel.
- [x] Admin notices.

## Stage 4. Storage and comparison

- [x] `jsonStore.js`: reading and atomic writes of `latest.json` and `history/`.
- [x] `compare.js` plus tests for every scenario.
- [x] Change marks and average prices in the formatter.
- [x] Protection against double posting (`postedDate`).

## Stage 5. The remaining sources

- [x] Parsers for the other chains plus tests.
- [x] Partial failure check (one source down).

## Stage 6. Deployment

- [x] GitHub repository, secrets and variables.
- [x] `daily-post.yml` workflow.
- [x] Manual run with `dry_run`, then with publishing to the test channel.
- [x] Backup schedules after GitHub delayed and dropped scheduled runs.
- [ ] A week on the test channel, then switching to the main one.

## Stage 7. Documentation in English

- [x] Translate the documentation to English (`docs/`, `README.md`); the Ukrainian version stays in the git history.

## Ideas

- Weekly and monthly summaries.
- A price chart as a picture.
- Mark the cheapest chain for every fuel.
- Other news categories on the same pattern (exchange rates, grocery prices): the architecture with independent sources allows it.
- Regional prices, if the chains publish them.
- Check UPG's `LastDataUpdateDate` to catch stale prices.
