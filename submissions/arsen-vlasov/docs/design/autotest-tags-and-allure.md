# Autotest tags and Allure labels (PRJ-6449)

Two layers, each with its own job:

| Layer | Why | Where you set it |
|---|---|---|
| Playwright tags | a run filter (`--grep`) | `test.describe(..., { tag: [...] })` |
| Allure `feature` | navigation in the report | the `labelSuite()` helper |

All values come **only** from `utils/constants/autotest-labels.ts`. The `as const` types
do not let you write an arbitrary string: the error appears in `tsc`, not in review.

## How to run by tag

```bash
npx playwright test --grep @pro-trading
npx playwright test --grep "@demo|@certificates"     # несколько тегов
npx playwright test --grep-invert @stripe            # всё, кроме Stripe
```

Ready-made scripts:

```bash
npm run test:tag -- @tariffs         # любой тег
npm run test:pro-trading
npm run test:courses
```

To see what goes into a run without running it:

```bash
npx playwright test --grep @tariffs --list
```

### Jenkins (optional)

The full regression in Jenkins still uses `regression`. A selective run by
**file name** uses the `custom` mode (as in the [Jenkins doc](https://jira.example.com/wiki/spaces/Acme/pages/611581953/Jenkins+Pipeline+GTE)).

A run **by Playwright tag** (`--grep @pro-trading` and similar) is possible if the job
has a parameter for grep (or if the pipeline command forwards `--grep`). For now, the job
UI explicitly describes only `custom` by spec file names. For a tag filter,
use the local npm scripts above, or agree on a `GREP` parameter (or an equivalent) with DevOps.

## Taxonomy

Four axes. The product and `domain` are mandatory. The other axes depend on the meaning of the test.

| Axis | Values |
|---|---|
| product | `@lms` `@admin-panel` `@api` |
| domain | `@pro-trading` `@courses` `@shop` `@profile` `@mini-courses` `@mini-products` `@students` `@auth` |
| capability | `@payments` `@agreement` `@demo` `@subscription-status` `@cashback` `@merchants` `@tariffs` `@telegram` `@homework` `@certificates` `@questionnaire` `@feedback` `@knowledge-base` `@activity-calendar` `@trader-journal` `@stream-records` `@mentors` `@registration` `@recommendations` `@upgrade` `@course-access` `@product-display` |
| integration | `@stripe` `@yookassa` `@olypay` `@zoho` |

### Rules to keep in mind

**A tag must not repeat the path.** If a test is in `subscriptions-and-payments/`,
the tag `@subscriptions-and-payments` adds nothing: the folder already says it.
That is why this tag does not exist. The pro-trading tests have the domain `@pro-trading`,
and `@payments` expresses the payments.

**Two domains only for a truly cross-domain test.** `profile-pro-status`
carries both `@profile` and `@pro-trading`. It is about the PRO badge on the profile page.
We want to catch it both in a profile run and before a Pro Trading release.
This is not the same as a tag copied from the folder.

**`integration.X` — when the merchant is the subject of the test.** Either the test varies
the merchant to check the behavior that depends on it, or the test makes a real payment with it
(`STRIPE_TEST_CARD`). A merchant used only as a fixture to create a
subscription gets no tag. Otherwise `@stripe` lands on everything and stops
selecting anything.

**`feature` mirrors `domain`.** The `AUTOTEST_ALLURE.feature` values match
the domain axis one to one. We do not put the product in `feature`. `LMS` or `API` as a
feature is too broad for navigation. The `@lms` / `@api` tags exist for that.

## How to tag a new spec

```ts
import { labelSuite } from '@/utils/helpers/label-suite';
import { AUTOTEST_ALLURE, AUTOTEST_PLAYWRIGHT_TAGS } from '@/utils/constants/autotest-labels';

test.beforeEach(async () => {
  await labelSuite({ feature: AUTOTEST_ALLURE.feature.proTrading });
});

test.describe('Раздел Pro Trading: Telegram-блок', {
  tag: [
    AUTOTEST_PLAYWRIGHT_TAGS.lms,
    AUTOTEST_PLAYWRIGHT_TAGS.domain.proTrading,
    AUTOTEST_PLAYWRIGHT_TAGS.capability.payments,
    AUTOTEST_PLAYWRIGHT_TAGS.capability.telegram,
  ],
}, () => {
  // ...
});
```

Put the tag on `describe`. In files without `describe`, put it on each `test(...)`.

## Why there is no separate dictionary of Allure tags

`allure-playwright` itself turns each Playwright tag into an Allure tag. It removes
the leading `@`. We checked this with an isolated run: `tag: ['@payments']` gives
the label `tag = "payments"` in `allure-results`, without the helper.

So a manual `allure.tags('Payments')` would create a **second** label for the same
concept. The report would show both `payments` and `Payments`. A filter by one label would not find
the tests with the other label. `labelSuite()` sets only `feature`, because you cannot
derive it from the tags.

We import `allure` from `allure-js-commons`. The export with the same name from
`allure-playwright` has the `@deprecated` mark.

## Coverage

85 of 85 specs have a Playwright tag and an Allure `feature`. The dictionary has no
unused values.
