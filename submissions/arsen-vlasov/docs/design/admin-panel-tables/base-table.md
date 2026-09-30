# Admin Panel tables: BaseTableComponent

## BaseTableComponent

**File:** `page-objects/admin/components/base-table.component.ts`

### Constructor

```ts
new BaseTableComponent(page, root?)
```

- `root` — an optional `.v-data-table` locator (if the page has more than one table).
- Without `root`, the component uses the first `.v-data-table.base-data-table` or `.v-data-table` on the page.

### Waiting for the load — `waitForTableLoad()`

1. Waits until the loaders are hidden:
   - `.v-data-table-progress .v-progress-linear`
   - `.v-card__loader .v-progress-linear--indeterminate` (the card loader)
2. Waits until `tbody` is visible.

Call it after:

- `clickApply`
- a change of the pagination page
- the first opening of the page

### Rows

| Method | Purpose |
|-------|------------|
| `getRowsCount()` | The number of `tbody tr.v-data-table__tr` rows |
| `shouldSeeRowsCount(n)` | Exactly N rows |
| `shouldSeeAtLeastOneRow()` | The table is not empty |
| `shouldSeeEmptyState()` | No rows, or the text «нет данных» / «no data» is present |
| `getRowByText(text)` | The row with the text (email, name) + a visibility check |

### Checkboxes

| Method | Purpose |
|-------|------------|
| `checkAllRows()` | The checkbox in `thead` |
| `checkRowByIndex(index)` | The row checkbox by index (0-based) |
| `shouldSeeRowChecked(index)` | The row is selected |

### Pagination

Selectors from the users page DOM (Vuetify):

- Prev: the button with the `.tabler-chevron-left` icon
- Next: `.tabler-chevron-right`
- Rows per page: the `.v-select` in the footer next to «Показать»
- Text: `Показано: N`

| Method | Purpose |
|-------|------------|
| `shouldSeePagination()` | The footer and the prev/next buttons are visible |
| `goToNextPage()` / `goToPrevPage()` | Click + `waitForTableLoad()` |
| `shouldSeeNextPageDisabled()` / `shouldSeePrevPageDisabled()` | The button is disabled |
| `selectRowsPerPage(10 \| 20 \| 50 \| 100)` | Vuetify select in an overlay |
| `shouldSeePageInfo(shown, total?)` | «Показано: {shown}». `total` is optional (TODO in the UI) |

> The first page and last page buttons stay a TODO until they appear in the UI.

---
