# Post format

The post is in Ukrainian; everything else about it is described here in English.

## Template

```
⛽ <b>Ціни на пальне — 23 вересня 2026</b>
<i>Зміни відносно 22 вересня</i>

<b>OKKO</b>
<code>А-95   56.99 ▲0.30</code>
<code>А-95+  59.99 ▲0.30</code>
<code>ДП     54.49 ▼0.20</code>
<code>Газ    32.99 =</code>

<b>WOG</b>
<code>А-95   56.89 ▲0.20</code>
<code>ДП     54.39 ▼0.10</code>

<b>Середні ціни</b>
<code>А-95   56.85 ▲0.22</code>
<code>ДП     54.44 ▼0.15</code>

⚠️ Не вдалося отримати дані: SOCAR

Джерела: okko.ua, wog.ua, upg.ua, socar.ua
```

What the Ukrainian lines say: the title is "Fuel prices — September 23, 2026", then "Changes since September 22", the chains, "Average prices", "Could not get data: SOCAR" and "Sources: …". The fuel labels are А-95 (regular 95), А-95+ (premium 95), А-100, ДП (diesel), ДП+ (premium diesel) and Газ (LPG).

How it looks in the channel:

> ⛽ **Ціни на пальне — 23 вересня 2026**
> *Зміни відносно 22 вересня*
>
> **OKKO**
> `А-95   56.99 ▲0.30`
> `А-95+  59.99 ▲0.30`
> `ДП     54.49 ▼0.20`
> `Газ    32.99 =`
> ...

The monospace font (`<code>`) keeps the prices in a straight column.

## Rules

- **Chain order** is fixed, as in the source registry: OKKO, WOG, UPG, SOCAR.
- **Fuel order** is fixed: А-92, А-95, А-95+, А-100, ДП, ДП+, Газ. Fuels a chain does not have are skipped.
- **Price** always has two decimals: `56.90`, not `56.9`.
- **Change marks:**
  - `▲0.30`: price went up;
  - `▼0.20`: price went down;
  - `=`: unchanged;
  - no mark: nothing to compare with.
- **The «Зміни відносно …» line** ("changes since …") is shown only when a previous snapshot exists. When it is not yesterday's, its date is always given.
- **The «Середні ціни» block** ("average prices") covers only fuels sold by at least two chains (see [Storage and comparison](storage-and-comparison.md#average-price)).
- **The «Не вдалося отримати дані» block** ("could not get data") appears only when at least one source failed.
- **The date** is in Ukrainian, in Kyiv time. It is built from the Kyiv date `YYYY-MM-DD` and a list of month names in the genitive case (`23 вересня 2026`). `Intl.DateTimeFormat('uk-UA')` is not used: it appends « р.» and depends on the ICU version. The year in the «Зміни відносно …» line is shown only when it differs from the current one.
- **Alignment:** the fuel label is padded with spaces to 7 characters, prices are right-aligned to the longest price in the post (prices of 100 UAH and more have one more digit).

## Telegram details

- `parse_mode: "HTML"`. It is simpler than MarkdownV2, where many characters need escaping.
- Any text that comes from a site (for example chain names) is escaped: `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`.
- The message limit is 4096 characters. A post for four chains is about 600–800 characters, far below it. The formatter still checks the length and throws when the limit is exceeded instead of silently cutting the text.
- `link_preview_options: { is_disabled: true }` (formerly `disable_web_page_preview: true`), so no link preview appears under the post.

## Ideas

- Highlight the chain with the lowest А-95 price (🏆).
- A weekly summary on Sundays: changes over the week.
- A picture with a monthly price chart (through `sendPhoto`).
