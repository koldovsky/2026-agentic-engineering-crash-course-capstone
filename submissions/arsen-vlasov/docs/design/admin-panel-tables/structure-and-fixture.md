# Admin Panel tables: folder structure and fixture

## Folder structure

```
page-objects/admin/
├── admin-base-page.ts              # sidebar + BasePage
├── components/
│   ├── base-table.component.ts     # общая таблица
│   └── base-filters.component.ts   # общие кнопки фильтров
├── customers/
│   ├── customers-page.ts           # фасад страницы
│   ├── customers-filters.component.ts
│   └── edit-customer-page.ts
└── events/
    ├── events-page.ts
    └── events-filters.component.ts

utils/constants/admin/
└── events-filters.ts               # union-типы и label для Events
```

All Admin Panel POM live in `page-objects/admin/` (pages, table and filter components, the sidebar).

---

## Fixture

`fixtures/pages/regression-admin-panel.fixture.ts`:

- `customersPage: CustomersPage`
- `editCustomerPage: EditCustomerPage`
- if necessary — `eventsPage: EventsPage`

In a test: `async ({ customersPage }) => { ... }`.

---
