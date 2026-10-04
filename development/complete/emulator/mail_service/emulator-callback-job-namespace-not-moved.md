# Emulator callback job moved to infrastructure/queue/ but its namespace and the scheduler's `use` still name application\jobs

| | |
|---|---|
| First found | `development/test/mail_service/module_mail_service.md`, iteration 1 (2026-10-05) |
| Source | test-module (live execution) |
| Rows | STATUS-G-process-success, STATUS-G-process-fail, STATUS-G-process-process-success, STATUS-P-process-success, STATUS-P-process-fail, STATUS-P-process-process-success |
| Location | `emulator/modules/mail_service/infrastructure/queue/InitProcessCallbackJob.php:5` (namespace), `emulator/modules/mail_service/infrastructure/QueueCallbackScheduler.php:8` (`use`) |
| Status | resolved (see Resolution) |

## Problem

After the design-review warning (a `Yii::$container` call in an `application/` class), the job class was moved from
`application/jobs/` to `infrastructure/queue/`, but the namespace line inside the file and the `use` in
`QueueCallbackScheduler` still say `app\modules\mail_service\application\jobs`. `php -l`, the unit suite (31 tests) and
PHPStan did not notice (no test schedules a real job); the live scenario run did:
`Error: Class "app\modules\mail_service\application\jobs\InitProcessCallbackJob" not found` at
`QueueCallbackScheduler.php:22`. Every emulator scenario that schedules a callback (Sending -> ...) is broken, so none of
the six `STATUS-*-process-*` rows could run.

## Fix attempts
None yet (filed by test-module before the fix-code run).

## Resolution

Iteration 1 -> 2 of `development/test/mail_service/module_mail_service.md` (2026-10-05): `InitProcessCallbackJob`'s
namespace changed to `app\modules\mail_service\infrastructure\queue` and the `use` in `QueueCallbackScheduler` updated.
Regression test added: `emulator/tests/Unit/modules/mail_service/infrastructure/QueueCallbackSchedulerTest.php` (the
scheduler pushes an `InitProcessCallbackJob` with a fixed 5 s delay) - the unit suite (32 tests), PHPStan and the
ddd-yii2 greps are green. Confirmed by the live re-run in iteration 2: all six `STATUS-*-process-*` rows pass (real
RabbitMQ 5 s delay, worker, HTTP callback into demo).
