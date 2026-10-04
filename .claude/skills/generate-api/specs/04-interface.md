# Spec 04 - Interface layer (`demo/controllers/BaseController.php`)

The delivery edge: HTTP ↔ application. Namespace `app\controllers`. May use Yii, the application service and domain value
objects; **never infrastructure classes**. Translates domain exceptions to HTTP - the only place that does. Contract with
modules: `AGENTS.md` "Module architecture" rule 3; flow and statuses: `docs/architecture/flow.md`; errors: `docs/api/README.md`.

## `abstract class BaseController extends yii\rest\Controller`

Class docblock: parent of every module controller - the two standard requests of the flow; a module controller implements only
`doProcess()`, `getExternalId()` and `getCallbackStatus()`.

### Behaviors and verbs
- `behaviors(): array`: take `parent::behaviors()`; set `$behaviors['authenticator']['except'] = ['options']`;
  `unset($behaviors['rateLimiter'])` (comment: rate limiting works per user identity; there is none until the authentication
  method is decided - without this every request fails with 500); return `['corsFilter' => ['class' => Cors::class]] +
  $behaviors` (comment: CORS runs before authentication, so pre-flight OPTIONS requests are never authenticated). No
  authenticator methods (authentication is an open decision).
- `protected function verbs(): array` → `['init' => ['POST'], 'callback' => ['POST']]` (other verbs → 405).

### Service of the request
The service is the module: `serviceName()` = `new ServiceName($this->module->id)` (the first URI segment of
`/<module-id>/v1/init`, by the module's bootstrap URL rule). `ServiceNotRegistered` (no row in `service` - the module's
service migration is missing) or `InvalidServiceValue` (module id is not a valid service name) → private
`serviceMisconfigured(Throwable)`: `Yii::error($e, __METHOD__)`, then `throw new ServerErrorHttpException($e->getMessage())`
(HTTP 500); no process is created or changed.

