# Design

Mobile-first. Tailwind CSS only — no component library.
Target: 375 px minimum width; desktop layout kicks in at `md` (768 px).

---

## Global shell

- Persistent top bar: app name + a brief tagline.
- Full-width disclaimer banner below the top bar on every page:
  > **Demo data — not investment advice**
- Body background: neutral-50 (light) / neutral-900 (dark).
- Focus rings: 2 px solid, brand-primary color — visible on all interactive elements.
- WCAG 2.1 AA contrast on all text and meaningful UI elements.

---

## Page: `/etfs` (list)

### Layout (mobile → desktop)

```
┌──────────────────────────────────────┐
│  Top bar                             │
│  Disclaimer banner                   │
├──────────────────────────────────────┤
│  Search input  [Reset filters]       │
│  Filter row (chips / dropdowns)      │
│  ─────────────────────────────────── │
│  Table (full width, horizontally     │
│  scrollable on mobile)               │
│  Showing X–Y of N        Pagination  │
└──────────────────────────────────────┘
```

Desktop: filters in a sticky left column; table fills the rest.

### Filters

| Control | Type | Notes |
|---|---|---|
| Search | Text input | Debounced; matches ticker prefix or name substring |
| Asset class | Multi-select checkboxes | equity, bond, commodity, real estate, multi-asset |
| Region | Multi-select | Europe, North America, Global, Asia Pacific, Emerging Markets |
| Issuer | Multi-select | iShares, Vanguard, Amundi, … |
| Max TER | Number input or range slider | Step 0.01; unit label "%" |
| Distribution | Multi-select | accumulating, distributing |
| Reset filters | Button | Clears all searchParams |

### Table columns

ticker · name · issuer · asset class · region · TER % · AUM · 1Y return

Sort indicator: ▲ / ▼ on the active column header; click toggles direction.
Columns sort is applied one at a time (no multi-sort).
Row is a link to `/etfs/[ticker]`; entire row clickable.

### States

| State | UI |
|---|---|
| Loading (initial) | Skeleton rows (same height as real rows) |
| Results | Table rows + "Showing X–Y of N" |
| Empty (filters active) | Centered message: "No ETFs match your filters." + "Clear filters" button |
| Empty (no data at all) | "No ETF data available." (should never happen with seed data) |

---

## Page: `/etfs/[ticker]` (details)

### Layout

```
┌──────────────────────────────────────┐
│  Top bar  /  Disclaimer banner       │
│  ← Back to list (keeps filter URL)  │
├──────────────────────────────────────┤
│  Name  TICKER                        │
│  Issuer badge · Asset class · Region │
│  Distribution policy                 │
├──────────────────────────────────────┤
│  KPI cards (2-col mobile, 4-col lg)  │
│  TER | AUM | 1Y ret | 3Y ret | 5Y ret│
│  Volatility | Inception date         │
├──────────────────────────────────────┤
│  Price chart                         │
│  [1M]  [6M]  [1Y]  ← range tabs      │
├──────────────────────────────────────┤
│  Top-10 Holdings (table)             │
├──────────────────────────────────────┤
│  Sector weights (bar chart)          │
│  Country weights (bar chart)         │
└──────────────────────────────────────┘
```

### KPI cards

Each card: label (small, muted) + value (large, prominent) + optional unit.
Positive return: green tint; negative return: red tint.

### Price chart (Recharts)

- `LineChart` with a `Tooltip` showing date + price on hover.
- Range tabs: 1M / 6M / 1Y; selected tab underlined, ARIA `aria-selected`.
- Y axis: auto-scaled with padding; X axis: date labels thinned to avoid overlap.
- Accessible: chart region has `role="img"` and `aria-label="Price chart for [TICKER]"`.

### Allocation charts

- Horizontal `BarChart` (easier to read on mobile for many categories).
- Sector and country each in their own card.
- Values shown as percentages; bar width proportional.

### States

| State | UI |
|---|---|
| Valid ticker | Full page |
| Unknown ticker | Styled 404: "ETF not found", TICKER shown, "Back to list" button |

---

## 404 page (`not-found.tsx`)

Minimal: app shell (top bar + banner) + centered card:

```
404 — ETF not found
"TICKER" does not exist in the demo dataset.
[Back to list]
```

No illustration; plain text + a single action button.

---

## Accessibility checklist (required, not optional)

- All images and icons have `alt` text or `aria-label`.
- Table headers have `scope="col"` or `scope="row"`.
- Sort buttons: `aria-sort="ascending"` / `"descending"` / `"none"`.
- Filter controls: each has a visible `<label>` or `aria-label`.
- Focus order follows reading order.
- Color is never the only way information is conveyed (return positive/negative also has a sign).
- WCAG 2.1 AA contrast: normal text ≥ 4.5:1, large text ≥ 3:1.
