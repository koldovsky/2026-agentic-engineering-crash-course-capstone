# Module `mail_service` — test checklist

| | |
|---|---|
| Module | `mail_service` (id `mail_service`) |
| Sources | `module.yaml`, `module.service.yaml`, `module.service.md` |
| Generated | 2026-10-05 |
| Legend | `[unit]` class in isolation · `[api]` HTTP request to the API with the emulator · `[e2e]` whole flow |

Progress: 0 / 66 checked.

## 0. Preconditions
- [ ] PRE-01 stack is up (`docker-build`), API `http://demo.dev` and emulator `http://emulator.dev:81` answer
- [ ] PRE-02 `service` lists `mail_service` with `api_key`/`secret_key` set (RegisterService migration applied) in `demo/`
- [ ] PRE-03 the emulator module implements EMU-1 … EMU-8 of `module.service.md` §9
- [ ] PRE-03b `rabbitmq` is healthy and `emulator-queue-worker` is running
- [ ] PRE-04 database is in a known state (test rows removed between runs)

## 1. Module wiring
- [ ] WIRE-01 [unit] `Module::bootstrap()` registers `POST /mail_service/v1/init`, `POST /mail_service/v1/callback` → both resolve
- [ ] WIRE-02 [unit] `GET /mail_service/v1/init` → 405 (not 404); `POST /mail_service/v1`, unknown path → no route (404)
- [ ] WIRE-03 [unit] `migrate` creates the `mail_service` row in `service` with its key pair; `migrate/down` removes it
- [ ] WIRE-04 [unit] `V1Controller` implements `doProcess()`, `getExternalId()`, `getCallbackStatus()` only

## 2. Request `POST /mail_service/v1/init`
- [ ] INIT-01 [api] body `{}` → 422 errors on requestId/service_method/data
- [ ] INIT-02 [api] `data` not an object → 422
- [ ] INIT-03 [api] duplicate `requestId` → 422, no second record
- [ ] INIT-04 [api] `general`: `data.user_id` missing/non-integer → 500/`error` (per-field `data` validation has no 422 path - `BaseController` validates only the top-level shape, AGENTS.md rule 3)
- [ ] INIT-05 [api] `general`: `data.send_to` missing/longer than 16 → 500/`error`
- [ ] INIT-06 [api] `general`: `data.test` missing → 500/`error`
- [ ] INIT-07 [api] `process`: `data.user_id` missing/non-integer → 500/`error`
- [ ] INIT-08 [api] `process`: `data.send_to` missing/longer than 16 → 500/`error`
- [ ] INIT-09 [api] `process`: `data.test` missing → 500/`error`
- [ ] INIT-10 [api] wrong verb GET/PUT → 405
- [ ] INIT-11 [api] valid `general` request → 200, record `status: init` then mapped status
- [ ] INIT-12 [api] valid `process` request → 200, record `status: init` then mapped status
- [ ] INIT-13 [api] unknown `service_method` → (expected result open: the specs do not define it)

## 3. Request `POST /mail_service/v1/callback`
- [ ] CB-01 [api] empty body → 400
- [ ] CB-02 [api] body without `id` → 400
- [ ] CB-03 [api] unknown process id → 404, no record changed
- [ ] CB-04 [api] callback before the init response is saved → 404
- [ ] CB-05 [api] wrong verb → 405
- [ ] CB-06 [api] valid `general` callback (`Sended`) → 200, record updated
- [ ] CB-07 [api] valid `process` callback (`Sended`) → 200, record updated
- [ ] CB-08 [api] callback without `status` (or wrong type of `created_at`/`updated_at`) → expected result open (the specs do not define the validation status)

