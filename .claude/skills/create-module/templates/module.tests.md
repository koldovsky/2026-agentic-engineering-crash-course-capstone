# Spec: module test checklist (`module.tests.md`) — rules and template

| | |
|---|---|
| What it is | requirements and template for `development/<name>/specs/module.tests.md`, written by `create-module` |
| Generated from | `module.yaml`, `module.service.yaml` and `module.service.md` |
| Purpose | the plan for **future testing** of the module (with the emulator): a checkbox for every request and for the flow of every status and error. A to-do list, not a report: all boxes start unchecked (`- [ ]`) |
| Readers | the user; the agents generating automated tests; the reviewer who ticks the boxes |

## 1. Rules for the generated document

1. **Checkboxes only for testable statements**: `- [ ] <ID> <what is done> → <expected result>`. IDs stable and unique
   (`<GROUP>-<nn>`, e.g. `INIT-03`, `FLOW-S1-02`); expected results concrete (HTTP status, body key, record status).
2. **Derived from the specs, not invented.** Every request, every service method, every status of every `status_map` and
   every error class of the shared flow gets at least one row. A test needing undefined behaviour (`module.service.md`
   §10) is generated as `- [ ] ... → (expected result open: <point>)`.
3. **Matrix for the flow**: for every service method, every remote-response status × the callbacks that can follow
   (`Processing → Complete`, `Processing → Fail`, `Processing → Processing → Complete`), plus one row for a value
   outside the map (`default_status`). A method without callback gets only the response outcomes.
4. **Every row names what to verify**: the API response, the `process` record (`request_id`, `service_id`,
   `service_method`, `external_id`, `status`), and, where the emulator takes part, its own process record.
5. **Level tag**: `[unit]` (a class/method in isolation), `[api]` (HTTP request to the API with the emulator), `[e2e]`
   (whole flow API → module → emulator → callback → API).
6. All boxes start unchecked; regenerated when the specs change (ticks are lost - keep results elsewhere).
7. Same input → same document (except the date).

## 2. Output

`development/<name>/specs/module.tests.md`, next to the YAML specs and `module.service.md`.

## 3. Document template

````markdown
# Module `<module.name>` — test checklist

| | |
|---|---|
| Module | `<module.name>` (id `<module.id>`) |
| Sources | `module.yaml`, `module.service.yaml`, `module.service.md` |
| Generated | {date} |
| Legend | `[unit]` class in isolation · `[api]` HTTP request to the API with the emulator · `[e2e]` whole flow |

Progress: 0 / {total} checked.

## 0. Preconditions
- [ ] PRE-01 stack is up (`docker-build`), API `http://demo.dev` and emulator `http://emulator.dev:81` answer
- [ ] PRE-02 `service` lists `<module.id>` (RegisterService migration applied) in `demo/`; extra tables migrated in both apps if any
- [ ] PRE-03 the emulator module implements the requirements EMU-1 … of `module.service.md` §9
- [ ] PRE-03b `rabbitmq` is healthy and `emulator-queue-worker` is running (`docker compose ps`) - required for any callback test
- [ ] PRE-04 database is in a known state (test rows removed between runs)

## 1. Module wiring
- [ ] WIRE-01 [unit] `Module::bootstrap()` registers the URL rules `POST /<id>/v1/init`, `POST /<id>/v1/callback` → both resolve
- [ ] WIRE-02 [unit] `GET /<id>/v1/init`, `POST /<id>/v1`, unknown path → no route (404)
- [ ] WIRE-03 [unit] console `migrationNamespaces` includes `app\modules\<id>\migrations`; `migrate` creates {RegisterService row / extra tables}; `migrate/down` reverses them
- [ ] WIRE-04 [unit] `V1Controller` implements `doProcess()`, `getExternalId()`, `getCallbackStatus()` only (no `behaviors()`/`verbs()`/`actionInit()`/`actionCallback()` overrides)

## 2. Request `POST /<id>/v1/init` (validation, shared `BaseController` rules)
{One row per rule: body `{}` → 422 errors on requestId/service_method/data; each missing first-level key; `data` not an
object → 422; `requestId` too long → 422; duplicate `requestId` → 422 and no second record; unknown `service_method` →
(expected result open unless the module defines it); wrong verb GET/PUT → 405; unregistered service → 500 and
nothing stored; valid request → 200 + `process` record with `status: init` then the mapped status. **Each init
`data` parameter of each method (missing, wrong type, too long) → 500/`error`, not 422**: `BaseController` validates
only the top-level shape (`requestId`/`service_method`/`data`-is-an-object, rows above); a module's own validation of
individual `data` fields happens inside its `doProcess()`, which has no per-field 422 path - a thrown validation
exception there is a generic `doProcess()` failure to the host (AGENTS.md rule 3: throws → `error`/500), the same as
any other module failure. Confirmed live, not assumed - `development/test/test/test_1790877025.md`,
`development/complete/demo/test/init-validation-422-vs-500-contract-mismatch.md`.}

