# CB-service_1-01/CB-service_2-01 (valid callback against an existing process) not yet executed

| | |
|---|---|
| First found | `development/test/test/module_test.md`, iteration 1 (2026-10-01) |
| Source | test-module (live execution) |
| Rows | CB-service_1-01, CB-service_2-01 |
| Status | open - not a defect, a dedicated live run was not yet done this process |

## Problem

A valid callback (`Complete`/`Fail`/`Processing`) against an existing `process` record, verifying the record is
updated with `200`, has not been isolated as its own executed row. This process's §4 loop confirmed the
`process`→`success` transition indirectly (`STATUS-service_1-process-success`, via the direct `InitProcessUseCase`
invocation used for that scenario), but never drove a callback independently of that specific flow - e.g. a
`Complete` callback sent straight after a fresh init without waiting on the real RabbitMQ delay, or a `Fail`
callback.

Unlike the `FINAL-*`/`ERRCODE-*`/`STATUS-service_1-process-fail` rows in the same report, this is **not** blocked on
an open design decision - the shared `BaseController::actionCallback()` path and `V1Controller::getCallbackStatus()`
are both already exercised indirectly and callable directly with a crafted request body; it just needs a dedicated
test run (a `TestModuleCest` case or a direct `curl` against a process already in `status: process`).

## Attempts

Iteration 1: `fix-code` correctly left it unchecked rather than inventing a result - filed here instead.

## Resolution

Iteration 2 (2026-10-01), `development/test/test/module_test.md`: seeded a `process`-status record directly in the
database for each method (`external_id=cb-ext-s1`/`cb-ext-s2`, no emulator interaction needed - the callback
endpoint doesn't care how the record reached `process`), then posted a real callback body to
`POST /test/v1/callback`:
- `service_1`: `{"id":"cb-ext-s1","status":"Complete",...}` → `200`; record confirmed `status=success`.
- `service_2`: `{"id":"cb-ext-s2","status":"Fail",...}` → `200`; record confirmed `status=fail`.

Both rows (`CB-service_1-01`, `CB-service_2-01`) now `[x]` in `development/test/test/module_test.md`. Test rows removed
from the database after verification.
