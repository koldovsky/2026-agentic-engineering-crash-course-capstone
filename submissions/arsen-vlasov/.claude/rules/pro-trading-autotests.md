---
description: Pro Trading — how to write regression autotests (specs, POM, subscriptions, tariffs)
globs: tests/specs/regression/lms/subscriptions-and-payments/**,page-objects/lms/subscriptions-and-payments/**,utils/constants/pro-trading/**,tests/specs/**/helpers/pro-trading*.ts,core/api/lms/lms-pro-trading-api.ts
alwaysApply: false
paths:
  - "tests/specs/regression/lms/subscriptions-and-payments/**"
  - "page-objects/lms/subscriptions-and-payments/**"
  - "utils/constants/pro-trading/**"
  - "tests/specs/**/helpers/pro-trading*.ts"
  - "core/api/lms/lms-pro-trading-api.ts"
---

# Pro Trading: autotests

Reference specs. Read them before you start a new test case:

| Test case | File | Focus |
|----|------|--------|
| PRJ-TC-213 | `pro-trading-new-user-page.spec.ts` | New user, Advanced only, layout and viewports |
| PRJ-TC-216 | `pro-trading-demo-banner-1-euro.spec.ts` | €1 demo banner, subscriptions via API, Stripe flow |
| PRJ-TC-217 | `pro-trading-advanced-tariffs-block.spec.ts` | Advanced-only tariffs block, backend prices |

Related rules: `playwright-specs-no-expect.md`, `test-user-lifecycle.md`, `pro-trading-subscriptions-api.md`, `page-objects-conventions.md`.

## 1. Spec skeleton

```ts
import { coursesTest as test } from '@/tests/specs/regression/lms/courses-test';
import { linkTestCase } from '@/utils/helpers/allure-helper';
import { labelSuite } from '@/utils/helpers/label-suite';
import { TestUserRegistry } from '@/utils/helpers/test-user-registry';
import { AUTOTEST_ALLURE, AUTOTEST_PLAYWRIGHT_TAGS } from '@/utils/constants/autotest-labels';

const testUserRegistry = new TestUserRegistry();

test.describe(`Раздел Pro Trading: <short feature name>`, {
  tag: [
    AUTOTEST_PLAYWRIGHT_TAGS.lms,
    AUTOTEST_PLAYWRIGHT_TAGS.domain.proTrading,
    AUTOTEST_PLAYWRIGHT_TAGS.capability.payments,
    // plus capability/integration where it fits (demo, agreement, stripe…)
  ],
}, () => {
  test.afterEach(async ({ adminApi, courseSetupHelper }) => {
    await testUserRegistry.cleanup({ adminApi, courseSetupHelper });
  });

  test.beforeEach(async () => {
    await labelSuite({ feature: AUTOTEST_ALLURE.feature.proTrading });
  });

  test(`1. <step from the test case>`, async ({ adminApi, lmsLoginPage, lmsHomePage, proTradingPage }) => {
    await linkTestCase(217); // a number, not the string PRJ-TC-*
    // precondition → test.step → should* from the POM
  });
});
```

Tags and Allure labels come from the dictionary only (`autotest-tags-and-allure.md`).

- **One test case step = one `test()`**. Put the step number in the title: `` `1. ...` ``, `` `2. ...` ``.
- Name the file after the feature, **never** after the TC ID (`test-naming-no-tc-ids.md`).
- Folder: `tests/specs/regression/lms/subscriptions-and-payments/`.
- Fixture: `coursesTest` → `proTradingPage`, `adminProTradingApi`, `createLmsContext`, `createMonolitLmsContext`.
- Specs contain **no** `expect`. Use only `should*` and `click*` (see `playwright-specs-no-expect.md`).

## 2. User personas (preconditions)

| Persona | How to get one | Typical checks |
|---------|--------------|-------------------|
| **Advanced only** (no courses, no Pro) | `testUserRegistry.createStudent(adminApi)` | `shouldSeeTariffsBlockWithAdvancedPackageOnly()`, demo banner |
| **Student with a course or seminar, no Pro** | `createStudent` + `testUserRegistry.grantCourseAccess(courseSetupHelper, { email, accessId })` | Students + Advanced, comparison table, trial banner (PRJ-TC-218) |
| **Active subscription** | `ProTradingSubscriptionsHelper.grantSubscription(...)` | Banner hidden, tariffs visible, buttons enabled |
| **Expired subscription** | `grantSubscription` → `expireSubscriptionForUser` | Tariffs look the same as for a user with no subscription |
| **Blocked** | `blockProTradingAccessForUser` | `shouldSeeBlockedUserMessage()`, `shouldNotSeeTariffsBlock()` |

Do **not** buy a subscription through the UI unless the test case is about payment. Use the admin API (`pro-trading-subscriptions-api.md`).

