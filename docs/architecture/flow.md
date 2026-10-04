# Flow

How a request travels through the API, a module, the remote service (emulated in tests) and back.
Technical setup: [technical.md](technical.md).

## 1. Request structure

Every request to the API has the same body:

```json
{"requestId": "123344", "service_method": "method_name", "data": {"param1": 111, "param2": "test"}}
```

| Field | Level | Required | Meaning |
|-------|-------|----------|---------|
| `requestId` | 1 | yes | identifier of the request/process |
| `service_method` | 1 | yes | method to run; selects the module and its action |
| `data` | 1 | yes | payload; content depends on the module and `service_method` |

All first-level parameters are required. The content of `data` is defined per module and method.
The API takes the body and **delegates processing to the module**.

## 1a. Request to the remote service

The body the module sends to the remote service (built from `data` of the init request) always carries one extra field,
added by the module itself, not received from the client:

| Field | Meaning |
|-------|---------|
| `callback_url` | the URL the remote service must call back on - this **module's own** callback endpoint, `http://demo.dev/<module-id>/v1/callback` (emulator tests: `http://demo.dev/<module-id>/v1/callback` unchanged - the emulator calls the API back the same way the real service would) |

This is how the remote service learns where to send its callback; a service without callbacks receives the field too but
ignores it. The value is fixed per module (its own id), never taken from the init request body.

## 1b. Signing a request to the remote service (only for a module whose service requires it)

Decided (CLAUDE.md): `hash_hmac('sha256', $rawJsonBody, $secretKey)` over the exact bytes of the JSON body the module
sends (the same body §1a describes, `callback_url` included), sent as two headers:

| Header | Value |
|--------|-------|
| `X-Api-Key` | `service.api_key` of the module's own `service` row - identifies which key pair signed the request |
| `X-Signature` | the hex-encoded HMAC-SHA256 digest of the raw body, using `service.secret_key` |

The key pair is per-service, stored in `service.api_key` / `service.secret_key` (nullable columns - most modules leave
them unset and send no signature headers at all); a module sets them in its own `RegisterService` migration, sourced
from env vars (never a literal secret in a migration file or a committed spec - `AGENTS.md` "Service registration").
The emulator verifies with its own copy of the same pair (its own env vars, `module.service.md` §2).

## 2. Standard module requests

Both are handled by the shared `BaseController`: it takes the request data, validates it, resolves the **service** from the
URL (the module id, the first segment of `/<module-id>/v1/...`, listed in table `service`), saves the process record and
delegates the data to the abstract `doProcess()` implemented by the module. A module whose service is not listed (its
`RegisterService` migration is missing) makes both requests answer HTTP 500; the misconfiguration is logged and no process
is created or changed.

**Init creates the record first:** on the init request the API stores the process - `request_id`, its service,
`service_method`, the request body and status **`init`** - *before* the module sends anything to the remote service. After
the module has handled the request, the process holds the external id (if the service returned one) and `success`,
`process` or `fail`.

**Rejected requests store nothing:** an init body that is not a JSON object, lacks `requestId` / `service_method` / `data` or
has a wrong type answers HTTP 422 with the errors per field; a repeated `requestId` answers 422 on `requestId`. A callback
body that is empty, not a JSON object or has no process id answers HTTP 400 (errors: `docs/api/README.md`).

Every module implements two standard requests:

1. **Init process** - the module takes the data and sends a request to the remote service; the body of the service
   request is built from the data received in the init request. The **init response contains `status`** - our process
   status (section 3) mapped from the remote response.
2. **Callback from the remote service** - the service sends the result of the process (completed or error). Only for
   services that send callbacks.

**Services without callbacks:** some services do not send callbacks and return the **final result in the response** to
the module's request. For them the mapped status of that response is already final (`success` or `fail`), returned in the
init response, and the process record is final at once. Whether a service method has a callback is defined per method by
the module.

## 3. Statuses

Remote services use their own statuses, possibly complex (several values, codes, nested fields, different for the init
response and the callback). On our side every remote status is **mapped to one of three process statuses**, the same for
all modules; two more statuses, `init` and `error`, are set only by the API itself:

| Status | Set by | Meaning |
|--------|--------|---------|
| `init` | the API | the process is recorded (on the init request, before the module calls the remote service); the remote service has not answered yet. Not a final answer: after the module has handled init, the process is `success`, `process` or `fail` (or `error`) |
| `success` | module mapping | the process finished successfully |
| `process` | module mapping | the process is accepted and still running; a callback (or a later request) is expected |
| `fail` | module mapping | the remote service reported a failure |
| `error` | the API | our own processing failed: the module's `doProcess()` threw an exception (on init or on callback) |

The mapping is defined per service method by the module (remote values -> `success`/`process`/`fail`, with a default for
unlisted values), separately for the remote response and for the callback. A module never returns `init` or `error`; a
module that leaves a process in `init` after handling the init request is treated like a failed module (`error`, HTTP 500).

**Status changes:**
- **Callback:** the status from the callback is always applied when it differs from the current one - also when the current
  status is `success`, `fail` or `error` (the remote service has the last word). The same status again changes nothing.
- **Exception in `doProcess()`:** the API sets the status to `error`, saves the record, logs the exception and answers
  HTTP 500 with `{"requestId", "status": "error"}`. A later callback can still change the status.

## 4. Process table

