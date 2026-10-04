# Module `test` — test checklist

| | |
|---|---|
| Module | `test` (id `test`) |
| Sources | `module.yaml`, `module.service.yaml`, `module.service.md` |
| Generated | 2026-09-27 |
| Legend | `[unit]` class in isolation · `[api]` HTTP request to the API with the emulator · `[e2e]` whole flow |

Progress: 0 / 34 checked.

## 0. Preconditions
- [ ] PRE-01 stack is up (`docker-build`), API `http://demo.dev` and emulator `http://emulator.dev:81` answer
- [ ] PRE-02 `service` lists `test` with `api_key`/`secret_key` set (RegisterService migration applied) in `demo/`
- [ ] PRE-03 the emulator module implements EMU-1 … EMU-8 of `module.service.md` §9
- [ ] PRE-03b `rabbitmq` is healthy and `emulator-queue-worker` is running
- [ ] PRE-04 database is in a known state (test rows removed between runs)

## 1. Module wiring
- [ ] WIRE-01 [unit] `Module::bootstrap()` registers `POST /test/v1/init`, `POST /test/v1/callback` → both resolve
- [ ] WIRE-02 [unit] `GET /test/v1/init`, `POST /test/v1`, unknown path → no route (404)
- [ ] WIRE-03 [unit] `migrate` creates the `test` row in `service` with its key pair; `migrate/down` removes it
- [ ] WIRE-04 [unit] `V1Controller` implements `doProcess()`, `getExternalId()`, `getCallbackStatus()` only

## 2. Request `POST /test/v1/init`
- [ ] INIT-01 [api] body `{}` → 422 errors on requestId/service_method/data
- [ ] INIT-02 [api] `data` not an object → 422
- [ ] INIT-03 [api] duplicate `requestId` → 422, no second record
- [ ] INIT-04 [api] `data.user_id` missing/non-integer → 500/`error` (not 422 - `BaseController` has no per-module
  422 hook; a `doProcess()` validation failure is a generic failure to the host, AGENTS.md rule 3 - corrected
  2026-10-01, `development/test/test/test_1790877025.md`)
- [ ] INIT-05 [api] `data.test_data` missing/too long (>8) → 500/`error` (same correction as INIT-04)
- [ ] INIT-06 [api] wrong verb GET/PUT → 405
- [ ] INIT-07 [api] valid `service_1` request → 200, record `status: init` then mapped status

## 3. Request `POST /test/v1/callback`
- [ ] CB-01 [api] empty body → 400
- [ ] CB-02 [api] body without `id` → 400
- [ ] CB-03 [api] unknown process id → 404, no record changed
- [ ] CB-04 [api] callback before the init response is saved → 404
- [ ] CB-05 [api] wrong verb → 405
- [ ] CB-06 [api] valid callback → 200, record updated

## 4. Request module → remote service
- [ ] REQ-01 [api] body is exactly `{request_id, service, callback_url}` (module.service.md §6); `Content-Type: application/json`
- [ ] REQ-02 [api] `X-Api-Key` / `X-Signature` headers present and correct (HMAC-SHA256 of the raw body)
- [ ] REQ-03 [api] response `id`/`status` read: `id` stored as `external_id`, `status` mapped

## 5. Flow by statuses (`service_1`, `service_2` identical)
- [ ] FLOW-S1-01 [e2e] init → remote `Complete` (no callback needed) → API `status: success`; record `success`; final
- [ ] FLOW-S1-02 [e2e] init → remote `Processing` → API `status: process`; callback `Complete` (≥5s later) → record `success`
- [ ] FLOW-S1-03 [e2e] init → remote `Processing` → callback `Fail` → record `fail`
- [ ] FLOW-S1-04 [e2e] init → remote `Fail` at once → API `status: fail`; no callback needed
- [ ] FLOW-S1-05 [api] remote status outside the map → record `fail` (`default_status`, assumed)
- [ ] FLOW-S1-06 [api] callback status outside the map → record `fail`
- [ ] FLOW-S1-07 [api] `external_id` saved from the remote response, used to find the record of the callback
- [ ] FLOW-S2-01…07 [e2e]/[api] same rows as FLOW-S1-* for `service_2`

## 6. Errors and failure modes
- [ ] ERR-01 remote HTTP error/timeout → `doProcess()` throws → record `error`, client gets 500
- [ ] ERR-02 remote response without `id`/`status` → `doProcess()` throws → record `error`
- [ ] ERR-03 two callbacks in a row (`Complete` then `Fail`) → final status is the last one applied

## 7. Emulator checks
- [ ] EMU-CHK-01 rejects a request with a bad/missing `X-Signature` (status open, `module.service.md` §10)
- [ ] EMU-CHK-02 creates its own process record with a unique `process_id`
- [ ] EMU-CHK-03 returns the response of the chosen scenario
- [ ] EMU-CHK-04 schedules the callback with a 5s delay (not sent inline); `emulator-queue-worker` delivers it

## 8. Cross-cutting
- [ ] X-01 [api] CORS preflight `OPTIONS` on both endpoints is not rejected
- [ ] X-02 [api] authentication behaves as decided — (expected result open until decided, CLAUDE.md)
- [ ] X-03 [api] `Accept: application/json` → JSON body