### `actionInit(ProcessService $processes): array`
Docblock `@return array<int|string, mixed>` (the result, or the 422 error list) so PHPStan level 5 passes (docs/architecture/static-analysis.md).
`ProcessService` by action-parameter injection (it must be registered in the container - spec 03).
1. `$body = $this->request->getBodyParams()`. Not an array (Yii's `JsonParser` returns a JSON scalar as is, e.g. `"x"`) →
   `unprocessable(['body' => 'The request body must be a JSON object.'])`.
2. Validate, collecting **all** field errors: `requestId` and `service_method` via private `valueFromBody()` (missing or not a
   string → `"<field> is required and must be a string."`; value-object error → its message); `data` missing or not an array →
   `'data is required and must be an object.'`. Any error → `unprocessable($errors)` (validation needs no database, so it
   comes before the service is resolved).
3. `$processes->start($this->serviceName(), $requestId, $serviceMethod, $body)` - the process is stored with status `init`
   **before** the module runs; `ServiceNotRegistered` / `InvalidServiceValue` → `serviceMisconfigured()`;
   `DuplicateRequestId` → `unprocessable(['requestId' => message])`.
4. In one `try`: `$result = $this->doProcess('init', $process, $body['data'])`; if the process is still `Status::Init` →
   `throw new UnexpectedValueException('doProcess() left the process in "init"; it must set success, process or fail.')`;
   if it is `Status::Error` (the module called `markError()`) → `throw new UnexpectedValueException('doProcess() set the status "error"; it must set success, process or fail.')`;
   `$processes->save($process)` (inside the `try`: a `DuplicateExternalId` on save takes the error path too). Any
   `Throwable` → `failWithError(...)`.
5. Return `array_merge($result, ['requestId' => ..., 'status' => ...])` (the module cannot override these two keys).

### `actionCallback(ProcessService $processes): array`
1. Body not an array → `BadRequestHttpException('The callback body must be a JSON object.')`; body empty →
   `BadRequestHttpException('The callback body is empty.')`.
2. `new ExternalId($this->getExternalId($body))`; `InvalidProcessValue` → `BadRequestHttpException('The callback body has no
   process id.')`.
3. `$processes->getByExternalId($this->serviceName(), $externalId)` - scoped to this module's service;
   `ServiceNotRegistered` / `InvalidServiceValue` → `serviceMisconfigured()`; `ProcessNotFound` →
   `NotFoundHttpException(message)` (also for a callback that arrives before the init answer stored the external id).
4. In one `try`: `$process->changeStatus($this->callbackStatus($body))`, `$result = $this->doProcess('callback', $process,
   $body)`, `$processes->save($process)`; any `Throwable` → `failWithError(...)`.
5. Return `$result`.

### Abstract methods (exact signatures, with docblocks)
- `abstract protected function doProcess(string $type, Process $process, array $data): array;` - `$type` `init`|`callback`;
  `$data` = init: the `data` of the body, callback: the whole body; the module applies results through the entity methods;
  returns the response body (on init merged with `requestId` and `status`).
- `abstract protected function getExternalId(array $data): string;` - the remote service's process id in a callback body.
- `abstract protected function getCallbackStatus(array $data): string;` - `success`, `process` or `fail` (never `error`).

`Process` here is the domain entity `app\domain\process\Process`, not ActiveRecord.

### Private helpers
- `callbackStatus(array $data): Status` - `Status::tryFrom(getCallbackStatus())`; null or not mappable →
  `UnexpectedValueException("getCallbackStatus() returned \"<value>\"; allowed: success, process, fail.")`.
- `valueFromBody(array $body, string $field, string $valueClass, array &$errors): RequestId|ServiceMethod|null` (docblock with
  `@template` / `class-string`).
- `unprocessable(array $errors): array` - status 422; returns `[['field' => ..., 'message' => ...], ...]` (Yii's REST format).
- `failWithError(ProcessService, Process, Throwable): array` - `Yii::error($e, __METHOD__)` **first** (comment: if saving fails
  too, the module's exception must not be lost), then `$processes->recordError($process)` (marks `error` and saves; drops a
  duplicate external id - spec 02), status 500, returns `['requestId' => ..., 'status' => 'error']`.
- `serviceName(): ServiceName` and `serviceMisconfigured(Throwable): never` - see "Service of the request".

## Tests - `demo/tests/Unit/controllers/BaseControllerTest.php`

Namespace `app\tests\Unit\controllers`, `final class BaseControllerTest extends \Codeception\Test\Unit`; no database:
- `_before()`: in-memory fakes (anonymous classes built at run time): a **process repository** with an extra
  `get(RequestId): Process` whose `save()` calls `recordPersisted()` and then stores a **snapshot** `clone $process` (like a
  database - so "stored" assertions fail if the controller forgets `save()`), throws `DuplicateExternalId` (storing nothing)
  when another stored process of the same service has the same external id, and supports `findById()`; a **service
  repository** knowing `test` (id 1) and `other` (id 2). Registered with `Yii::$container->setSingleton(...)` for
  `ProcessRepository`, `ServiceRepository` and `ProcessService::class => ProcessService::class`;
  `$_SERVER['REQUEST_METHOD'] = 'POST'`. `_after()`: `Yii::$container->clear(...)` all three.
- Stub module controller: anonymous class extending `BaseController`, constructor `($id, $module, Closure $handler, string
  $status, $config = [])` → `parent::__construct($id, $module, $config)`; the module is a `new \yii\base\Module('<service>',
  Yii::$app)` (`test` by default) so `$this->module->id` names the service; `doProcess` calls the closure (default: set
  `Status::Process` on init, return `['type' => $type]`), `getExternalId` returns `(string) ($data['pid'] ?? '')`,
  `getCallbackStatus` returns the fixed status.
- Helper `send(BaseController, string $action, mixed $body)` (not `run()` - final in PHPUnit; `mixed` to send non-object
  bodies): clears the response, sets the body params, `runAction()`.

Cases (19):
1. init 200 with merged module keys, stored external id and status;
2. the process is stored with status `init` and the service's id **before** `doProcess()` runs (checked inside the closure);
3. invalid body → 422 with the fields `requestId`, `service_method`, `data`;
4. init with a non-object body (`'x'`) → 422 on field `body`;
5. duplicate `requestId` → 422 on `requestId`;
6. unknown service on init (module `unknown`) → `ServerErrorHttpException`, nothing stored;
7. exception in `doProcess` on init → 500 `{requestId, status: error}` and stored `Error`;
8. a module setting `Error` on init → 500 and stored `Error`;
9. a module leaving the process in `init` → 500 and stored `Error`;
10. the same external id in `test` and `other` → both stored, each process keeps its own;
11. a duplicate external id within one service → 500, stored `Error` without the duplicate external id;
12. callback `fail` then `success` → both applied;
13. callback status `error` → 500 and stored `Error`;
14. callback of `other` with an external id of `test` → `NotFoundHttpException`, the `test` process unchanged;
15. callback before the init answer (process stored in `init`, no external id yet) → `NotFoundHttpException`;
16. unknown service on callback → `ServerErrorHttpException`;
17. unknown process → `NotFoundHttpException`;
18. body without process id and empty body → `BadRequestHttpException`;
19. callback with a non-object body (`5`) → `BadRequestHttpException`.

## Checks
- Controllers never import infrastructure (must print nothing): `grep -rn '[\]infrastructure[\]' demo/controllers`
- HTTP smoke test: `http://demo.dev/` answers 404 from Yii, not 500.
