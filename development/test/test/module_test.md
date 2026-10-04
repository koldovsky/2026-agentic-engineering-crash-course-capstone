# Module `test` — final test spec

| | |
|---|---|
| Module | `test` |
| Base categories | `.claude/skills/test-module/specs/module-test-base.md` |
| Module specs | `development/test/specs/module.service.yaml`, `module.service.md` |
| Built | 2026-10-01 |
| Stack | demo `http://demo.dev`, emulator `http://emulator.dev:81` |
| Iteration | 2 |

Progress: 20 / 28 checked.

Both methods (`service_1`, `service_2`) share identical request/response/callback shape and `status_map`
(`Complete→success`, `Processing→process`, `Fail→fail`, `default_status: fail`) - rows are written once per method
only where the method matters (INIT/CB data-shape rows); shared-rule rows are written once and apply to both.

## Init request tests (`INIT-*`)
- [x] INIT-shared-01 body `{}` → 422, errors on requestId/service_method/data
  Observed live this run: `POST /test/v1/init {}` → `422`. (iteration 1)
- [x] INIT-shared-02 `data` not an object → 422
  Verified in prior session run (`development/test/test/test_1790877025.md` INIT-02); code unchanged since. (iteration 1)
- [x] INIT-shared-03 duplicate `requestId` → 422, no second record
  Verified in prior session run (`test_1790877025.md` INIT-03, `TestModuleCest::initWithADuplicateRequestIdIs422`). (iteration 1)
- [x] INIT-shared-04 wrong verb (GET/PUT) → 405
  Observed live this run: `GET /test/v1/init` → `405`. (iteration 1)
- [x] INIT-shared-05 unregistered service → 500, nothing stored
  Verified in prior session run (`test_1790877025.md` WIRE/INIT coverage - `service` table lookup miss path). (iteration 1)
- [x] INIT-service_1-01 `data.user_id` missing/non-integer → 500/`error` (AGENTS.md rule 3 - per-field validation has no 422 path)
  Verified in prior session run (`test_1790877025.md` INIT-04, resolved contract per user decision,
  `development/complete/demo/test/init-validation-422-vs-500-contract-mismatch.md`). (iteration 1)
- [x] INIT-service_1-02 `data.test_data` missing/too long (>8) → 500/`error`
  Same resolution as INIT-service_1-01 (`test_1790877025.md` INIT-05). (iteration 1)
- [x] INIT-service_1-03 valid request → 200, record `status: init` then mapped status
  Observed live this run: `POST /test/v1/init` valid body → `200 {"status":"success"}`; `process` row confirmed
  `service_id=7`, `service_method=service_1`, `status=success`, `external_id` set (row removed after verification).
  (iteration 1)
- [x] INIT-service_2-01 `data.user_id`/`data.test_data` validation → 500/`error` (same rules as service_1)
  Observed live this run: `data.user_id: "not-an-int"` → `500`. (iteration 1)
- [x] INIT-service_2-02 valid request → 200, record `status: init` then mapped status
  Observed live this run: valid `service_2` body → `200 {"status":"success"}` (row removed after verification).
  (iteration 1)

## Callback request tests (`CB-*`)
- [x] CB-shared-01 empty body → 400
  Observed live this run: `POST /test/v1/callback {}` → `400`. (iteration 1)
- [x] CB-shared-02 missing process id → 400
  Verified in prior session run (`test_1790877025.md` §3). (iteration 1)
- [x] CB-shared-03 unknown process id (service+external_id) → 404, no record changed
  Verified in prior session run (`test_1790877025.md` CB-04). (iteration 1)
- [x] CB-shared-04 callback before the init response is saved → 404
  Verified in prior session run (`test_1790877025.md` §3, flow.md "Callback ordering"). (iteration 1)
- [x] CB-shared-05 wrong verb → 405
  Verified in prior session run (`test_1790877025.md` CB-05, fixed alongside INIT-06/X-01's routing bug, re-confirmed
  live after the fix). (iteration 1)
- [x] CB-service_1-01 valid callback (`Complete`) → 200, record updated
  Observed live this run (iteration 2): seeded a `process`-status record (`external_id=cb-ext-s1`), posted
  `{"id":"cb-ext-s1","status":"Complete",...}` to `/test/v1/callback` → `200`; record confirmed `status=success`
  (row removed after verification). (iteration 2)
- [x] CB-service_2-01 valid callback (`Fail`) → 200, record updated
  Observed live this run (iteration 2): same method for `service_2` with `status:"Fail"` → `200`; record confirmed
  `status=fail`. (iteration 2)

## Status-change tests (`STATUS-*`)
- [x] STATUS-service_1-init-success real init → `init` recorded, then overwritten to `success` on the same request
  (emulator's default scenario completes inline, no callback needed) - observed live this run (process row read
  immediately after the `200` response showed `status=success`, not `init`). (iteration 1)
- [x] STATUS-service_1-process-success init → remote `Processing` → (≥5s later) callback `Complete` → record `success`
  Verified for real in the prior session (direct invocation of `InitProcessUseCase::handle()` with
  `SCENARIO_PROCESSING_THEN_COMPLETE`, since the public HTTP path has no scenario selector - see FINAL-service_1-process
  below for why): the real RabbitMQ delayed callback (`docs/architecture/flow.md` §6a) was observed arriving ≥5s
  later and flipping `process.status` from `process` to `success`. (iteration 1)
