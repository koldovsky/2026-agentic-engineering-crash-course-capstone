# Spec: module service document (`module.service.md`) — rules and template

| | |
|---|---|
| What it is | requirements for `development/<name>/specs/module.service.md`, written by `create-module` for every module, and the document template (§3) |
| Generated from | `module.yaml` (module, requests, migrations) and `module.service.yaml` (remote service, service methods, mapping) |
| Readers | (1) the user - documentation of the module and its service; (2) `generate-emulator` Part B - **specification for the emulated service**; (3) `generate-module` implementing `doProcess()` / `getExternalId()` / `getCallbackStatus()` |
| Companion | `module.tests.md` (template `module.tests.md`) - the test checklist derived from the same YAML |
| Flow | `docs/architecture/flow.md`; callback URL is decided (§1a): the module always adds `callback_url` to its remote request |

## 1. Rules for the generated document

1. **Only facts from the YAML specs and the project docs.** Every name, URL, parameter, status and mapping comes from
   `module.yaml` / `module.service.yaml`, or from `docs/architecture/flow.md` / `AGENTS.md` "Module architecture" for the
   shared behaviour. Nothing about the remote service is invented; anything the specs leave open goes into §10 ("Open
   points"), never guessed silently.
2. **Examples are derived, not invented.** A value in an example JSON comes from, in order: the parameter's `example` →
   its `default` → a type sample (`string` → `"string"`, `integer` → `1`, `number` → `1.5`, `boolean` → `true`, `array`
   → `[]`, `object` → `{}`), staying within any `max` length. Values that must be consistent are identical everywhere:
   the same `requestId`, the same process id, the same timestamps within one scenario.
3. **One example per scenario**, not per field: every service method × every distinct outcome (each mapped status of
   the remote response, each callback status, each error class of `docs/api/README.md`). Examples show the **complete**
   request (method, URL, headers, body) and **complete** response, and, for the module, the `process` record after it
   (`request_id`, `service_id`, `service_method`, `external_id`, `status`).
4. **Both directions.** For each method: (a) user/client ↔ API, (b) module ↔ remote service (init), (c) remote service →
   API (callback) and the API's answer.
5. **Emulator requirements are explicit and testable** (§3 section 9): every rule `generate-emulator` Part B must
   implement is a numbered requirement (`EMU-n`) with input, behaviour, output.
6. **Mappings as tables**: init `data` → remote body (`from`/`value`, plus the fixed `callback_url`), remote status → our
   status (`status_map`, `default_status`), remote response → `external_id`.
7. Regenerated whenever the YAML specs change; no hand-written state. Same input → same document (except the date).
8. Language: English, as the project docs; JSON keys/values exactly as in the specs.

## 2. Inputs used

| Document part | Source |
|---|---|
| module name, id, author | `module.yaml` → `module` |
| API URLs of `init`/`callback` and their parameters/responses | `module.yaml` → `requests[]` |
| extra tables of the module (if any) | `module.yaml` → `migrations.extra_tables` (informational) |
| remote service URL, emulator URL, signing | `module.service.yaml` → `remote_service` |
| service methods, `data`, remote request mapping, remote response, status maps, callback | `module.service.yaml` → `service_methods[]` |

## 3. Document template

`<...>` = values from the YAML; `{...}` = rules for the generator; everything else is fixed text.

````markdown
# Module `<module.name>` — service document

| | |
|---|---|
| Module | `<module.name>` (id `<module.id>`) — <module.description> |
| Author | <author.name> <<author.email>> |
| Specs | `module.yaml`, `module.service.yaml` (source of this document) |
| Generated | {date of generation} |

## 1. Summary
{3-6 sentences: what the module does, its API endpoints, the remote service URL, which methods send callbacks and which
do not.}

## 2. Actors and URLs
| Actor | URL | Role |
|-------|-----|------|
| API (host) | `http://demo.dev` | receives the client requests and the callbacks |
| Module endpoints | `POST /<module.id>/v1/init`, `POST /<module.id>/v1/callback` | (`module.yaml` → `requests`) |
| Remote service | `<remote_service.base_url>` | the real service |
| Emulator | `<remote_service.emulator_url>/<module.id>/...` | plays the remote service in tests (`emulator/modules/<module.id>`) |
| Signature | `<signature.enabled>` | {"requests are not signed" / "requests are signed, algorithm undecided (CLAUDE.md)"} |
| Callback URL | `http://demo.dev/<module.id>/v1/callback` | sent as `callback_url` in every request to the remote service (flow.md §1a) - fixed, not user-configurable |

## 3. Flow
{One subsection per service method: title `### <method name>`; a text sequence diagram; then a numbered list of steps.
The diagram is one of the two forms of `docs/architecture/flow.md` §5: with callback / without callback. Include
`callback_url` in the module → remote service request line.}

```text
client --POST /<id>/v1/init (requestId, service_method, data)--> API
API: validate, resolve service, create record in `process` (status init)
API --module: POST <url> (<remote body>, callback_url: http://demo.dev/<id>/v1/callback)--> remote service
remote service --response (<external id param>, <status param>)--> module
API: map the remote status, save external_id + status
API --200 (requestId, status)--> client
remote service --POST /<id>/v1/callback (<callback params>)--> API      {only if the method has a callback}
API: find the record by service + external_id, map the callback status, save it
```
{Tell explicitly whether the process is final after the init response (no callback) or later (callback).}

## 4. Service methods
| Method | Remote request | Callback | Data parameters |
|--------|----------------|----------|-----------------|
{one row per method}

## 5. Status mapping
{One table per method and per place (remote response, callback): `Remote value | Our status`, plus the line
`Any other value → <default_status>` (or "no default").}

## 6. Data mapping (init request → remote request)
{One table per method: `Remote parameter | Type | Source (from / value / fixed) | Value in the example`, `callback_url`
always listed as `fixed`. Then the list of init `data` parameters that are **not** sent to the remote service (kept only
in `incoming_data`).}

## 7. Examples — user ↔ API
{For every method: (a) a valid init request/response for each outcome of the remote response, (b) each error of the
shared flow (422 invalid body, 422 duplicate `requestId`, 500 unregistered service, 405 wrong verb). Each example:
request (method, URL, headers, JSON body), response (status, JSON body) and the `process` record after it.}

## 8. Examples — module ↔ remote service
{For every method: the request the module sends (URL, method, headers, body from §6 including `callback_url`), and the
remote response for every mapped status and for an unmapped value; the callbacks the remote service sends (one per
callback status), the API's answer, and the `process` record after each. Error cases: remote HTTP error, timeout,
malformed body → the module's `doProcess()` throws, record `error` (AGENTS.md); callback for an unknown id (404, not
matched by service+external_id); callback before the init response is saved (404, flow.md "Callback ordering"); empty
callback body (400); callback with a status outside the map (`default_status`).}

