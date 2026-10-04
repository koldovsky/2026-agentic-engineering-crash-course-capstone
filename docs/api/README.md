# Main API

Documentation of the host API and the conventions every module endpoint follows.

## 1. Base URL

`http://demo.dev` (port 80; requires `127.0.0.1 demo.dev` in the hosts file). The emulator of the remote services is
`http://emulator.dev:81`.

Module endpoints follow `/<module id>/<version>[/<path>]`, e.g. `GET /test/v1`.

## 2. Request body

All requests use one structure (details and flow: [../architecture/flow.md](../architecture/flow.md)):

```json
{"requestId": "123344", "service_method": "method_name", "data": {"param1": 111, "param2": "test"}}
```

All first-level parameters are required; `data` differs per module and `service_method`. Every module has two standard
requests: **init process** and **callback** from the remote service (not for services that send none - they return the
final result in the init response). The init response contains `status`: `success` | `process` | `fail`, our status mapped
from the remote service's own statuses, or `error` when our own processing failed (`init` - recorded, not answered yet -
is stored while the module works and is never the answer of a successful init) (see [flow.md](../architecture/flow.md)
section 3). **TODO** - final URLs and the
full response bodies of both.

## 3. Conventions

- Stateless; no sessions.
- Request bodies: `application/json`.
- Response format by content negotiation (JSON, XML).
- Versioning: one module per major version (`v1`, `v2`), minor versions through the `Accept` header.
- `v1` is not pluralized in URLs (`pluralize => false`).
- CORS is handled by `BaseController` before authentication; `OPTIONS` requests are not authenticated.

## 4. Authentication

**TODO** — method not decided yet (open decision, see CLAUDE.md). Document here: scheme, header, token
issuing/refresh, identity class.

## 5. Errors

Yii2 REST error format: HTTP status with a body describing the error; validation failures return `422`.

**TODO** — document the exact error body once the host is configured.

## 6. Endpoints

### Host endpoints

**TODO** — the host itself exposes no API endpoints yet.

### Module endpoints

| Module | Method | URL | Summary | Status |
|--------|--------|-----|---------|--------|
| _none installed yet_ | | | | |

Standard endpoints of every module (both `POST`, handled by `BaseController`, delegated to `doProcess()` of the module's
`V1Controller`):

| Method | URL | Summary |
|--------|-----|---------|
| POST | `/<module id>/v1/init` | init process: validate, create the record in `process`, module sends the request to the remote service; response `requestId`, `status` |
| POST | `/<module id>/v1/callback` | callback of the remote service: the base finds the record by `external_id` (404 if none), the module maps the callback status (`getCallbackStatus`) and the base saves it; response defined by the module |

Errors of the shared flow: `422` (invalid init body or duplicate `requestId`, errors listed per field), `400` (empty callback body or
no process id), `404` (unknown process id in a callback), `405` (other HTTP verb), `500` with `{"requestId", "status": "error"}`
(the module failed - threw, set a status it may not set, left the process in `init`, or used an external id that another
process of its service already has; the process is saved with status `error`), `500` without a process (the module's service
is not registered in table `service` - its `RegisterService` migration is missing; logged). A callback is matched by the
module's service and the external id; one that arrives before the init answer gets `404`.

## 7. Endpoint template

Copy for each new endpoint:

```markdown
### <METHOD> <path>
Summary:
Auth:
Request — headers / path / query / body:
Responses — status: body:
Errors:
Module:
```
