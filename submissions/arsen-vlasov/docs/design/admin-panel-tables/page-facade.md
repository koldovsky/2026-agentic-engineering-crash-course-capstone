# Admin Panel tables: the Page Object as a facade, and a scenario example

## Page Object — the facade (CustomersPage)

**File:** `page-objects/admin/customers/customers-page.ts`

```ts
export class CustomersPage extends AdminBasePage {
  readonly table: BaseTableComponent;
  readonly filters: CustomersFiltersComponent;

  constructor(page: Page) {
    super(page);
    const pageCard = page.locator('.v-card').filter({ has: page.locator('.v-data-table') }).first();
    this.table = new BaseTableComponent(page, pageCard.locator('.v-data-table'));
    this.filters = new CustomersFiltersComponent(page, pageCard);
  }
}
```

### Page-specific parts (they stay on the Page)

- `shouldSeePage()` — the heading «Пользователи», Export, «Добавить пользователя», filters, table, pagination
- `clickAddCustomer()`
- `openCustomerByEmail(email)` — a click on the email in the row + the URL `/user-customers/`

### Deprecated facades (for the migration of specs)

These methods delegate to the components. Each one has the `@deprecated` mark:

- `fillStudentSearchFilterInput` → `filters.searchByEmail`
- `clickApplyFilterButton` → `filters.clickApply`
- `shouldSeeOnleOneStudentInTable` → `table.shouldSeeRowsCount(1)` + `getRowByText`
- `clickStudentEmailInTable` → `openCustomerByEmail`

---

## A scenario example in a spec (PRJ-TC-193)

```ts
import { baseAdminPanelTest as test } from '@/tests/specs/regression/admin-panel/base-admin-panel';
import { AdminSidebarTab } from '@/utils/constants/admin/admin-sidebar-navigation';

test('Отображение карточки пользователя', async ({
  adminLoginPage,
  adminHomePage,
  customersPage,
  editCustomerPage,
  adminUser,
}) => {
  await adminLoginPage.open();
  await adminLoginPage.login(adminUser.email, adminUser.password);
  await adminHomePage.shouldSeePage();

  await adminHomePage.sidebar.selectSidebarTab(AdminSidebarTab.ACCOUNTS.CUSTOMERS);
  await customersPage.shouldSeePage();

  await customersPage.filters.searchByEmail(student.email);
  await customersPage.filters.clickApply();
  await customersPage.table.waitForTableLoad();
  await customersPage.table.shouldSeeRowsCount(1);

  await customersPage.openCustomerByEmail(student.email);
  await editCustomerPage.shouldSeePage();
});
```

`AdminSidebarComponent` (`page-objects/admin/components/admin-sidebar.component.ts`) does the sidebar navigation.

---
