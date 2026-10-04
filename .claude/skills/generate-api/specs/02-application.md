# Spec 02 - Application layer (`demo/application/process/`)

Plain PHP 8.3, namespace `app\application\process`. Depends **only on the domain** (`app\domain\process\*`,
`app\domain\service\*`): no Yii, no `Yii::$app`, no ActiveRecord, no HTTP exceptions, no infrastructure. Dependencies through
the constructor (interfaces owned by the domain). File conventions as in spec 01.

## `ProcessService.php` - `final class ProcessService`

Lifecycle of a process as the shared flow of `BaseController` needs it, including resolving the service from its name (the
module id). No business rules of its own (they live in `Process`).

| Member | Behaviour |
|--------|-----------|
| `__construct(private readonly ProcessRepository $processes, private readonly ServiceRepository $services)` | |
| `start(ServiceName $service, RequestId $requestId, ServiceMethod $serviceMethod, array $incomingData): Process` | resolve the service (missing → `ServiceNotRegistered`); `existsByRequestId()` true → `throw new DuplicateRequestId($requestId)`; else `Process::start($requestId, $serviceId, $serviceMethod, $incomingData)` (status `init`), `save()`, return it - the process is stored **before** the module talks to the remote service. `@param array $incomingData the init request body`, `@throws ServiceNotRegistered`, `@throws DuplicateRequestId` |
| `getByExternalId(ServiceName $service, ExternalId $externalId): Process` | resolve the service (missing → `ServiceNotRegistered`); `findByExternalId($serviceId, $externalId)` or `throw new ProcessNotFound($externalId)` (null-coalescing throw). `@throws ServiceNotRegistered`, `@throws ProcessNotFound` |
| `save(Process $process): void` | delegates to the repository (`@throws DuplicateRequestId`, `DuplicateExternalId`) |
| `recordError(Process $process): void` | our own processing failed: `markError()` and `save()`; if that save throws `DuplicateExternalId` (the module assigned an external id another process of the service already has), load the stored version with `findById()`, `markError()` on it and save that instead - the duplicate is dropped, the error is recorded (stored row gone → `RuntimeException "Process <id> no longer exists."`). A process without an id (never stored) is only marked |
| private `serviceId(ServiceName): ServiceId` | `findByName()` → its id, or `throw new ServiceNotRegistered($name)` |

Wiring: `ProcessService` is resolved by the DI container (spec 03 §Wiring) - by action-parameter injection in `BaseController`,
which only resolves **registered** types (`yii2-fundamentals`); its two repository interfaces must be bound as well.

## Tests - `demo/tests/Unit/application/process/ProcessServiceTest.php`

Namespace `app\tests\Unit\application\process`, `final class ProcessServiceTest extends \Codeception\Test\Unit`, with
in-memory fakes created **at run time** by private methods returning anonymous classes (a class declared at file level fails:
`app\` classes autoload only once the test's Yii application exists):
- **process fake:** stores processes in an array keyed by id, assigns `id = count + 1` on first save, calls
  `recordPersisted($id, 100, 100)` and then stores a **snapshot** `clone $process` (like a database: later changes count only
  after the next `save()`); `save()` throws `DuplicateExternalId` - storing nothing - when another stored process has the same
  service id and external id; `findById()` returns the stored snapshot.
- **service fake:** knows `test` (id 1) and `other` (id 2).

Cases:
1. `start()` stores a new process with status `init` and the service's id (id 1, `existsByRequestId` true afterwards);
2. `start()` for an unknown service → `ServiceNotRegistered`, nothing stored;
3. `start()` with the same request id again → `DuplicateRequestId`;
4. `getByExternalId()` finds the process after `assignExternalId()` + `save()` (compare id and request id - the fake returns
   a snapshot, not the same object);
5. `getByExternalId()` is scoped by service: the same external id in `test` and `other` resolves to each service's own
   process, and an external id of `test` asked for under `other` → `ProcessNotFound`;
6. `getByExternalId()` for an unknown service → `ServiceNotRegistered`;
7. `recordError()` stores status `error`;
8. `recordError()` after the module assigned a duplicate external id: status `error` is stored, the stored process keeps no
   (or its previous) external id.

## Checks (must print nothing)
```bash
grep -rnE 'Yii::|use yii[\]|extends (ActiveRecord|Model|Component|BaseObject)|[\]infrastructure[\]' demo/application
```
