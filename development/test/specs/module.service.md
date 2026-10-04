# Module `test` — service document

| | |
|---|---|
| Module | `test` (id `test`) — Test API module (demo/proof-of-concept for the module generation pipeline) |
| Author | Test <test@gmail.com> |
| Specs | `module.yaml`, `module.service.yaml` (source of this document) |
| Generated | 2026-09-27 |

## 1. Summary
`test` is a demo module with two identical-shape service methods, `service_1` and `service_2`, both calling the same
remote endpoint `POST /init-process` (told apart by the `service` field of the request body). Both send a signed
request (HMAC-SHA256, headers `X-Api-Key`/`X-Signature`) and both send a callback with the final result. No real
production remote service is assigned (`remote_service.base_url` is a placeholder) - only the emulator is exercised.

## 2. Actors and URLs
| Actor | URL | Role |
|-------|-----|------|
| API (host) | `http://demo.dev` | receives the client requests and the callbacks |
| Module endpoints | `POST /test/v1/init`, `POST /test/v1/callback` | (`module.yaml` → `requests`) |
| Remote service | `https://remote.example.com/init-process` (placeholder) | no real service assigned |
| Emulator | `http://emulator.dev:81/test/init-process` | plays the remote service in tests |
| Signature | enabled | HMAC-SHA256 over the raw JSON body; headers `X-Api-Key` / `X-Signature` (flow.md §1b) |
| Callback URL | `http://demo.dev/test/v1/callback` | sent as `callback_url` in every request to the remote service (flow.md §1a) |

## 3. Flow (both methods, identical shape)

```text
client --POST /test/v1/init (requestId, service_method, data)--> API
API: validate, resolve service, create record in `process` (status init)
API --module: POST https://remote.example.com/init-process (request_id, service, callback_url, X-Api-Key, X-Signature)--> remote service
remote service --response (id, status)--> module
API: map the remote status, save external_id + status
API --200 (requestId, status)--> client
remote service --POST /test/v1/callback (id, status, created_at, updated_at)--> API
API: find the record by service + external_id, map the callback status, save it
```
The process is NOT final after the init response (`Processing` maps to `process`) unless the remote response is
already `Complete`/`Fail` - the callback can still change a final status per flow.md's "the remote service has the
last word".

## 4. Service methods
| Method | Remote request | Callback | Data parameters |
|--------|-----------------|----------|------------------|
| `service_1` | `POST /init-process` | yes | `user_id` (integer), `test_data` (string, max 8) |
| `service_2` | `POST /init-process` | yes | `user_id` (integer), `test_data` (string, max 8) |

## 5. Status mapping (both methods, response and callback)
| Remote value | Our status |
|--------------|------------|
| `Complete` | `success` |
| `Processing` | `process` |
| `Fail` | `fail` |
| any other value | `fail` (`default_status`, assumed - not given by the user, flag in review) |

## 6. Data mapping (init request → remote request)
| Remote parameter | Type | Source | Value in the example |
|-------------------|------|--------|------------------------|
| `request_id` | string | `from: requestId` | `"123344"` |
| `service` | string | `from: service_method` | `service_1` |
| `callback_url` | string | fixed | `http://demo.dev/test/v1/callback` |
| `X-Api-Key` (header) | string | fixed, `service.api_key` | env `TEST_API_KEY` |
| `X-Signature` (header) | string | fixed, HMAC-SHA256(body, `service.secret_key`) | env `TEST_SECRET_KEY` |

No init `data` parameter is unused: both `user_id` and `test_data` are kept only in `incoming_data` (not sent to the
remote service in this version - only `request_id`/`service`/`callback_url` are sent). Flag this in the report: the
user did not say `user_id`/`test_data` are forwarded to the remote request body, so they are recorded but not mapped.

## 7. Examples — user ↔ API

**Valid init (`service_1`, remote answers `Processing`):**
```
POST /test/v1/init
{"requestId": "123344", "service_method": "service_1", "data": {"user_id": 42, "test_data": "abcdefgh"}}
```
→ `200 {"requestId": "123344", "status": "process"}`; `process` record: `service_id=<test>`, `status=process`,
`external_id="ext-1001"`.

