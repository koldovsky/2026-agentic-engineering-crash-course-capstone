---
description: Admin Panel tables and filters POM (BaseTable, BaseFilters, page facade)
globs: page-objects/admin/**/*.ts,fixtures/pages/regression-admin-panel.fixture.ts,tests/specs/regression/admin-panel/**/*.ts,utils/constants/admin/**/*.ts
alwaysApply: false
paths:
  - "page-objects/admin/**/*.ts"
  - "fixtures/pages/regression-admin-panel.fixture.ts"
  - "tests/specs/regression/admin-panel/**/*.ts"
  - "utils/constants/admin/**/*.ts"
---

# Admin Panel: tables and filters

Full description: `docs/design/admin-panel-tables/index.md`

## When this applies

This rule applies to every Admin Panel page that uses a `v-data-table` with a filter block above it. Examples: «Пользователи», «Активности» and other pages of this type.

## Architecture (mandatory)

```
<Domain>Page extends AdminBasePage
  readonly table: BaseTableComponent      // composition
  readonly filters: <Domain>FiltersComponent extends BaseFiltersComponent
```

- The page **does not inherit** from table or filters.
- Shared scope: the `.v-card` that contains `.v-data-table`. Pass this scope to the `BaseTableComponent` and `BaseFiltersComponent` constructors.
- Put table locators only in `BaseTableComponent`. Put filter locators only in `*FiltersComponent`.

## BaseTableComponent

Path: `page-objects/admin/components/table/base-table.component.ts`

After you filter or paginate, call `await table.waitForTableLoad()`.

Specs usually make these calls **through the page**:

```ts
await customersPage.table.shouldSeeRowsCount(1);
await customersPage.table.shouldSeeAtLeastOneRow();
await customersPage.filters.clickApply();
```

Do not duplicate `shouldSeeRowsCount` on the page unless there is a domain wrapper for it (for example `shouldSeeOnlyCustomer(email)`).

## BaseFiltersComponent

Path: `page-objects/admin/components/table/base-filters.component.ts`

- `clickApply()`, `clickReset()`, `shouldSeeFiltersVisible()`
- Put page-specific behaviour into `customers-filters.component.ts`, `events-filters.component.ts`.

## Customers (DOM verified)

- Search: `placeholder="Поиск студента"`
- Dates: labels «Дата от» / «Дата до», `type="date"`
- Table: `.v-data-table.base-data-table`, rows `tr.v-data-table__tr`
- Pagination: `Показано: N`, prev/next chevrons

## Events

Types: `ActivityStatus`, `ActivityType` from `utils/types/api/admin/activities.ts`. Never use a bare `string`.

Events selectors keep a TODO until you verify them against `/events`.

## Specs

- Do not use `expect` in `.spec.ts`. Use only `should*` and `click*` on the POM and its components.
- To open the customers table, call `adminHomePage.sidebar.selectSidebarTab(AdminSidebarTab.ACCOUNTS.CUSTOMERS)`.
- When the table itself is not under test, open a known student card by URL. Use `openStudentCardByEmail` or `openStudentCardById` in `tests/specs/regression/admin-panel/students/helpers/open-student-card.ts`. Do not search the users list first.
- When the scenario uses the table, prefer the newer API:

```ts
await customersPage.filters.searchByEmail(email);
await customersPage.filters.clickApply();
await customersPage.table.waitForTableLoad();
await customersPage.openCustomerByEmail(email);
```

The legacy methods on `CustomersPage` (`fillStudentSearchFilterInput`, …) exist only for backwards compatibility. Do not add new legacy methods.

## New page — checklist

1. Create `admin/<domain>/<domain>-filters.component.ts` that extends `BaseFiltersComponent`.
2. Create `admin/<domain>/<domain>-page.ts`. Its constructor builds `table` and `filters`.
3. Add enums and labels to `utils/constants/admin/` where necessary.
4. Add a fixture to `regression-admin-panel.fixture.ts`.
5. Add a TODO in the code for each selector that you did not verify against stage.

## Forbidden

- `expect(...)` in admin-panel specs (see `playwright-specs-no-expect.md`)
- `waitForTimeout` / `this.wait()` in components
- Copying pagination or checkbox locators into every page instead of using `BaseTableComponent`
- Inheriting a page from `BaseTableComponent`

## AdminBasePage

`page-objects/admin/admin-base-page.ts` has `sidebar: AdminSidebarComponent`. It uses composition, the same approach as the LMS.