The API has a database table with the process progress.
- On the **init request** the API creates a record with `service_id`, `request_id`, `service_method`, `incoming_data` (the
  request body) and `status` = `init`, before the remote call. When the service answers, the API stores the service's process
  id as `external_id` and the mapped `status`.
- On the **callback** the API finds the record by its **service and** `external_id` and updates `status` (mapped from the
  callback) if it differs.
- If the module fails (an exception, a status it may not set, a process left in `init`, or an external id that another
  process of the service already has), the API stores `status` = `error`.

Table `service`: `id`, `name` (unique - the module id), `created_at`, `updated_at`; one row per module, inserted by the
module's `RegisterService` migration. Table `process`: `id`, `service_id` (→ `service`), `request_id` (unique across all
services), `service_method`, `external_id` (**unique per service** - two services may use the same id), `incoming_data`,
`status`, `created_at`, `updated_at`. The emulator keeps `emulator_process`: `id`, `service_method`, `process_id`, `status`, `created_at`, `updated_at`. The `process_id` of the emulator is returned in its response and callback and is stored by the API as `external_id`; the module knows where it is in the body (`getExternalId()`).

## 5. Sequence (production)

With a callback:

```text
client --POST /<module>/v1/init(body)--> API --resolve service, create record (status init)--> process table
                        \--> module --service request--> remote service --response (process id)--> module
                        <-- init response {requestId, status: process} (mapped), record: external_id + status
remote service --callback(result | error)--> API --find by service + external_id, map status, update--> process table
```

**Callback ordering:** a remote service's callback comes **after** the API has answered the init request of that process -
only then is its external id stored. A callback that arrives earlier (the process is still `init`) is not matched: the API
answers HTTP 404 and the process is unchanged.

Without a callback:

```text
client --init(body)--> API --resolve service, create record (status init)--> process table
                        \--> module --service request--> remote service --response (final result)--> module
                        <-- init response {requestId, status: success | fail} (mapped), record final
```

## 6. Sequence (testing with the emulator)

The module sends its service request to the emulator instead of the remote service:

1. The emulator **checks the signature** of the request and the **body parameters**.
2. It **generates and saves process data** in the database.
3. It **returns the response** to the API (with the remote status; for a service without callbacks this is the final result).
4. If the service method has a callback, it then **schedules** a callback (§6a) instead of sending one inline - it still
   reaches the API only **after** the response (callback ordering, section 5), now by construction: the schedule is a
   fixed delay, never shorter than the time the response takes to return.

```text
API/module --service request--> emulator (check sign + params, save process data) --response--> API/module
emulator --schedule callback (delay 5s)--> RabbitMQ --after 5s--> emulator-queue-worker --callback(changed status)--> API --update status--> process table
```

## 6a. Delayed callback (RabbitMQ)

The emulator never sends a callback synchronously from the request that produced it - every callback is scheduled with a
fixed **5-second delay**, published on the init request's own transaction and delivered by a separate consumer, so the
emulator's HTTP response is never blocked by it and the ordering rule above holds automatically.

- **Delay mechanism:** TTL + dead-letter exchange (no RabbitMQ plugin) - confirmed working end-to-end. This is
  `yii\queue\amqp_interop\Queue`'s own default: `open()` sets `Enqueue\AmqpTools\RabbitMqDlxDelayStrategy`
  automatically, and `setupBroker()` declares the delay/ready queue topology itself on first push/listen - no manual
  exchange/queue declaration, no plugin. `RABBITMQ_*` env (`docs/architecture/technical.md` §3).
- **Publisher:** the emulator's use case that handled the init request publishes the scheduled callback (module id,
  service method, process id, the callback body per `module.service.yaml` → `callback`) as part of handling that
  request - `enqueue/amqp-lib` under `yiisoft/yii2-queue`'s AMQP-interop driver (`generate-emulator` Part B).
- **Consumer:** the `emulator-queue-worker` Compose service runs `php yii queue/listen --verbose` continuously in
  `/app/emulator`, separate from the request-serving containers; on each delivered message it builds the callback body
  and POSTs it to the `callback_url` carried in the original init request (flow.md §1a) - never a configured URL.
- **New status:** "new status" in the delayed callback is whatever the module's `module.service.yaml` →
  `service_methods[].callback.status_map` would have produced at once - the delay only changes *when* the callback
  arrives, never what it contains.
- **Testing implication:** an `[e2e]` test that exercises a callback now waits at least 5 seconds for it (or asserts on
  the queued message directly, skipping the worker) - update `module.tests.md`'s callback rows accordingly
  (`create-module` template).

## 7. Test scenarios

Testing must cover **all results, success and fail**, for every module: valid request -> `success`; each
validation/sign failure -> error response; remote-side error -> `fail`; for services with a callback also the `process`
init response followed by a success callback and by a fail callback; every remote status the module maps is mapped to the
expected status; a callback with a different status after a final one (`success`/`fail`/`error`) changes it, the same status
changes nothing; an exception in `doProcess()` (init and callback) saves `error` and answers 500; the process is stored with
`init` before the module runs, and a module leaving it in `init` gives `error` + 500; the same external id in two services
reaches each service's own process, a duplicate within one service gives `error` + 500; a callback of another service or
before the init answer gets 404; a module whose service is not registered answers 500 and stores nothing.

**TODO** - scenario list per module; how the emulator is told to answer with success or failure.

## 8. Open items (TODO)

- Signature algorithm and key handling.
- State transitions of the process (e.g. may `success` be overwritten by a late callback?).
- Response format of the callback request of the API.
- Retries/timeouts if a callback never arrives.