**422 - missing `data`:**
```
POST /test/v1/init
{"requestId": "123344", "service_method": "service_1"}
```
→ `422 {"errors": [{"field": "data", "message": "data is required and must be an object."}]}`.

**422 - duplicate `requestId`:** a second init with the same `requestId` → `422` on `requestId`.

**500 - service not registered:** requesting `/other/v1/init` for an id with no `RegisterService` row → `500`.

**405 - wrong verb:** `GET /test/v1/init` → `405`.

## 8. Examples — module ↔ remote service

**Request (module → remote/emulator):**
```
POST http://emulator.dev:81/test/init-process
Content-Type: application/json
X-Api-Key: <TEST_API_KEY>
X-Signature: <hex hmac-sha256 of the body below, using TEST_SECRET_KEY>

{"request_id": "123344", "service": "service_1", "callback_url": "http://demo.dev/test/v1/callback"}
```

**Response (`Processing`):** `200 {"id": "ext-1001", "status": "Processing"}` → mapped `process`.
**Response (`Complete`):** `200 {"id": "ext-1002", "status": "Complete"}` → mapped `success`, process final at once.
**Response (`Fail`):** `200 {"id": "ext-1003", "status": "Fail"}` → mapped `fail`, process final at once.

**Callback (after `Processing`), success:**
```
POST /test/v1/callback
{"id": "ext-1001", "status": "Complete", "created_at": 1700000000, "updated_at": 1700000005}
```
→ `200 {}`; record `status=success`.

**Callback, fail:** `{"id": "ext-1001", "status": "Fail", ...}` → record `status=fail`.

**Error cases:** remote HTTP error / timeout / malformed body → the module's `doProcess()` throws, record `error`
(500); callback for an unknown id → 404; callback before the init response is saved → 404 (flow.md "Callback
ordering"); callback with a status outside the map → `default_status` = `fail`.

## 9. Emulator requirements

- EMU-1 endpoint: `POST http://emulator.dev:81/test/init-process`, `Content-Type: application/json`.
- EMU-2 request validation: `request_id`, `service`, `callback_url` required strings; violation → 422 with the list of
  errors (status open, unless the specs define it - not defined here, flag as open).
- EMU-3 signature: `X-Api-Key` must equal the emulator's own copy of `TEST_API_KEY`; `X-Signature` must equal
  `hash_hmac('sha256', $rawBody, TEST_SECRET_KEY)`; mismatch → 401 (open - status not specified, assumed).
- EMU-4 process record: creates its own process row (`service_method`, `process_id` unique, `status`, timestamps);
  `process_id` is what the response returns as `id`.
- EMU-5 response: `{"id": <process_id>, "status": <scenario status>}`.
- EMU-6 callback: scheduled with a fixed 5-second RabbitMQ delay (TTL + dead-letter exchange, flow.md §6a), sent by
  `emulator-queue-worker` to the `callback_url` received in the request, body `{id, status, created_at, updated_at}`.
- EMU-7 scenarios (§9.1): selection is an open point (CLAUDE.md) - the builders take the scenario as an explicit
  parameter.
- EMU-8 idempotency: `process_id` never repeats.

### 9.1 Scenarios
| Scenario | Remote response status | Callback(s) | API result |
|----------|--------------------------|-------------|-------------|
| Complete at once | `Complete` | none needed | `success` |
| Processing → Complete | `Processing` | `Complete` | `process` then `success` |
| Processing → Fail | `Processing` | `Fail` | `process` then `fail` |
| Fail at once | `Fail` | none needed | `fail` |
| Unmapped remote value | e.g. `Unknown` | - | `fail` (`default_status`, assumed) |

## 10. Open points
- Signature algorithm and key handling are decided project-wide (CLAUDE.md); only the emulator's exact 401 response
  body/status for a bad signature is undefined here.
- Scenario selection in the emulator (how a test picks Complete / Processing→Complete / Processing→Fail / Fail).
- `default_status: fail` for both methods is an assumption (not given by the user) - confirm or change.
- Whether `user_id`/`test_data` should be forwarded to the remote request body was not stated; currently kept only in
  `incoming_data`.
- API authentication (CLAUDE.md).
- Emulator validation/signature-failure HTTP status.
