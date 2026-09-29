# Configuration

All configuration comes from environment variables. Locally from the `.env` file (never committed), on GitHub Actions from the repository's Secrets and Variables.

## Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | yes | — | Bot token from BotFather. **Secret.** |
| `TELEGRAM_CHANNEL_ID` | yes | — | `@channel_name` or a numeric ID `-100...` |
| `TELEGRAM_ADMIN_CHAT_ID` | no | — | Where technical notices go. Without it, problems go only to the log. |
| `DRY_RUN` | no | `false` | `true`: collect prices and print the post without publishing or saving. |
| `OFFLINE` | no | `false` | `true`: site responses come from `test/fixtures/` instead of the network. Only together with `DRY_RUN=true`. |
| `FORCE` | no | `false` | `true`: publish even if today was already posted. |
| `SOURCES` | no | all | Comma-separated sources, for example `okko,wog`. Handy for debugging. |
| `PRICE_MIN` | no | `20` | Lowest plausible price per liter, UAH. |
| `PRICE_MAX` | no | `200` | Highest plausible price per liter, UAH. |
| `MAX_DAILY_CHANGE_PCT` | no | `15` | A daily change above this percentage is suspicious. |
| `HTTP_TIMEOUT_MS` | no | `20000` | Timeout of one HTTP request. |
| `HTTP_RETRIES` | no | `3` | Attempts per source. |
| `LOG_LEVEL` | no | `info` | `debug` / `info` / `warn` / `error` |
| `TZ_NAME` | no | `Europe/Kyiv` | Time zone for the dates in the post and in file names. |

The Telegram variables are not required in dry-run mode.

## `.env.example`

This file is committed as a template:

```dotenv
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHANNEL_ID=@fuel_prices_ua
TELEGRAM_ADMIN_CHAT_ID=

DRY_RUN=false
FORCE=false
# SOURCES=okko,wog

LOG_LEVEL=info
```

Locally `.env` is read by the built-in Node.js flag: `node --env-file-if-exists=.env src/index.js`. No `dotenv` library is needed.

## Startup check

At startup `src/config.js`:

1. Reads every variable and converts types (`"true"` → `true`, `"20"` → `20`).
2. If a required variable is missing outside `DRY_RUN`, or a value is invalid (not a number, unknown `LOG_LEVEL`, nonexistent time zone, unknown source in `SOURCES`), exits with code 1 and lists **all** problems at once, for example `TELEGRAM_BOT_TOKEN is not set`.
3. Returns a deeply frozen configuration object (`Object.freeze`) that is passed to the other modules.

## GitHub Actions

| Name | Kind | Value |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Secret | the bot token |
| `TELEGRAM_ADMIN_CHAT_ID` | Secret | your personal chat_id |
| `TELEGRAM_CHANNEL_ID` | Variable | the channel, for example `@fuel_prices_ua` (the test channel while testing) |

Set them in the repository: Settings → Secrets and variables → Actions. The channel is a Variable rather than a Secret because it is not secret and switching channels means editing one visible value.