Plan and merchant values come from `utils/constants/pro-trading/pro-trading-subscriptions.ts` (`PRO_TRADING_PLAN_SLUGS`, `PRO_TRADING_MERCHANT_SLUGS`).

## 3. Navigation and login

```ts
await lmsLoginPage.authenticate(testUser);
await lmsHomePage.shouldSeePage();
await lmsHomePage.getProTradingChannels.clickCloseButtonIfVisible(); // if it popped up
await lmsHomePage.shouldSeeProTradingTab();
await lmsHomePage.selectProTradingTab();
await proTradingPage.shouldSeePage();
```

- Direct URL: `proTradingPage.open()` + `shouldHaveProTradingUrl()`.
- For a blocked user, do **not** call `shouldSeePage()`, because it expects the promo and tariffs. Call `shouldSeeBlockedUserMessage()`.

Extract a repeated flow into a local function in the spec (`loginAndOpenProTrading`, `prepareAdvancedTariffsBlock`). Do not copy the flow into every test.

## 4. POM and components

| Layer | Path |
|------|------|
| Page | `page-objects/lms/subscriptions-and-payments/pro-trading-page.ts` |
| Payment modals | `components/pro-trading-demo-payment-modal-form.ts`, `...-confirmation-...`, `...-payment-success-...` |
| Telegram channels | `components/pro-trading-channels-modal-form.ts` (via `lmsHomePage.getProTradingChannels`) |

**UI constants** are in `utils/constants/pro-trading/pro-trading-page-content.ts` (texts, periods, badges, `PRO_TRADING_BLOCK_TEST_IDS`).

**Locators**: use `data-test-id` with `getByTestId`. Blocks: `pro-trading-preview`, `pro-trading-feedback`, `pro-trading-price-selector`, `main-demo-banner`. Find tariff cards through `main-banner-action-button-pro-advanced-{slug}`, not through `pro-trading-price-selector-20`. The `pro-trading-price-selector-20` elements have discount badges.

Write each new assertion as a **`should*` method in the POM**. Never write it inline in the spec. Move a large block (over roughly 15 lines) into its own component. Do not make `pro-trading-page.ts` too large (`page-object-size.md`).

## 5. Tariffs and backend

- Compare UI against the API: `LmsProTradingApiClient` + `createMonolitLmsContext` → `GET /api/v2/pro-trading/packages`.
- Parse the expectations: `ProTradingTariffsHelper.getAdvancedTariffExpectations(packages)`.
- Check the UI: `proTradingPage.shouldSeeTariffPricesMatchingBackend({ expectedTariffs })`.

Clicking «Подписаться» opens the «Выберете способ оплаты» modal with a `Банковской картой N €` button:

```ts
await proTradingPage.clickTariffSubscribeButton(period);
await proTradingPage.shouldSeeTariffSubscribePaymentFlowStarted();
await proTradingPage.closeTariffPaymentMethodModal();
```

Run the full Stripe flow only when the test case is explicitly about payment (pattern: PRJ-TC-216, step 8).

## 6. Patterns from existing specs

**Parametrising a step** (subscription state, package):

```ts
const cases = [{ testTitle: 'без підписки', setup: async () => undefined }, ...] as const;
for (const caseData of cases) {
  test(`2. ... ${caseData.testTitle}`, async ({ ... }) => { ... });
}
```

**One long smoke test** (PRJ-TC-213): a single `test()` with several `test.step` calls. Use it only for an overview test case. For step-by-step regression, give each step its own `test()`.

**Composite "matches the design" checks**: `shouldSeeAdvancedTariffsBlockMatchingDesign()` / `shouldSeePageLayoutMatchingDesign()`. Reuse these methods in the final steps. Do not repeat ten `should*` calls in the spec.

## 7. Helpers next to the specs

| File | Purpose |
|------|------------|
| `helpers/pro-trading-subscriptions-helper.ts` | grant / expire / block |
| `helpers/pro-trading-tariffs-helper.ts` | price expectations from the packages API |

Do not put subscription domain logic in the spec or in the POM.

## 8. Checklist before a PR

- [ ] `linkTestCase(N)` in every `test()`
- [ ] Playwright `tag` plus `labelSuite({ feature: AUTOTEST_ALLURE.feature.proTrading })`
- [ ] `test.afterEach` with `testUserRegistry.cleanup`
- [ ] Strings, plan slugs and timeouts come from constants or `DateHelper`
- [ ] No `waitForTimeout` in the POM
- [ ] New texts added to `pro-trading-page-content.ts`
- [ ] Run on stage: `ENV=stage npx playwright test tests/specs/regression/lms/subscriptions-and-payments/<file>.spec.ts`
- [ ] Or by tag: `npm run test:pro-trading` / `npm run test:tag -- @payments`
