# Data sources

## Sources

| Chain | Site | How prices are fetched | Status |
|---|---|---|---|
| OKKO | https://www.okko.ua | internal JSON API | implemented (`src/sources/okko.js`) |
| WOG | https://wog.ua | internal JSON API | implemented (`src/sources/wog.js`) |
| UPG | https://upg.ua | JSON inside a `<script>` | implemented (`src/sources/upg.js`) |
| SOCAR | https://socar.ua | internal JSON API, price as text | implemented (`src/sources/socar.js`) |

The research was done on September 24, 2026. Details are in "Notes per source" below; the saved responses are in `test/fixtures/`.

## How to research a site before writing a parser

Check the options in this order, from the most reliable to the least:

1. **Internal JSON API.** Open the price page in a browser, DevTools → Network → `Fetch/XHR` filter, reload. If a request returns JSON with prices, use it. JSON rarely changes together with the design, so this is the most stable option.
2. **Prices are in the HTML the server returns.** Check: `curl -A "Mozilla/5.0" <url> | grep "56.99"` (use a price visible on the page). If the price is there, `fetch` plus an HTML parser (`cheerio`) is enough.
3. **Prices are embedded in a `<script>`** as JSON (for example `__NEXT_DATA__` or `window.__INITIAL_STATE__`). Cut the tag's content out and `JSON.parse` it.
4. **Prices appear only after JavaScript runs.** Then `playwright` is needed: open the page in a headless browser, wait for the selector and read the text. The slowest and heaviest option, used only if the others fail.

For every source, record the chosen option and save a copy of the response to `test/fixtures/` for the tests.

## Parser contract

Every file in `src/sources/` exports an object of the same shape:

```js
// src/sources/okko.js
export default {
  id: 'okko',
  name: 'OKKO',
  url: 'https://www.okko.ua/fuels',
  async fetchPrices({ http }) {
    // http carries the timeout and attempts from the config; pass it to getJson / getText from src/utils/http.js
    // download the page, parse it, return the array
    return [
      { rawName: 'A-95', price: 92.90 },
      { rawName: 'Pulls 95', price: 95.90 },
      { rawName: 'DP', price: 99.90 },
      { rawName: 'SPBT', price: 45.50 },
    ];
  },
};
```

Rules:

- `rawName` is the fuel name exactly as the site writes it. Mapping to common codes is done by `normalize.js`, not the parser.
- `price` is a number, UAH per liter. The comma is already a dot; spaces and «грн» are gone. Price text is parsed with `parseUah` from `src/core/money.js`: it accepts only `92.90`, `97.9`, `104` or `92,90` and returns `null` for anything else, so the parser throws instead of guessing.
- If the page did not load or the prices are not found, the parser **throws** with a clear message. It never returns an empty array: that would hide the breakage.
- The parser knows nothing about Telegram, storage or comparison.

## Fuel name normalization

Chains name fuels differently, premium ones especially. To compare across days and chains, names are mapped to common codes:

| Code | Shown in the post | Names on the sites |
|---|---|---|
| `a92` | А-92 | none of the four chains publishes it on its site now |
| `a95` | А-95 | OKKO `A-95`, WOG `95 Євро5-Е10`, UPG `A-95`, SOCAR `Бензин А-95` |
| `a95_premium` | А-95+ | OKKO `Pulls 95`, WOG `95 Mustang Євро5-Е10`, UPG `upg95`, SOCAR `NANO 95` |
| `a100` | А-100 | OKKO `Pulls 100`, WOG `100 Mustang Євро5-Е0`, UPG `upg100`, SOCAR `NANO 100` |
| `diesel` | ДП | OKKO `DP`, WOG `ДП Євро5`, UPG `EURO DIESEL` (SOCAR has no regular diesel on its site) |
| `diesel_premium` | ДП+ | OKKO `Pulls Diesel`, WOG `ДП Mustang+`, UPG `upgDIESEL`, SOCAR `DIESEL NANO Extro` |
| `lpg` | Газ | OKKO `SPBT`, WOG `ГАЗ`, UPG `Газ`, SOCAR `LPG` |

The names are exactly what the parser returns in `rawName` (see the notes per source). Watch Cyrillic and Latin look-alikes: OKKO and UPG write `A-95` with a Latin A, SOCAR writes `А-95` with a Cyrillic one, WOG writes `Е10` with a Cyrillic Е. Every chain also sells AdBlue: it is not fuel, so the map marks it as deliberately ignored (`null`) and it is skipped without a warning.

The implementation is a separate map per source, because the same name can mean different things at different chains:

```js
// src/core/fuels.js (used by src/core/normalize.js)
export const FUEL_MAP = {
  okko: { 'A-95': 'a95', 'Pulls 95': 'a95_premium', DP: 'diesel', AdBlue: null, /* ... */ },
  wog:  { '95 Євро5-Е10': 'a95', '95 Mustang Євро5-Е10': 'a95_premium', AdBlue: null, /* ... */ },
};
```

A name missing from the map is logged as a warning and skipped. A new fuel on a site does not break the post, and the logs show that the map needs an entry.

## Ethics and terms of use

- One request per source per day: the load on the sites is negligible.
- A realistic `User-Agent` header; no aggressive circumvention of protection.
- `robots.txt` and the terms of use of every site are checked before implementation.
- Every post lists its sources.

