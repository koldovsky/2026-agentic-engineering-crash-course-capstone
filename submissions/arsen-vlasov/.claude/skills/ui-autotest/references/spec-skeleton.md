# ui-autotest: spec file skeleton

Part of the `ui-autotest` skill. Read it when [SKILL.md](../SKILL.md) points here.

## 10. Spec file skeleton

**Style B (course, fixture):**

```ts
import { coursesTest } from '@/tests/specs/regression/lms/courses-signup-admin-panel';
import { linkTestCase } from '@/utils/helpers/allure-helper';
import { labelSuite } from '@/utils/helpers/label-suite';
import { AUTOTEST_ALLURE, AUTOTEST_PLAYWRIGHT_TAGS } from '@/utils/constants/autotest-labels';

const test = coursesTest.extend({ courseConfig: { /* ... */ } });

test('Scenario description', {
  tag: [
    AUTOTEST_PLAYWRIGHT_TAGS.lms,
    AUTOTEST_PLAYWRIGHT_TAGS.domain.courses,
    // capability / integration where it fits
  ],
}, async ({ lmsHomePage }) => {
  await linkTestCase(72);
  await labelSuite({ feature: AUTOTEST_ALLURE.feature.courses });
  await test.step('2. ...', async () => { /* should* / click* */ });
});
```

**Style A (different personas):**

```ts
import { coursesTest as test } from '@/tests/specs/regression/lms/courses-test';
import { linkTestCase } from '@/utils/helpers/allure-helper';
import { labelSuite } from '@/utils/helpers/label-suite';
import { TestUserRegistry } from '@/utils/helpers/test-user-registry';
import { AUTOTEST_ALLURE, AUTOTEST_PLAYWRIGHT_TAGS } from '@/utils/constants/autotest-labels';

const testUserRegistry = new TestUserRegistry();

test.describe('Section: feature', {
  tag: [
    AUTOTEST_PLAYWRIGHT_TAGS.lms,
    AUTOTEST_PLAYWRIGHT_TAGS.domain.proTrading,
    AUTOTEST_PLAYWRIGHT_TAGS.capability.payments,
  ],
}, () => {
  test.afterEach(async ({ adminApi, courseSetupHelper }) => {
    await testUserRegistry.cleanup({ adminApi, courseSetupHelper });
  });

  test.beforeEach(async () => {
    await labelSuite({ feature: AUTOTEST_ALLURE.feature.proTrading });
  });

  test('1. ...', async ({ adminApi, courseSetupHelper, lmsLoginPage, lmsHomePage }) => {
    await linkTestCase(0);
    await test.step('Precondition: ...', async () => {
      const testUser = await testUserRegistry.createStudent(adminApi);
      // grantCourseAccess, login through a helper...
    });
    await test.step('1. ...', async () => { /* should* */ });
  });
});
```

Name the file after the feature, with no TC ID (`test-naming-no-tc-ids.md`).