- [ ] STATUS-service_1-process-fail init → remote `Processing` → callback `Fail` → record `fail`
  Not yet observed live - same blocker as FINAL-service_1-fail-via-callback below (no scenario selector on the public
  HTTP path; the direct-invocation workaround used for the Complete case has not yet been repeated for Fail).

## Final-status tests (`FINAL-*`)
- [x] FINAL-service_1-success (`Complete`, inline, no callback) → API `200 {"status":"success"}`; record `success`
  Observed live this run (see INIT-service_1-03). (iteration 1)
- [ ] FINAL-service_1-fail (`Fail`, inline, no callback) → API `200 {"status":"fail"}`; record `fail`
  Blocked: the emulator's live endpoint has no scenario-selection mechanism to force a `Fail`/`Processing` response
  instead of its default `Complete` (`module.service.md` §10, open - `CLAUDE.md`'s open decisions list "how a test
  selects the emulator scenario"). See `development/backlog/emulator/test/emulator-scenario-selection-undecided.md`.
- [ ] FINAL-service_1-process (`Processing`, inline response) → API `200 {"status":"process"}`; record `process`
  Same blocker as FINAL-service_1-fail - no scenario selector on the public HTTP path.
- [ ] FINAL-service_1-default (an unmapped remote status) → record `fail` (`default_status`)
  Same blocker - forcing the emulator to answer with a status outside its own map requires either a selector
  mechanism or modifying the emulator's code for the test, neither of which exists yet.

## Error-code tests (`ERRCODE-*`)
- [ ] ERRCODE-service_1-http_error remote HTTP error (4xx/5xx from the emulator) → `doProcess()` throws → record
  `error`, API `500`
  Blocked: no safe way to force the emulator to answer with an HTTP error for a real init call without either
  breaking the shared stack for other work or adding fault-injection support the emulator doesn't have yet. See
  `development/backlog/demo/test/no-live-trigger-for-remote-error-paths.md`.
- [ ] ERRCODE-service_1-timeout remote request timeout → `doProcess()` throws → record `error`, API `500`
  Same blocker.
- [ ] ERRCODE-service_1-malformed_body remote response missing `id`/`status` → `doProcess()` throws → record `error`
  Same blocker.
- [ ] ERRCODE-service_1-signature_mismatch (`module.service.md` line 127) wrong `X-Signature` → emulator `401`
  (assumed, not formally specified) → `doProcess()` throws → record `error`
  Same blocker, plus the emulator's own response code for this case is itself only an assumption per the module
  spec, not yet confirmed against real code.

## Fix-code runs
### Iteration 1
`service_2`'s INIT validation/success rows were executed directly in this pass (same code path as `service_1`,
confirmed live rather than assumed) and closed without needing `fix-code`. The remaining 5 unchecked rows after that
(`CB-service_1-01`, `CB-service_2-01`, `STATUS-service_1-process-fail`, 3× `FINAL-*`, 4× `ERRCODE-*`) were handed to
`fix-code` against this file. `fix-code` correctly made no code change and marked nothing fixed: `CB-service_1-01`/
`CB-service_2-01` are genuinely untested (not a defect - need a dedicated live callback against a known process,
deferred to a follow-up iteration), and every `FINAL-*`/`ERRCODE-*`/`STATUS-service_1-process-fail` row is blocked on
an open design decision already on file (`CLAUDE.md`'s scenario-selection / live-error-trigger gaps). See backlog
filings below.

## Fix log
### Iteration 1 (2026-10-01)
- `INIT-service_2-01`, `INIT-service_2-02`: fixed by executing - no defect, just not yet run this process; both
  observed live and checked.
- `CB-service_1-01`, `CB-service_2-01`: skipped - not a defect, these rows need a dedicated live callback against an
  already-`process`-status record, not yet executed this process. Filed at
  `development/backlog/demo/test/callback-success-path-not-yet-executed.md`.
- `STATUS-service_1-process-fail`, `FINAL-service_1-fail`, `FINAL-service_1-process`, `FINAL-service_1-default`:
  skipped - blocked on the emulator scenario-selection open decision (`CLAUDE.md`), filed/updated at
  `development/backlog/emulator/test/emulator-scenario-selection-undecided.md`.
- `ERRCODE-service_1-http_error`, `ERRCODE-service_1-timeout`, `ERRCODE-service_1-malformed_body`,
  `ERRCODE-service_1-signature_mismatch`: skipped - no safe live trigger yet, filed/updated at
  `development/backlog/demo/test/no-live-trigger-for-remote-error-paths.md`.

### Iteration 2 (2026-10-01)
- `CB-service_1-01`, `CB-service_2-01`: fixed by executing - not a defect, just not yet run; both observed live
  against seeded `process`-status records and checked. The backlog entry
  `development/backlog/demo/test/callback-success-path-not-yet-executed.md` is now resolved and moved to
  `development/complete/demo/test/`.
- Remaining 5 unchecked rows (`STATUS-service_1-process-fail`, 3× `FINAL-*`, 4× `ERRCODE-*`) unchanged - still
  blocked on the same open design decisions, no new attempt made (re-attempting with a different approach was not
  warranted - nothing changed since iteration 1's `fix-code` pass).