## Notes per source

Common to all four: `robots.txt` does not forbid the addresses we use, and the terms of use (where there are any) do not forbid automated collection. Prices on the sites are the same across the chain, not per station (except UPG, see below). No source needs Playwright. Prices are per liter, LPG too.

### OKKO
- Price page: https://www.okko.ua/fuels
- Method: the internal JSON API the site itself uses (Nuxt): `GET https://www.okko.ua/api/uk/fuels`. Fixture: `test/fixtures/okko.json`.
- JSON path: `data.layout[]` → the element whose `data.bullets.componentName === "Global_BulletsFuel"` (the element itself is `FuelBaner`) → `data.bullets.items[]`. In each item: `fuel_code` (a stable code, used as `rawName`), `price` (a string, `"92.90"`), `title` and `type` (`euro` / `pulls`), for display only.
- Codes: `A-95`, `Pulls 95`, `Pulls 100`, `DP`, `Pulls Diesel`, `SPBT` (LPG), `AdBlue`.
- Quirks:
  - The same table is embedded in the HTML of `/fuels` and the home page in `window.__NUXT__`, but compressed (values are passed as function arguments), so the API is simpler.
  - The station map (`/fuel-map`) has no prices, only fuel availability per station.
  - The response has no update date. It is a CMS block, so it may be updated by hand and not daily. Worth watching after launch.

### WOG
- Price page: https://wog.ua/ua/fuels/
- Method: public JSON API `GET https://api.wog.ua/fuel_stations`. Fixture: `test/fixtures/wog.json`.
- JSON path: `data.fuel_filters[]`. In each item: `name` (`95`, `ДП`, `100`, `ГАЗ`, `AdBlue`), `brand` (`Євро5-Е10`, `Mustang Євро5-Е10`, …; absent for LPG and AdBlue), `price` as an **integer in kopecks** (`9290` = 92.90 UAH), `id`.
- `rawName` = `name` and `brand` joined by a space when `brand` exists: `95 Євро5-Е10`, `ДП Mustang+`, `ГАЗ`.
- Quirks:
  - The response also lists ~350 stations (`data.stations`), which we do not need. Individual stations (`/fuel_stations/<id>`) are not requested: one request is enough.
  - The same prices are in the `__NEXT_DATA__` of `/ua/fuels/` (`props.pageProps.initialReduxState.pageReducer.elements[1].block.items`), a fallback if the API closes.
  - According to the site, Mustang 100 has an octane number of 98 but is marketed as "100"; it maps to `a100`.
  - `wog.ua/robots.txt` redirects to `api.wog.ua/robots.txt`.

### UPG
- Price page: https://upg.ua/cini-na-palne/
- Method: JSON inside a `<script>` in the page HTML (WordPress): `var obj = {...};`. Fixture: `test/fixtures/upg.html`.
- JSON path: `obj.data[]`, rows `{ RegionID, RegionName, AveragePrice, FuelTypeId, Title }`, one per region and fuel (21 regions). `AveragePrice` is a string, `"88.90"`. `Title` is used as `rawName`: `A-95` (Latin A), `upg95`, `upg100`, `EURO DIESEL`, `upgDIESEL`, `Газ`, `AdBlue`.
- Update date: `obj.LastDataUpdateDate` (`"2026-09-24"`). Could be used to check that the data is fresh.
- Quirks:
  - Prices are **per region**, but the post shows one price per chain. Prices are almost the same everywhere (on 24.09.2026 only `upgDIESEL` differed: 99.90 / 99.91 / 99.94), so the most common value across regions is used; on a tie, the lower one. Some regions lack some fuels, which is not an error.
  - The object is cut out of the script text (from `var obj =` to the matching closing brace, skipping braces inside strings) and parsed with `JSON.parse`, never executed as JavaScript.
  - `LastDataUpdateDate` is not checked yet.

### SOCAR
- Price page: https://socar.ua/fuel
- Method: the site's internal JSON API (Nuxt, JSON:API format): `GET https://socar.ua/api/pages/fuel`. Fixture: `test/fixtures/socar.json`.
- JSON path: `data.attributes.blocks.data[]` → the block with `id: "contentCardList"` → `attributes.items[]`. In each item: `title.text` (used as `rawName`) and `price` as **text**, `"*Ціна: 97.9 грн/л"` or `"*Ціна: 104 грн/л"` ("Price: 97.9 UAH/l"); the number is taken out with a regular expression.
- Names: `Бензин А-95`, `NANO 95`, `NANO 100`, `NANO ДП`, `DIESEL NANO Extro`, `LPG`, `AdBlue`.
- Quirks:
  - The least reliable source: prices are CMS marketing text with the note «Ціни можуть змінюватись. Актуальні ціни – на АЗК SOCAR» ("prices may change, current prices are at SOCAR stations"), sometimes rounded to whole hryvnias (`104`), with no update date.
  - There is no regular diesel on the site, only the premium `NANO ДП` and `DIESEL NANO Extro`. `DIESEL NANO Extro` maps to `diesel_premium` (ДП+), and `NANO ДП` is skipped (`null`): there is no separate code for a second premium diesel.
  - The station map (`/map`) has no prices.
