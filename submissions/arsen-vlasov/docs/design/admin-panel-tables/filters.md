# Admin Panel tables: filters

## BaseFiltersComponent

**File:** `page-objects/admin/components/base-filters.component.ts`

### Constructor

```ts
new BaseFiltersComponent(page, container?)
```

`container` is usually the same `.v-card` as the table has.

### Common methods

| Method | Button / block |
|-------|----------------|
| `clickApply()` | «Применить» |
| `clickReset()` | «Сбросить фильтры» / «Очистити фільтри» |
| `clickAddFilters()` | «Добавить фильтры» |
| `shouldSeeFiltersVisible()` | The filter panel + Apply + Reset |

After `clickApply()`, call `table.waitForTableLoad()` in the spec or in the Page.

---

## Page-specific filters

### Customers (`/user-customers`)

**File:** `customers-filters.component.ts`

| Method | DOM (confirmed) |
|-------|---------------------|
| `searchByEmail(email)` | `placeholder="Поиск студента"` |
| `setDateFrom(date)` | `label` «Дата от», `type="date"` |
| `setDateTo(date)` | `label` «Дата до» |
| `shouldSeeSearchValue(email)` | The value of the search input |

### Events (`/events`)

**File:** `events-filters.component.ts`  
**Types:** `utils/constants/admin/events-filters.ts`

```ts
type ActivityStatus = 'cancelled' | 'inProgress' | 'planned' | 'recorded';
type ActivityType = 'mentorWebinar' | 'groupCall' | ...;
```

Methods: `searchByActivityName`, `searchByStudentEmail`, `selectActivityStatus`, `selectActivityType`, `setDateFrom/To`, `selectMentor`, `selectCourse`.

> The Events selectors have a **TODO** mark. Clarify them against the real DOM. Also clarify the labels in `ACTIVITY_*_LABELS`.

---
