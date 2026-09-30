---
description: Activity Calendar test conventions (preconditions, cleanup, modal)
globs: tests/**/*activity-calendar*.ts,tests/**/*stream-records*.ts,tests/specs/**/calendar*.spec.ts
alwaysApply: false
paths:
  - "tests/**/*activity-calendar*.ts"
  - "tests/**/*stream-records*.ts"
  - "tests/specs/**/calendar*.spec.ts"
---

# Activity Calendar conventions

Goal: a reader understands calendar specs and related scenarios correctly on the first read. The specs contain no duplication. They leave no unwanted data in the LMS.

## 1. Preconditions through a helper

- To create an activity, use `createCalendarActivity` from `tests/helpers/activity-calendar-helper.ts`.
- To cancel activities, use `cancelActivities({ createAdminContext, activityIds })`.

## 2. Mandatory cleanup (afterEach)

A spec that creates activities through the API **must** cancel them in `test.afterEach`. Reference implementation: `upcoming-activities-on-lms-home.spec.ts`.

```ts
const createdActivityIds: string[] = [];

test.afterEach(async ({ createAdminContext }) => {
  if (createdActivityIds.length === 0) return;
  await cancelActivities({ createAdminContext, activityIds: [...createdActivityIds] });
  createdActivityIds.length = 0;
});

test('...', async ({ ... }) => {
  const created = await createCalendarActivity({ ... });
  createdActivityIds.push(created.id);
});
```

This rule also applies to `stream-records-tab-visible.spec.ts` and to activities that expire.

## 3. Colours only when the test case asks

- Do not call `shouldSeeActivityWithColor` unless the test case requires colour mapping.

## 4. Test steps

- A `test.step` states **what the step checks**. It does not contain implementation details.
- The order of the steps matches the order of the acceptance criteria.

## 5. Modal window

- In `ActivityEventDialogModalForm`, include only the fields that the test actually fills.

## 6. Links and the "Go to" button

- The "Go to" button depends on whether `conferenceUrl` / `recordUrl` is present.
- Do not rely on the UI behaviour of external domains in headless mode.

## 7. No magic numbers

- Put minute offsets and timeouts into constants at the top of the file or into the helper.

## 8. Upcoming activities on the LMS home page

- Check the activities block through `HomePage` (facade → `UpcomingActivitiesComponent`).