## 3. Request `POST /<id>/v1/callback`
{Rows: empty body → 400; body without the process id → 400; unknown process id (service+external_id) → 404, no record
changed; callback before the init response is saved → 404 (flow.md "Callback ordering"); each callback parameter of
each method: missing/wrong type → expected result; wrong verb → 405; valid callback → 200 + record updated.}

## 4. Request module → remote service (per method)
{One block per method: the request has exactly the body of `module.service.md` §6 - each parameter and its source -
plus the fixed `callback_url` (`http://demo.dev/<id>/v1/callback`); the `Content-Type`; the URL from `remote_service`;
signature only if enabled; the response is read: `external_id_param` stored as `external_id`, `status_param` mapped.}

## 5. Flow by statuses (per method)
{One block `### <method>`, a checkbox per scenario of `module.service.md` §9.1:}
- [ ] FLOW-<Mn>-01 [e2e] init → remote `<status>` (no callback) → API 200 `{requestId, status: <ours>}`; record `<ours>`; process final
- [ ] FLOW-<Mn>-02 [e2e] init → remote `Processing` → API `status: process`; callback `Complete` → record `success`
- [ ] FLOW-<Mn>-03 [e2e] init → remote `Processing` → callback `Fail` → record `fail`
- [ ] FLOW-<Mn>-04 [e2e] init → remote `Processing` → callback `Processing` → callback `Complete` → record `success`
- [ ] FLOW-<Mn>-05 [e2e] init → remote `Fail` at once → API `status: fail`; no callback needed
- [ ] FLOW-<Mn>-06 [api] remote status outside the map → record `<default_status>`
- [ ] FLOW-<Mn>-07 [api] callback status outside the map → record `<default_status>`
- [ ] FLOW-<Mn>-08 [api] `external_id` is saved from the remote response and used (with `service_id`) to find the record of the callback
- [ ] FLOW-<Mn>-09 [api] `created_at`/`updated_at` of the record are set on init and refreshed on the callback
{One row per (remote status × callback sequence) actually possible per the YAML; drop rows the YAML excludes.}

## 6. Errors and failure modes
{Rows: remote HTTP error (4xx/5xx) → `doProcess()` throws → record `error` and the client gets 500 (AGENTS.md); remote
timeout; malformed/empty remote body; remote response without the id/status parameter; a status the module may not
return (`init`/`error`) reported by mistake → base saves `error`; two callbacks in a row; invalid mapped status → 500
and the stored status unchanged.}

## 7. Emulator checks
{One row per `EMU-n` of `module.service.md` §9: rejects an invalid request; creates its own process record with a
unique `process_id`; returns the response of the scenario; schedules the callback with a 5-second RabbitMQ delay
(TTL + dead-letter exchange) instead of sending it inline; `emulator-queue-worker` sends it to the `callback_url` it
received, with `callback.params`, only after the delay; updates its own status before sending; never repeats a
`process_id`; a callback row's expected timing is "≥5s after the init response", not immediate.}

## 8. Cross-cutting
- [ ] X-01 [api] CORS preflight `OPTIONS` on both endpoints is not rejected (BaseController adds CORS before the authenticator)
- [ ] X-02 [api] authentication behaves as decided (CLAUDE.md open decisions) — (expected result open until decided)
- [ ] X-03 [api] `Accept: application/json` → JSON body
- [ ] X-04 [api] the response of every request is valid JSON with the keys of `module.service.md` §7/§8
````

## 4. Acceptance criteria (testable, on a generated document)

| # | Check |
|---|-------|
| T1 | sections 0-8 exist in this order; every checkbox matches `- [ ] <ID> ...` (unchecked); IDs unique |
| T2 | every request of `module.yaml` has rows (init: §2, callback: §3); every service method has blocks in §4 and §5 |
| T3 | for every `status_map` value (response and callback) there is a row that reaches it; every status sequence of §1 rule 3 is present; unmapped-value rows exist when `default_status` is set |
| T4 | every error class of the shared flow (422, 400, 404, 405, 500) has a row |
| T5 | every row has an expected result; rows depending on undefined behaviour say `(expected result open: ...)` |
| T6 | `Progress: 0 / N` equals the number of checkbox lines |
| T7 | no row mentions a parameter, status or URL that is not in the specs (plus the fixed `callback_url`) |
| T8 | a method without `callback` has no callback rows; a method with a callback has both response-only and callback sequences |