## 9. Emulator requirements
{Numbered requirements `EMU-1 …`, each with **Input**, **Behaviour**, **Output**. At least:
- EMU-1 endpoint: method and URL of the emulator module (`emulator_url` + `/<module.id>/...`), accepted content type.
- EMU-2 request validation: every body parameter of `remote_request.body.params` (plus `callback_url`, required) is
  checked; violation → HTTP 422/400 with the list of errors.
- EMU-3 signature: checked only if `signature.enabled` (otherwise none).
- EMU-4 process record: the emulator creates a row in its own `EmulatorProcess` (`service_method`, `process_id`
  unique, `status`, timestamps - `docs/architecture/technical.md`); `process_id` is what the response returns as the
  external id.
- EMU-5 response: body of `remote_request.response.params` with the process id in `external_id_param` and the status in
  `status_param`; the status value depends on the scenario (§9.1).
- EMU-6 callback (only for methods with a callback): the emulator never POSTs the callback from the request that
  produced it - it schedules it with a **fixed 5-second delay** through RabbitMQ (TTL + dead-letter exchange, no
  plugin; `docs/architecture/flow.md` §6a) and a separate consumer (`emulator-queue-worker`) sends it after the delay,
  to the `callback_url` received in the request (not a fixed configured URL), with `callback.params`; which statuses
  it can send: `callback.results` and the `status_map` values; the emulator updates its own status before sending.
- EMU-7 scenarios (§9.1): how a test selects success / process→success / process→fail / fail-at-once / errors - open
  unless the specs define it (§10).
- EMU-8 idempotency: `process_id` never repeats.}

### 9.1 Scenarios the emulator must be able to produce
| Scenario | Remote response status | Callback(s) | API result |
|----------|------------------------|-------------|------------|
{one row per method × outcome: Complete at once; Processing → Complete; Processing → Fail; Fail at once; error response;
no callback ...}

## 10. Open points
{Everything the specs leave undefined: signature algorithm (CLAUDE.md), how the emulator is told which scenario to play,
API authentication, retries/timeouts, behaviour of a callback after a final status, unmapped remote statuses beyond
`default_status`. The callback URL itself is NOT an open point (decided, flow.md §1a) - do not list it.}
````

## 4. Acceptance criteria (testable, on a generated document)

| # | Check |
|---|-------|
| S1 | sections 1-10 in this order, with module name/id/author/URLs of the YAML |
| S2 | every service method of `module.service.yaml` appears in §3-§9.1; a method without `callback` has no callback examples and says the process is final after the init response |
| S3 | every status of every `status_map` (response and callback) appears in an example, plus one unmapped value when `default_status` exists |
| S4 | every JSON example is valid, uses only parameters of the YAML plus the fixed `callback_url`; values follow §1 rule 2; consistent inside a scenario |
| S5 | every error class of the shared flow (422, 400, 404, 405, 500) has an example |
| S6 | `EMU-1 … EMU-8` exist, refer to YAML values, are testable |
| S7 | nothing about the remote service is invented; every assumption is in §10 |
| S8 | §6 reproduces `from`/`value` of every `remote_request.body.params` item plus the fixed `callback_url`, and lists unused `data` parameters |
| S9 | regenerating from unchanged YAML gives the same document (except the date) |
