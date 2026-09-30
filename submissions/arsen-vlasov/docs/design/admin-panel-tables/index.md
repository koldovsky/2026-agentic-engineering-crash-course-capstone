# Admin Panel: tables and filters architecture

This document describes in detail the reusable POM mechanism for Admin Panel pages with `v-data-table` (Vuetify).

The related Cursor rule: `.cursor/rules/admin-panel-tables.mdc`

---

## Why a separate architecture

Most Admin Panel pages repeat the same UI frame:

| Block | What it does |
|------|------------|
| **Filters** | Inputs, selects, dates + the buttons «Применить», «Сбросить», «Добавить фильтры» |
| **Table** | Headers, rows, checkboxes, loader |
| **Pagination** | Back/forward, «Показать N записей», «Показано: X» |

The column content and the set of filters are **unique** for each page. The common shell is **the same**.

The goal: do not copy the pagination and checkbox locators into each Page Object. Move them into components, and keep only the page-specific parts on the page.

---

## Design principles

### 1. Composition on the Page, inheritance only for filters

```
Page (фасад)
├── table: BaseTableComponent          ← композиция (HAS-A)
└── filters: CustomersFiltersComponent ← наследование от BaseFiltersComponent (IS-A)
```

- **The Page does not inherit** `BaseTableComponent` / `BaseFiltersComponent`.
- **The Page holds** them as `readonly` fields. It creates them in the `constructor`.
- **The page filters** inherit `BaseFiltersComponent` and add fields/methods (`searchByEmail`, `selectMentor`).

### 2. Separation of responsibilities

| Class | Knows about | Does not know about |
|-------|-----------|--------------|
| `BaseTableComponent` | tbody, checkboxes, pagination, loader | Specific filters, the page heading |
| `BaseFiltersComponent` | Apply / Reset / Add filters | Table rows |
| `CustomersPage` | Export, «Добавить пользователя», opening the card | Details of the Events selects (they are in `EventsFiltersComponent`) |

### 3. Locators only inside their own class

Do not expose `table.bodyRows` to specs. A spec calls:

```ts
await customersPage.table.shouldSeeRowsCount(1);
await customersPage.filters.searchByEmail(email);
```

### 4. Specs without `expect`

All checks use the `should*` methods of components and pages (`playwright-specs-no-expect.mdc`).

Inside components, use `utils/assertions/ui-assertions.ts` (`expectVisible`, `expectCount`, `expectHidden`, …).

### 5. `@step` on all public methods

Step names in Allure: `BaseTableComponent.waitForTableLoad`, `CustomersFiltersComponent.searchByEmail`.

### 6. Scoped root (the page card)

On `/user-customers`, the filters and the table are in **one** `.v-card`:

```html
<div class="v-card">
  <div class="v-card-text">…фильтры…</div>
  <div class="v-data-table base-data-table">…</div>
</div>
```

In the Page constructor:

```ts
this.pageCard = page.locator('.v-card').filter({ has: page.locator('.v-data-table') }).first();
this.table = new BaseTableComponent(page, this.pageCard.locator('.v-data-table'));
this.filters = new CustomersFiltersComponent(page, this.pageCard);
```

This way, the filters do not overlap with the tables on other tabs.

---

## Related project rules

- `project-base.mdc` — general principles
- `page-objects-conventions.mdc` — POM, facade, `@step`
- `page-object-size.mdc` — the ~300-line limit, move parts into components
- `playwright-specs-no-expect.mdc` — no expect in specs
- `no-hardcoded-waits.mdc` — no `waitForTimeout`, use `waitForTableLoad`
- `admin-panel-tables.mdc` — the short rule for Cursor (this document is the full version)

## Parts

| File | Content |
|---|---|
| [structure-and-fixture.md](structure-and-fixture.md) | folder layout, fixture |
| [base-table.md](base-table.md) | `BaseTableComponent` |
| [filters.md](filters.md) | `BaseFiltersComponent`, page filters |
| [page-facade.md](page-facade.md) | the page as a facade, a spec example |
| [adding-a-page.md](adding-a-page.md) | checklist and template for a new page, open TODOs |