## 4. Request module → remote service
- [ ] REQ-01 [api] `general`: body is exactly `{request_id, service, to, text, callback_url}` (module.service.md §6), `service` = `general`, `to` = `data.send_to`, `text` = `data.test`; `Content-Type: application/json`
- [ ] REQ-02 [api] `process`: same body with `service` = `process`
- [ ] REQ-03 [api] `X-Api-Key` / `X-Signature` headers present and correct (HMAC-SHA256 of the raw body with the module's `secret_key`)
- [ ] REQ-04 [api] response `id`/`status` read: `id` stored as `external_id`, `status` mapped
- [ ] REQ-05 [unit] `data.user_id` is not sent to the remote service

## 5. Flow by statuses (`general` = G, `process` = P, identical shape)
- [ ] FLOW-G-01 [e2e] init → remote `Sended` (no callback needed) → API `status: success`; record `success`; final
- [ ] FLOW-G-02 [e2e] init → remote `Sending` → API `status: process`; callback `Sended` (≥5s later) → record `success`
- [ ] FLOW-G-03 [e2e] init → remote `Sending` → callback `Fail` → record `fail`
- [ ] FLOW-G-04 [e2e] init → remote `Sending` → callback `Sending` → callback `Sended` → record `success`
- [ ] FLOW-G-05 [e2e] init → remote `Fail` at once → API `status: fail`; no callback needed
- [ ] FLOW-G-06 [api] remote status outside the map → record `fail` (`default_status`, assumed)
- [ ] FLOW-G-07 [api] callback status outside the map → record `fail`
- [ ] FLOW-G-08 [api] `external_id` saved from the remote response, used (with `service_id`) to find the record of the callback
- [ ] FLOW-G-09 [api] `created_at`/`updated_at` of the record are set on init and refreshed on the callback
- [ ] FLOW-P-01 [e2e] init → remote `Sended` (no callback needed) → API `status: success`; record `success`; final
- [ ] FLOW-P-02 [e2e] init → remote `Sending` → API `status: process`; callback `Sended` (≥5s later) → record `success`
- [ ] FLOW-P-03 [e2e] init → remote `Sending` → callback `Fail` → record `fail`
- [ ] FLOW-P-04 [e2e] init → remote `Sending` → callback `Sending` → callback `Sended` → record `success`
- [ ] FLOW-P-05 [e2e] init → remote `Fail` at once → API `status: fail`; no callback needed
- [ ] FLOW-P-06 [api] remote status outside the map → record `fail` (`default_status`, assumed)
- [ ] FLOW-P-07 [api] callback status outside the map → record `fail`
- [ ] FLOW-P-08 [api] `external_id` saved from the remote response, used (with `service_id`) to find the record of the callback
- [ ] FLOW-P-09 [api] `created_at`/`updated_at` of the record are set on init and refreshed on the callback

## 6. Errors and failure modes
- [ ] ERR-01 remote HTTP error/timeout → `doProcess()` throws → record `error`, client gets 500
- [ ] ERR-02 remote response without `id`/`status` → `doProcess()` throws → record `error`
- [ ] ERR-03 two callbacks in a row (`Sended` then `Fail`) → final status is the last one applied
- [ ] ERR-04 remote response with a status the module may not return (`init`/`error`) → base saves `error`, 500

## 7. Emulator checks
- [ ] EMU-CHK-01 rejects a request with a bad/missing `X-Signature` or `X-Api-Key` (status open, `module.service.md` §10)
- [ ] EMU-CHK-02 rejects a request missing `request_id`, `service`, `to`, `text` or `callback_url` (status open)
- [ ] EMU-CHK-03 creates its own process record with a unique `process_id`
- [ ] EMU-CHK-04 returns the response of the chosen scenario
- [ ] EMU-CHK-05 schedules the callback with a 5s delay (not sent inline); `emulator-queue-worker` delivers it to the received `callback_url` with `{id, status, created_at, updated_at}`

## 8. Cross-cutting
- [ ] X-01 [api] CORS preflight `OPTIONS` on both endpoints is not rejected
- [ ] X-02 [api] authentication behaves as decided — (expected result open until decided, CLAUDE.md)
- [ ] X-03 [api] `Accept: application/json` → JSON body
- [ ] X-04 [api] the response of every request is valid JSON with the keys of `module.service.md` §7/§8
