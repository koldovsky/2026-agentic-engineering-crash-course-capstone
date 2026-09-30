# Live run — 2026-09-29

First run of `node scripts/ci/jenkins-report.mjs <job> last` against the real jobs, after the
switch to the Allure data source. Domains, e-mail addresses and IDs replaced; nothing else changed.

Before the switch, the same three builds printed `VERDICT: NOT-EARNED — no test report` (JUnit 404).

## stage-api-tests

```
jenkins-verify · stage-api-tests #117 · SUCCESS
https://jenkins.<company>/job/stage-api-tests/117/
executed 22 · passed 22 · failed 0 · skipped 0
VERDICT: PASS — all executed tests passed
```

## lms-stage-regression-tests

```
jenkins-verify · lms-stage-regression-tests #415 · FAILURE
https://jenkins.<company>/job/lms-stage-regression-tests/415/
executed 392 · passed 387 · failed 5 · skipped 3
VERDICT: FAIL — 5 new failures

new (5):
  - regression/lms/auth/lms-register.spec.ts › Welcome-лист після реєстрації приходить у Mailpit
    Error: Welcome email not received in Mailpit within 90s for <test e-mail> with subject including "Доступ к приобретённой программе открыт - <product>.". Messages to recipient: 0. LMS registration may have succeeded but email was not sent or not routed to Mailpit.
  - regression/lms/courses/investment-and-capital/block-availability.spec.ts › 16. Відсутність сертифіката
    Error: API Endpoint: POST /api/v2/test/course-progresses/mark-completed
  - regression/lms/courses/trading-basics/recommendations-access.spec.ts › Сценарій рекомендацій: VIP + таймаут фінального тесту
    Error: Recommendation page is not visible at https://stage.<company>/course/<id> Expected heading "Поздравляем!" after final test completion or access timeout scenario.
  - regression/lms/courses/trading-basics/recommendations-access.spec.ts › Сценарій рекомендацій: Extended + таймаут фінального тесту
    Error: Recommendation page is not visible at https://stage.<company>/course/<id> Expected heading "Поздравляем!" after final test completion or access timeout scenario.
  - regression/lms/courses/trading-basics/v2-card-visibility.spec.ts › Відображення карточки курсу "Трейдинг основи 2.0" - рівень Extended
    Error: Incorrect general course progress. Expected: 7%. UI sidebar may not reflect lessons already completed via API.
```

## admin-stage-regression-tests

```
jenkins-verify · admin-stage-regression-tests #181 · FAILURE
https://jenkins.<company>/job/admin-stage-regression-tests/181/
executed 62 · passed 60 · failed 2 · skipped 19
VERDICT: FAIL — 2 new failures

new (2):
  - regression/admin-panel/roles/roles-access-section.spec.ts › Список ролей Access Matrix: пошук, створення, редагування і видалення
    Error: Only roles matching "AT-TC-138-<timestamp>"
  - regression/admin-panel/telegram-broadcasts/telegram-broadcasts-list.spec.ts › Раздел, колонки, даты, название и статусы
    Error: MVP created and dispatch dates should match
```
