# Error handling

The main rule: **publishing nothing is better than publishing wrong prices.** The bot reports every problem to the admin in a private chat.

## Failures and reactions

| Situation | What happens |
|---|---|
| The site does not answer, times out or returns 5xx | Retried up to `HTTP_RETRIES` attempts with pauses of 2 s → 4 s → 8 s. If that does not help, the source counts as failed. |
| The site returns 403 / 429 (blocking) | One retry after 10 s. Then the source counts as failed. |
| Any other non-2xx status | No retry, the source counts as failed. |
| The response arrived but prices are missing (the site changed) | The source counts as failed; the error names the path that was not found. |
| Unknown fuel name | The item is skipped with a warning in the log. The chain's other prices are posted. |
| Price outside `PRICE_MIN`–`PRICE_MAX` | The item is skipped, the admin is notified. |
| Daily change above `MAX_DAILY_CHANGE_PCT` | The item is skipped, the admin is notified with both values. The parser has probably taken the wrong number. |
| A chain has no usable prices left after normalization and validation | It counts as a failed source. |
| Some sources failed | The post goes out with what is available and the line «Не вдалося отримати дані: …». The admin is notified. |
| Every source failed | **No post**, no snapshot, the admin is notified, the script exits with code 1 (the GitHub Actions run turns red). |
| Telegram returns 5xx or the connection is not established (`ECONNREFUSED`, `ENOTFOUND`, `EAI_AGAIN`) | One retry after 2 s. If it fails, the snapshot is **not** saved (so the next run compares correctly), exit code 1. |
| Telegram returns 429 (Too Many Requests) | Wait `retry_after` seconds from the response and retry once. If `retry_after` is over 60 s, do not wait: the publish counts as failed. |
| Telegram returns another 4xx (wrong `chat_id`, markup error) | No retry: the same request would fail the same way. No snapshot, exit code 1. |
| Telegram request timeout | No retry: the message may already be out, and a retry could post twice. No snapshot, exit code 1; the admin checks the channel by hand. |
| Writing or committing the snapshot fails | The post is already out, so only the admin is notified, exit code 1. The next day compares with the day before, which the post shows. |
| `latest.json` is broken | The error is logged, the run continues as if there were no previous snapshot (post without change marks), the admin is notified. |

## Source isolation

Parsers run through `Promise.allSettled`, not `Promise.all`. One failing does not stop the others:

```js
const settled = await Promise.allSettled(sources.map((source) => source.fetchPrices({ http })));

const results = [];
const errors = [];
settled.forEach((result, i) => {
  if (result.status === 'fulfilled') results.push({ source: sources[i], items: result.value });
  else errors.push({ source: sources[i], error: result.reason });
});
```

## HTTP requests

`src/utils/http.js` wraps `fetch`:

- timeout through `AbortSignal.timeout(HTTP_TIMEOUT_MS)`;
- retries with exponential backoff;
- ordinary browser headers: `User-Agent`, `Accept-Language: uk-UA,uk;q=0.9`;
- an error with the URL and the status when the response is not 2xx.

## Admin notice

Format (the headings are in Ukrainian because the notice goes to Telegram):

```
🚨 fuel-prices-bot — 23.09.2026

Опубліковано: так

Не спрацювали джерела:
• SOCAR: GET https://socar.ua/api/pages/fuel: Timeout after 20000ms (3 attempts)
• UPG: var obj not found in the page

Підозрілі ціни (пропущено):
• WOG А-95: 5.69 (-90.0% since previous 56.69)

Інші проблеми:
• Saving the snapshot failed: disk full

Лог: <link to the GitHub Actions run>
```

The headings mean «Published: yes», «Sources that failed», «Suspicious prices (skipped)», «Other problems» and «Log». Headings are Ukrainian; technical details (error texts) are English, as in the logs. Empty blocks are not shown; the «Лог» line appears only on GitHub Actions. The notice is sent with `parse_mode: HTML`, so error texts are escaped. A notice longer than 4096 characters is cut (unlike the post, delivering it matters more than its completeness).

The link to the GitHub Actions run is built in `src/config.js` (`config.runUrl`) from environment variables that GitHub sets automatically: `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`.

If the notice itself cannot be sent, it goes to the log. GitHub also emails the repository owner when a scheduled workflow fails.

## Logs

- Every step writes a short line to `stderr`: `[info] okko: 7 prices in 842ms`. `stdout` carries only the post text in dry-run mode.
- At `debug` level, also the raw values each parser returned.
- The bot token never reaches the log. GitHub Actions additionally masks secrets automatically.
