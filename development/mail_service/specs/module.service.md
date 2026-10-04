# Module `mail_service` — service document

| | |
|---|---|
| Module | `mail_service` (id `mail_service`) — Sends mail through the remote mail service (init request, then a callback with the final status) |
| Author | Test <test@gmail.com> |
| Specs | `module.yaml`, `module.service.yaml` (source of this document) |
| Generated | 2026-10-05 |

## 1. Summary
`mail_service` has two identical-shape service methods, `general` and `process`, both calling the same remote endpoint
`POST /init-process` (told apart by the `service` field of the request body). The module forwards the recipient (`to`)
and the text (`text`) of the mail, sends a signed request (HMAC-SHA256, headers `X-Api-Key`/`X-Signature`, a static key
pair generated for this module) and both methods receive a callback with the final result. Its API endpoints are
`POST /mail_service/v1/init` and `POST /mail_service/v1/callback`. No real production service is assigned
(`remote_service.base_url` points at the emulator) - only the emulator is exercised.

## 2. Actors and URLs
| Actor | URL | Role |
|-------|-----|------|
| API (host) | `http://demo.dev` | receives the client requests and the callbacks |
| Module endpoints | `POST /mail_service/v1/init`, `POST /mail_service/v1/callback` | (`module.yaml` → `requests`) |
| Remote service | `http://emulator.dev:81/init-process` | the service as given by the user (base_url + method path); no separate real service |
| Emulator | `http://emulator.dev:81/mail_service/init-process` | plays the remote service in tests (`emulator/modules/mail_service`) |
| Signature | enabled | HMAC-SHA256 over the raw JSON body; headers `X-Api-Key` / `X-Signature` (flow.md §1b); static key pair in `module.service.yaml` → `remote_service.signature`, passed to the code through env `MAIL_SERVICE_API_KEY` / `MAIL_SERVICE_SECRET_KEY` |
| Callback URL | `http://demo.dev/mail_service/v1/callback` | sent as `callback_url` in every request to the remote service (flow.md §1a) - fixed, not user-configurable |

## 3. Flow

### general / process (identical shape)
```text
client --POST /mail_service/v1/init (requestId, service_method, data)--> API
API: validate, resolve service, create record in `process` (status init)
API --module: POST http://emulator.dev:81/mail_service/init-process (request_id, service, to, text, callback_url: http://demo.dev/mail_service/v1/callback, X-Api-Key, X-Signature)--> remote service
remote service --response (id, status)--> module
API: map the remote status, save external_id + status
API --200 (requestId, status)--> client
remote service --POST /mail_service/v1/callback (id, status, created_at, updated_at)--> API
API: find the record by service + external_id, map the callback status, save it
```
1. The client sends `service_method` = `general` or `process` and `data` (`user_id`, `send_to`, `test`).
2. The host validates the body, resolves the service `mail_service` and saves a `process` record with status `init`.
3. The module builds the remote body (§6) and signs it; the remote service answers `{id, status}`.
4. `Sended` → `success`, `Sending` → `process`, `Fail` → `fail`; `id` is stored as `external_id`.
5. The process is NOT final after the init response while it is `Sending`; the callback brings the final status.
   A callback can still change a final status (flow.md: the remote service has the last word).

## 4. Service methods
| Method | Remote request | Callback | Data parameters |
|--------|-----------------|----------|------------------|
| `general` | `POST /init-process` | yes | `user_id` (integer), `send_to` (string, max 16), `test` (string, text) |
| `process` | `POST /init-process` | yes | `user_id` (integer), `send_to` (string, max 16), `test` (string, text) |

## 5. Status mapping (both methods, response and callback)
| Remote value | Our status |
|--------------|------------|
| `Sended` | `success` |
| `Sending` | `process` |
| `Fail` | `fail` |
| any other value | `fail` (`default_status`, assumed - not given by the user, flag in review) |

## 6. Data mapping (init request → remote request)
| Remote parameter | Type | Source | Value in the example |
|-------------------|------|--------|------------------------|
| `request_id` | string | `from: requestId` | `"123344"` |
| `service` | string | `from: service_method` | `general` |
| `to` | string | `from: data.send_to` | `"user@example.com"` |
| `text` | string | `from: data.test` | `"Hello"` |
| `callback_url` | string | fixed | `http://demo.dev/mail_service/v1/callback` |
| `X-Api-Key` (header) | string | fixed, `service.api_key` | `remote_service.signature.api_key` (env `MAIL_SERVICE_API_KEY`) |
| `X-Signature` (header) | string | fixed, HMAC-SHA256(body, `service.secret_key`) | `remote_service.signature.secret_key` (env `MAIL_SERVICE_SECRET_KEY`) |

