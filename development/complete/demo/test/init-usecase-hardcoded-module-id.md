# InitUseCase hardcoded the module id instead of being given it

| | |
|---|---|
| First found | `development/analize_1790873891_1790873891.md`, iteration 1 (2026-10-01) |
| Source | design-review |
| Severity | error |
| Location | `demo/modules/test/application/InitUseCase.php:47` |
| Rule | E (AGENTS.md rule 6) / D-DIP |

## Problem

`InitUseCase::handle()` did `$serviceName = new ServiceName('test')` - hardcoded the module id instead of being given
it. AGENTS.md rule 6: "Do not assume a fixed module ID ... use `Module::getInstance()` ... so the host can override
components." `V1Controller`/`BaseController` already resolved the service name from `$this->module->id` (via
`BaseController::serviceName()`) but never passed it down; `InitUseCase` independently re-derived (and hardcoded) it.

## Resolution

Fixed in iteration 1 of the same process, confirmed by an independent re-check (fresh subagent, iteration 2):
`InitUseCase::handle()` now takes a `ServiceName $serviceName` parameter instead of constructing one itself.
`V1Controller::doProcess()` builds it from `$this->module->id` and passes it in. Updated `InitUseCaseTest`'s 6 call
sites to pass the new parameter. Verified live (`POST /test/v1/init` → `200 success`) and by the new functional test
added for a separate problem in the same process (`demo-missing-functional-tests.md`).

No backlog entry - fixed within its first process.
