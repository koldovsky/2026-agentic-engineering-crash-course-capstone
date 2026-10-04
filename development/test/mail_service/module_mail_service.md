# Module `mail_service` — final test spec

| | |
|---|---|
| Module | `mail_service` |
| Base categories | `.claude/skills/test-module/specs/module-test-base.md` |
| Module specs | `development/mail_service/specs/module.service.yaml`, `module.service.md` |
| Built | 2026-10-05 |
| Stack | demo `http://demo.dev`, emulator `http://emulator.dev:81` |
| Iteration | 2 |

Progress: 40 / 54 checked.

Methods `general` (G) and `process` (P) have identical shape and status maps (`Sended→success`, `Sending→process`,
`Fail→fail`, `default_status: fail`); shared-rule rows are written once (`*-shared-*`). Test data (process rows with
request ids `mt-<ts>-*`, the emulator's own records, the temporary RegisterService reversal of INIT-shared-05) is
created and removed by each run; the `STATUS-*-process-*` rows call the emulator's use case directly with an explicit
scenario because the public endpoint has no selector, then everything after that (RabbitMQ 5 s delay, worker, HTTP
callback into demo) is real.

## Init request tests (`INIT-*`)
- [x] INIT-shared-05 unregistered service -> 500, nothing stored
  Observed: reversed the module's RegisterService migration (migrate/down 1), POST init -> 500, 0 process rows stored, migrate/up restored the row (key lengths 32/64). (iteration 2)
- [x] INIT-shared-01 body {} -> 422 errors on requestId/service_method/data
  Observed: POST /mail_service/v1/init {} -> 422. (iteration 2)
- [x] INIT-shared-02 data not an object -> 422
  Observed: POST init with data="not-an-object" -> 422. (iteration 2)
- [x] INIT-shared-03 duplicate requestId -> 422, no second record
  Observed: first init 200, same requestId again 422, 1 process row. (iteration 2)
- [x] INIT-shared-04 wrong verb GET/PUT -> 405
  Observed: GET -> 405, PUT -> 405. (iteration 2)
- [x] INIT-G-user_id general: data.user_id non-integer -> 500/error
  Observed: user_id "abc" -> 500, process record status error. (iteration 2)
- [x] INIT-G-send_to_long general: data.send_to longer than 16 -> 500/error
  Observed: 17-char send_to -> 500, record status error. (iteration 2)
- [x] INIT-G-send_to_missing general: data.send_to missing -> 500/error
  Observed: no send_to -> 500, record status error. (iteration 2)
- [x] INIT-G-test_missing general: data.test missing -> 500/error
  Observed: no test -> 500, record status error. (iteration 2)
- [x] INIT-G-valid general: valid request -> 200, record init then mapped status
  Observed: POST init -> 200 {"requestId":"mt-1791105754-G-ok","status":"success"}; process record status success, external_id set; the emulator's own record for that id exists (1) - the real signed module->emulator call worked. (iteration 2)
- [x] INIT-P-user_id process: data.user_id non-integer -> 500/error
  Observed: user_id "abc" -> 500, process record status error. (iteration 2)
- [x] INIT-P-send_to_long process: data.send_to longer than 16 -> 500/error
  Observed: 17-char send_to -> 500, record status error. (iteration 2)
- [x] INIT-P-send_to_missing process: data.send_to missing -> 500/error
  Observed: no send_to -> 500, record status error. (iteration 2)
- [x] INIT-P-test_missing process: data.test missing -> 500/error
  Observed: no test -> 500, record status error. (iteration 2)
- [x] INIT-P-valid process: valid request -> 200, record init then mapped status
  Observed: POST init -> 200 {"requestId":"mt-1791105754-P-ok","status":"success"}; process record status success, external_id set; the emulator's own record for that id exists (1) - the real signed module->emulator call worked. (iteration 2)

## Callback request tests (`CB-*`)
- [x] CB-shared-01 empty body -> 400
  Observed: POST callback {} -> 400. (iteration 2)
- [x] CB-shared-02 body without id -> 400
  Observed: POST callback without id -> 400. (iteration 2)
- [x] CB-shared-03 unknown process id -> 404, no record changed
  Observed: callback for an unknown id -> 404, number of success records unchanged (3). (iteration 2)
- [x] CB-shared-04 callback before the init response is saved (no record for that external id yet) -> 404
  Observed: callback for an external id that has no record yet -> 404. (iteration 2)
- [x] CB-shared-05 wrong verb -> 405
  Observed: GET /mail_service/v1/callback -> 405. (iteration 2)
- [x] CB-G-valid general: valid callback (Sended) -> 200, record updated
  Observed: record in status process, callback Sended -> 200, record now success. (iteration 2)
- [x] CB-P-valid process: valid callback (Sended) -> 200, record updated
  Observed: record in status process, callback Sended -> 200, record now success. (iteration 2)

## Status-change tests (`STATUS-*`)
- [x] STATUS-G-init-success general: init recorded, then overwritten by the mapped status in the same request
  Observed: the record was stored as init before the module call and read back as success after the 200 response. (iteration 2)
- [x] STATUS-P-init-success process: init recorded, then overwritten by the mapped status in the same request
  Observed: the record was stored as init before the module call and read back as success after the 200 response. (iteration 2)
- [x] STATUS-G-process-success general: init -> remote Sending (process), callback Sended (>=5s later) -> success
  Observed (real emulator use case with scenario sending-then-sended, real RabbitMQ 5 s delay, real HTTP callback into demo): record process right after the init response, success about 7 s later. Init half simulated by direct invocation - no scenario selector exists (open decision). (iteration 2)
- [x] STATUS-G-process-fail general: init -> remote Sending (process), callback Fail -> fail
  Observed (real emulator use case with scenario sending-then-fail, real RabbitMQ 5 s delay, real HTTP callback into demo): record process right after the init response, fail about 7 s later. Init half simulated by direct invocation - no scenario selector exists (open decision). (iteration 2)
- [x] STATUS-G-process-process-success general: init -> remote Sending, callback Sending, callback Sended -> success
  Observed (real emulator use case with scenario sending-sending-sended, real RabbitMQ 5 s delays, real HTTP callbacks into demo): record process right after the init response, still process after the first callback (Sending), success after the second (Sended). Init half simulated by direct invocation - no scenario selector exists (open decision). (iteration 2)
- [x] STATUS-P-process-success process: init -> remote Sending (process), callback Sended (>=5s later) -> success
  Observed (real emulator use case with scenario sending-then-sended, real RabbitMQ 5 s delay, real HTTP callback into demo): record process right after the init response, success about 7 s later. Init half simulated by direct invocation - no scenario selector exists (open decision). (iteration 2)
- [x] STATUS-P-process-fail process: init -> remote Sending (process), callback Fail -> fail
  Observed (real emulator use case with scenario sending-then-fail, real RabbitMQ 5 s delay, real HTTP callback into demo): record process right after the init response, fail about 7 s later. Init half simulated by direct invocation - no scenario selector exists (open decision). (iteration 2)
- [x] STATUS-P-process-process-success process: init -> remote Sending, callback Sending, callback Sended -> success
  Observed (real emulator use case with scenario sending-sending-sended, real RabbitMQ 5 s delays, real HTTP callbacks into demo): record process right after the init response, still process after the first callback (Sending), success after the second (Sended). Init half simulated by direct invocation - no scenario selector exists (open decision). (iteration 2)

## Final-status tests (`FINAL-*`)
- [x] FINAL-G-response-success general: remote answers Sended (no callback) -> API status success, record success, final
  Observed: default emulator scenario answered Sended -> API {"requestId":"mt-1791105754-G-ok","status":"success"}, record status success (same request as INIT-G-valid). (iteration 2)
- [x] FINAL-P-response-success process: remote answers Sended (no callback) -> API status success, record success, final
  Observed: default emulator scenario answered Sended -> API {"requestId":"mt-1791105754-P-ok","status":"success"}, record status success (same request as INIT-P-valid). (iteration 2)
- [ ] FINAL-G-response-process remote answers Sending inline -> API status process, record process
  Blocked: the emulator's live endpoint answers only its default scenario (Sended at once) - there is no scenario-selection mechanism (open decision, CLAUDE.md / module.service.md §10), so the demo's real init cannot be made to receive this answer (iteration 1)
- [ ] FINAL-G-response-fail remote answers Fail inline -> API status fail, record fail
  Blocked: the emulator's live endpoint answers only its default scenario (Sended at once) - there is no scenario-selection mechanism (open decision, CLAUDE.md / module.service.md §10), so the demo's real init cannot be made to receive this answer (iteration 1)
- [ ] FINAL-G-response-default remote answers a status outside the map -> record fail (default_status)
  Blocked: the emulator's live endpoint answers only its default scenario (Sended at once) - there is no scenario-selection mechanism (open decision, CLAUDE.md / module.service.md §10), so the demo's real init cannot be made to receive this answer (the emulator also only emits Sended/Sending/Fail on this path) (iteration 1)
- [ ] FINAL-P-response-process remote answers Sending inline -> API status process, record process
  Blocked: the emulator's live endpoint answers only its default scenario (Sended at once) - there is no scenario-selection mechanism (open decision, CLAUDE.md / module.service.md §10), so the demo's real init cannot be made to receive this answer (iteration 1)
- [ ] FINAL-P-response-fail remote answers Fail inline -> API status fail, record fail
  Blocked: the emulator's live endpoint answers only its default scenario (Sended at once) - there is no scenario-selection mechanism (open decision, CLAUDE.md / module.service.md §10), so the demo's real init cannot be made to receive this answer (iteration 1)
- [ ] FINAL-P-response-default remote answers a status outside the map -> record fail (default_status)
  Blocked: the emulator's live endpoint answers only its default scenario (Sended at once) - there is no scenario-selection mechanism (open decision, CLAUDE.md / module.service.md §10), so the demo's real init cannot be made to receive this answer (the emulator also only emits Sended/Sending/Fail on this path) (iteration 1)
- [x] FINAL-G-callback-success general: callback Sended -> record success
  Observed: same callback as CB-G-valid -> record success. (iteration 2)
- [x] FINAL-G-callback-fail general: callback Fail -> record fail
  Observed: record in status process, callback Fail -> 200, record now fail. (iteration 2)
- [x] FINAL-G-callback-process general: callback Sending -> record process (the remote service has the last word)
  Observed: record in status success, callback Sending -> 200, record now process. (iteration 2)
- [x] FINAL-G-callback-default general: callback status outside the map (Unknown) -> record fail (default_status)
  Observed: callback Unknown -> 200, record now fail. (iteration 2)
- [x] FINAL-P-callback-success process: callback Sended -> record success
  Observed: same callback as CB-P-valid -> record success. (iteration 2)
- [x] FINAL-P-callback-fail process: callback Fail -> record fail
  Observed: record in status process, callback Fail -> 200, record now fail. (iteration 2)
- [x] FINAL-P-callback-process process: callback Sending -> record process (the remote service has the last word)
  Observed: record in status success, callback Sending -> 200, record now process. (iteration 2)
- [x] FINAL-P-callback-default process: callback status outside the map (Unknown) -> record fail (default_status)
  Observed: callback Unknown -> 200, record now fail. (iteration 2)

## Error-code tests (`ERRCODE-*`)
- [ ] ERRCODE-G-http_error remote HTTP error (4xx/5xx) -> doProcess() throws -> record error, API 500
  Blocked: no safe live trigger: forcing a real remote failure would mean breaking the shared emulator/stack or adding fault-injection the module does not have (same open gap as development/backlog/demo/test/no-live-trigger-for-remote-error-paths.md for module test) (iteration 1)
- [ ] ERRCODE-G-timeout remote request timeout -> doProcess() throws -> record error, API 500
  Blocked: no safe live trigger: forcing a real remote failure would mean breaking the shared emulator/stack or adding fault-injection the module does not have (same open gap as development/backlog/demo/test/no-live-trigger-for-remote-error-paths.md for module test) (iteration 1)
- [ ] ERRCODE-G-malformed_body remote response without id/status -> doProcess() throws -> record error, API 500
  Blocked: no safe live trigger: forcing a real remote failure would mean breaking the shared emulator/stack or adding fault-injection the module does not have (same open gap as development/backlog/demo/test/no-live-trigger-for-remote-error-paths.md for module test) (iteration 1)
- [ ] ERRCODE-G-signature_mismatch wrong X-Signature -> emulator 401 (assumed, module.service.md EMU-3) -> doProcess() throws -> record error, API 500
  Blocked: no safe live trigger: forcing a real remote failure would mean breaking the shared emulator/stack or adding fault-injection the module does not have (same open gap as development/backlog/demo/test/no-live-trigger-for-remote-error-paths.md for module test); the 401 status itself is an assumption of the spec (iteration 1)
- [ ] ERRCODE-P-http_error remote HTTP error (4xx/5xx) -> doProcess() throws -> record error, API 500
  Blocked: no safe live trigger: forcing a real remote failure would mean breaking the shared emulator/stack or adding fault-injection the module does not have (same open gap as development/backlog/demo/test/no-live-trigger-for-remote-error-paths.md for module test) (iteration 1)
- [ ] ERRCODE-P-timeout remote request timeout -> doProcess() throws -> record error, API 500
  Blocked: no safe live trigger: forcing a real remote failure would mean breaking the shared emulator/stack or adding fault-injection the module does not have (same open gap as development/backlog/demo/test/no-live-trigger-for-remote-error-paths.md for module test) (iteration 1)
- [ ] ERRCODE-P-malformed_body remote response without id/status -> doProcess() throws -> record error, API 500
  Blocked: no safe live trigger: forcing a real remote failure would mean breaking the shared emulator/stack or adding fault-injection the module does not have (same open gap as development/backlog/demo/test/no-live-trigger-for-remote-error-paths.md for module test) (iteration 1)
- [ ] ERRCODE-P-signature_mismatch wrong X-Signature -> emulator 401 (assumed, module.service.md EMU-3) -> doProcess() throws -> record error, API 500
  Blocked: no safe live trigger: forcing a real remote failure would mean breaking the shared emulator/stack or adding fault-injection the module does not have (same open gap as development/backlog/demo/test/no-live-trigger-for-remote-error-paths.md for module test); the 401 status itself is an assumption of the spec (iteration 1)

## Fix-code runs
### Iteration 1 -> 2
Iteration 1 ran 40 live rows: 34 passed, 6 failed (all `STATUS-*-process-*`: a real defect in `emulator/modules/mail_service`, see below), 14 were written as blocked. `fix-code` was run on this file: it fixed the defect, and paused on the 14 blocked rows (genuine open decisions / missing test infrastructure, its section 3.5 - nothing invented). Iteration 2 re-ran every live row against the fixed code: 40 / 40 pass; the 14 blocked rows are unchanged.

## Fix log
### Iteration 1 (2026-10-05)
- `STATUS-G-process-success`, `STATUS-G-process-fail`, `STATUS-G-process-process-success`, `STATUS-P-process-success`, `STATUS-P-process-fail`, `STATUS-P-process-process-success`: fixed - the callback job had been moved from `application/jobs/` to `infrastructure/queue/` (design-review warning), but its namespace and the `use` in `QueueCallbackScheduler` still named `application` + `jobs`, so every scheduling scenario crashed (`Class ... InitProcessCallbackJob not found`); unit tests, PHPStan and `php -l` did not notice. Changed: `InitProcessCallbackJob` namespace to the module's `infrastructure/queue` namespace of the module, the `use` in `QueueCallbackScheduler`; added the regression test `emulator/tests/Unit/modules/mail_service/infrastructure/QueueCallbackSchedulerTest.php` (the scheduler really pushes an `InitProcessCallbackJob` with delay 5). Emulator unit suite 32 tests green, PHPStan clean, ddd-yii2 greps clean. Re-verified live in iteration 2 (all six pass). Filed and closed: `development/complete/emulator/mail_service/emulator-callback-job-namespace-not-moved.md`.
- `FINAL-G-response-process`, `FINAL-G-response-fail`, `FINAL-G-response-default`, `FINAL-P-response-process`, `FINAL-P-response-fail`, `FINAL-P-response-default`: skipped - blocked on the open decision how a test selects the emulator scenario (CLAUDE.md); filed at `development/backlog/emulator/mail_service/emulator-scenario-selection-undecided.md`.
- `ERRCODE-G-*`, `ERRCODE-P-*` (http_error, timeout, malformed_body, signature_mismatch): skipped - no safe live trigger without breaking the shared stack or adding fault injection (a design choice); filed at `development/backlog/demo/mail_service/no-live-trigger-for-remote-error-paths.md`.