`data.user_id` is not mapped to the remote body (the user's remote body lists only request_id, service, to, text); it is
kept in `incoming_data` only.

## 7. Examples — user ↔ API

**Valid init (`general`, remote answers `Sending`):**
```
POST /mail_service/v1/init
{"requestId": "123344", "service_method": "general", "data": {"user_id": 42, "send_to": "user@example.com", "test": "Hello"}}
```
→ `200 {"requestId": "123344", "status": "process"}`; `process` record: `service_id=<mail_service>`,
`service_method=general`, `status=process`, `external_id="ext-1001"`.

**Valid init (`process`, remote answers `Sending`):**
```
POST /mail_service/v1/init
{"requestId": "123345", "service_method": "process", "data": {"user_id": 42, "send_to": "user@example.com", "test": "Hello"}}
```
→ `200 {"requestId": "123345", "status": "process"}`; `process` record: `service_method=process`, `status=process`,
`external_id="ext-2001"`.

**422 - missing `data`:**
```
POST /mail_service/v1/init
{"requestId": "123344", "service_method": "general"}
```
→ `422 [{"field": "data", "message": "data is required and must be an object."}]`.

**422 - duplicate `requestId`:** a second init with the same `requestId` → `422` on `requestId`.

**500 - invalid `data` field:** `data.send_to` longer than 16 characters (or `user_id` not an integer, or `test`
missing) is rejected inside the module's `doProcess()` → record `error`, `500` (host rule, AGENTS.md rule 3).

**500 - service not registered:** requesting `/other/v1/init` for an id with no `RegisterService` row → `500`.

**405 - wrong verb:** `GET /mail_service/v1/init` → `405`.

## 8. Examples — module ↔ remote service

**Request (module → remote/emulator), method `general`:**
```
POST http://emulator.dev:81/mail_service/init-process
Content-Type: application/json
X-Api-Key: <api_key of the spec>
X-Signature: <hex hmac-sha256 of the body below, using the secret_key of the spec>

{"request_id": "123344", "service": "general", "to": "user@example.com", "text": "Hello", "callback_url": "http://demo.dev/mail_service/v1/callback"}
```

**Request, method `process`:** the same with `"request_id": "123345"`, `"service": "process"`.

**Response (`Sending`):** `200 {"id": "ext-1001", "status": "Sending"}` → mapped `process`.
**Response (`Sended`):** `200 {"id": "ext-1002", "status": "Sended"}` → mapped `success`, process final at once.
**Response (`Fail`):** `200 {"id": "ext-1003", "status": "Fail"}` → mapped `fail`, process final at once.

**Callback (after `Sending`), success:**
```
POST /mail_service/v1/callback
{"id": "ext-1001", "status": "Sended", "created_at": 1700000000, "updated_at": 1700000005}
```
→ `200 {}`; record `status=success`.

**Callback, fail:** `{"id": "ext-1001", "status": "Fail", "created_at": 1700000000, "updated_at": 1700000005}` →
record `status=fail`.

**Callback, still sending:** `{"id": "ext-1001", "status": "Sending", ...}` → record stays `process`.

**Error cases:** remote HTTP error / timeout / malformed body → the module's `doProcess()` throws, record `error`
(500); callback for an unknown id → 404; callback before the init response is saved → 404 (flow.md "Callback
ordering"); callback with a status outside the map → `default_status` = `fail`.

## 9. Emulator requirements

- EMU-1 endpoint: `POST http://emulator.dev:81/mail_service/init-process`, `Content-Type: application/json`.
- EMU-2 request validation: `request_id`, `service`, `to`, `text`, `callback_url` required strings; violation → 422
  with the list of errors (status open, unless the specs define it - not defined here, flag as open).
- EMU-3 signature: `X-Api-Key` must equal the emulator's own copy of `remote_service.signature.api_key`;
  `X-Signature` must equal `hash_hmac('sha256', $rawBody, <secret_key>)`; mismatch → 401 (open - status not
  specified, assumed). The emulator keeps its own copy of the pair (the same static values, read from env
  `MAIL_SERVICE_API_KEY` / `MAIL_SERVICE_SECRET_KEY`).
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
| Sended at once | `Sended` | none needed | `success` |
| Sending → Sended | `Sending` | `Sended` | `process` then `success` |
| Sending → Fail | `Sending` | `Fail` | `process` then `fail` |
| Sending → Sending → Sended | `Sending` | `Sending`, `Sended` | `process`, `process`, then `success` |
| Fail at once | `Fail` | none needed | `fail` |
| Unmapped remote value | e.g. `Unknown` | - | `fail` (`default_status`, assumed) |

## 10. Open points
- The user wrote the name as `mail-service`; a module id is `[a-z][a-z0-9_]*` (a `-` is not allowed in a namespace
  segment), normalized to `mail_service`.
- The author e-mail was written `test@gmail,com`; read as `test@gmail.com`.
- The remote parameter `tetx` was read as `text`; the data parameter `test` ("type text") was read as a string without
  a length limit and is the source of the remote `text`.
- `base_url` `http://emulator.dev:81/init-process` was split into `base_url` `http://emulator.dev:81` and the method
  `path` `/init-process`.
- The static `api_key`/`secret_key` are stored in `module.service.yaml` at the user's explicit request, which differs
  from AGENTS.md (specs hold only env var names, secrets never literal in specs). The generators put the values into
  `.env` / `.env.example` (and `compose.yaml` passes them on), never into code or migrations. Confirm this is
  intended - the values are for the local emulator only.
- `default_status: fail` for both methods is an assumption (not given by the user) - confirm or change.
- `data.user_id` is not forwarded to the remote body (not listed by the user), only kept in `incoming_data`.
- Scenario selection in the emulator (how a test picks Sended / Sending→Sended / Sending→Fail / Fail).
- API authentication (CLAUDE.md).
- Emulator validation/signature-failure HTTP status.
