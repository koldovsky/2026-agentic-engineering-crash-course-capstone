# Admin Panel tables: a new page with a table, and open TODOs

## How to add a new page with a table

### Checklist

1. **Create the folder** `page-objects/admin/<domain>/`.
2. **`<domain>-filters.component.ts`** — `extends BaseFiltersComponent`, only the unique fields.
3. **`<domain>-page.ts`** — `extends AdminBasePage`. The constructor creates `table` + `filters` with `pageCard`.
4. **Constants** (if the page has enum statuses) — `utils/constants/admin/<domain>-filters.ts`.
5. **Fixture** — add the page to `fixtures/pages/regression-admin-panel.fixture.ts`.
6. **Spec** — only `should*` / `click*` / `open*`, without `expect`.
7. **TODO** in the code, if the selector is not checked on stage.

### Page template

```ts
export class MyPage extends AdminBasePage {
  readonly table: BaseTableComponent;
  readonly filters: MyFiltersComponent;

  constructor(page: Page) {
    super(page);
    const pageCard = page.locator('.v-card').filter({ has: page.locator('.v-data-table') }).first();
    this.table = new BaseTableComponent(page, pageCard.locator('.v-data-table'));
    this.filters = new MyFiltersComponent(page, pageCard);
  }

  @step
  async shouldSeePage(): Promise<void> {
    await this.filters.shouldSeeFiltersVisible();
    await this.table.waitForTableLoad();
    await this.table.shouldSeePagination();
  }
}
```

---

## Open TODOs (selectors / UI)

| Place | What to clarify |
|-------|----------------|
| `base-table.component.ts` | The first/last page buttons |
| `base-table.component.ts` | The total format in `shouldSeePageInfo` |
| `events-page.ts` | The page heading |
| `events-filters.component.ts` | Placeholder/label of all fields and selects |
| `events-filters.ts` | The option texts in the dropdown |
| `edit-customer-page.ts` | The DOM of the user card |

After you clarify a selector on stage, remove the TODO. Record the selector in the method comment.

---
