# Spec 01 - Domain layer (`demo/domain/process/`, `demo/domain/service/`)

Plain PHP 8.3, namespaces `app\domain\process` and `app\domain\service`. **No Yii, no `Yii::`, no ActiveRecord, no
infrastructure** (rule `.claude/rules/ddd-yii2.md`). Every file: `<?php`, blank line, `declare(strict_types=1);`, namespace,
imports; classes `final` (value objects `final readonly`); typed everything; comments only for the non-obvious "why".

Terms follow the ubiquitous language (`docs/architecture/code-design.md` §3). Status rules: `docs/architecture/flow.md` §3.
Two aggregates: **Service** (read-only for the host - services are inserted by module migrations) and **Process**, which
references its service **by id** only (aggregates reference each other by identity).

## Files - `domain/service/`

| File | Kind | Content |
|------|------|---------|
| `InvalidServiceValue.php` | `final class InvalidServiceValue extends \InvalidArgumentException` | constructor `(public readonly string $field, string $message)` |
| `ServiceName.php` | `final readonly class` | the module id that integrates the service. `public const MAX_LENGTH = 64; public const PATTERN = '/^[a-z][a-z0-9_]*$/';` constructor `(public string $value)`: empty → `InvalidServiceValue('service', 'service must not be empty.')`; longer than `MAX_LENGTH` → `'service must be at most 64 characters.'`; not matching `PATTERN` → `'service must be a module id (a-z, 0-9 and _, starting with a letter).'`; `equals(self $other): bool` |
| `ServiceId.php` | `final readonly class` | constructor `(public int $value)`: `< 1` → `InvalidServiceValue('service_id', 'service_id must be a positive integer.')`; `equals(self $other): bool` |
| `Service.php` | `final class Service` (aggregate root) | private constructor `(private readonly ServiceId $id, private readonly ServiceName $name)`; `static restore(ServiceId, ServiceName): self`; getters `id(): ServiceId`, `name(): ServiceName`; nothing else |
| `ServiceNotRegistered.php` | `final class extends \DomainException` | constructor `(ServiceName $name)`, message `No service "<name>" is registered (is the module's service migration applied?).` |
| `ServiceRepository.php` | interface | `findByName(ServiceName $name): ?Service` |

## Files - `domain/process/`

| File | Kind | Content |
|------|------|---------|
| `Status.php` | backed enum `Status: string` | cases `Init = 'init'`, `Success = 'success'`, `Process = 'process'`, `Fail = 'fail'`, `Error = 'error'`; `isMappable(): bool` - true only for `Success`, `Process`, `Fail` (the values a module may map to; `init` and `error` are set only by the host) |
| `InvalidProcessValue.php` | `final class InvalidProcessValue extends \InvalidArgumentException` | private constructor `(public readonly string $field, string $message)`; named constructors `empty(string $field): self` → message `"<field> must not be empty."`, `tooLong(string $field, int $maxLength): self` → `"<field> must be at most <max> characters."` |
| `Text.php` | `final class Text` | `public static function assertValid(string $value, int $maxLength, string $field): void` - `trim($value) === ''` → `InvalidProcessValue::empty($field)`; `mb_strlen($value) > $maxLength` → `InvalidProcessValue::tooLong($field, $maxLength)` (shared validation of the string value objects - DRY) |
| `RequestId.php` | `final readonly class` | `public const MAX_LENGTH = 64;` constructor `(public string $value)` calls `Text::assertValid($value, self::MAX_LENGTH, 'requestId')`; `equals(self $other): bool` |
| `ServiceMethod.php` | `final readonly class` | `MAX_LENGTH = 128`, field name `'service_method'`, same shape as `RequestId` |
| `ExternalId.php` | `final readonly class` | `MAX_LENGTH = 128`, field name `'external_id'`, same shape |
| `DuplicateRequestId.php` | `final class extends \DomainException` | constructor `(RequestId $requestId, ?\Throwable $previous = null)`, message `A process with requestId "<value>" already exists.` |
| `DuplicateExternalId.php` | `final class extends \DomainException` | constructor `(ServiceId $serviceId, ExternalId $externalId, ?\Throwable $previous = null)`, message `Service <id> already has a process with external id "<value>".` |
| `ProcessNotFound.php` | `final class extends \DomainException` | constructor `(ExternalId $externalId)`, message `No process with external id "<value>".` |
| `ProcessRepository.php` | interface | `existsByRequestId(RequestId): bool`; `findByExternalId(ServiceId, ExternalId): ?Process` (external ids are unique **per service**); `findById(int $id): ?Process` (the stored version, e.g. to record an error after a failed save); `save(Process): void` - inserts or updates and records the assigned id and timestamps on the entity; `@throws DuplicateRequestId` when another process has the same request id, `@throws DuplicateExternalId` when another process of the same service has the same external id |
| `Process.php` | `final class Process` (aggregate root) | see below |

## `Process` entity

State (all private; constructor private): `?int $id`, `readonly RequestId $requestId`, `readonly ServiceId $serviceId`,
`readonly ServiceMethod $serviceMethod`, `readonly array $incomingData` (the init request body), `?ExternalId $externalId`,
`Status $status`, `?int $createdAt`, `?int $updatedAt`.

| Method | Behaviour |
|--------|-----------|
| `static start(RequestId, ServiceId, ServiceMethod, array $incomingData): self` | new process: id/externalId/timestamps `null`, status **`Init`** (recorded, the remote service has not answered yet) |
| `static restore(int $id, RequestId, ServiceId, ServiceMethod, array $incomingData, ?ExternalId, Status, int $createdAt, int $updatedAt): self` | rebuilds a stored process (for repositories) |
| `assignExternalId(ExternalId): void` | sets the external id |
| `changeStatus(Status $status): bool` | `!$status->isMappable()` → `\InvalidArgumentException` with message `Status "<value>" is set only by the host.` (`init` via `start()`, `error` via `markError()`); same status → `false`, nothing changes; otherwise sets it and returns `true` - **also after `success`/`fail`/`error`** (the remote service has the last word) |
| `markError(): void` | status `Error` (our own processing failed) |
| `recordPersisted(int $id, int $createdAt, int $updatedAt): void` | for repositories after save; if an id is already set and differs → `\LogicException` (identity never changes); sets id and timestamps |
| getters | `id(): ?int`, `requestId()`, `serviceId(): ServiceId`, `serviceMethod()`, `incomingData(): array`, `externalId(): ?ExternalId`, `status(): Status`, `createdAt(): ?int`, `updatedAt(): ?int` |

No public setters, no other public methods (YAGNI).

## Tests

### `demo/tests/Unit/domain/process/ProcessTest.php`
Namespace `app\tests\Unit\domain\process`, `final class ProcessTest extends \Codeception\Test\Unit`. Cases (helper
`startProcess()` = `Process::start(new RequestId('r-1'), new ServiceId(1), new ServiceMethod('pay'), ['requestId' => 'r-1'])`):
1. a started process: status `Init`, service id 1, no external id, no id, incoming data kept;
2. `changeStatus()` applies a different status (returns true);
3. the same status changes nothing (returns false);
4. a callback status replaces a final one (`Fail` → `Success`);
5. after `markError()` a later `changeStatus(Success)` still applies;
6. `changeStatus(Status::Error)` and `changeStatus(Status::Init)` both throw `InvalidArgumentException`;
7. `assignExternalId()` stores the value;
8. `recordPersisted()` keeps the identity (same id twice is fine, updates `updatedAt`; a different id throws `LogicException`);
9. value objects reject empty values (`new RequestId('  ')` → `InvalidProcessValue`);
10. value objects reject too-long values and name the field (`ServiceMethod` with `MAX_LENGTH + 1` → field `service_method`);
11. only `Success`, `Process`, `Fail` are mappable (`Init` and `Error` are not).

### `demo/tests/Unit/domain/service/ServiceTest.php`
Namespace `app\tests\Unit\domain\service`, `final class ServiceTest extends \Codeception\Test\Unit`. Cases:
1. `ServiceName` accepts module ids (`test`, `pay_v2`, `a_b1`);
2. `ServiceName` rejects empty, too long (`MAX_LENGTH + 1`), and non-module-id values (`Test`, `1abc`, `a b`, `a/b`, `pay-v2`) with field
   `service`;
3. `ServiceId` rejects `0` and `-1` with field `service_id`; accepts `1`;
4. `Service::restore()` keeps id and name; `equals()` of both value objects compares by value.

## Checks (must print nothing)
```bash
grep -rnE 'Yii::|use yii[\]|extends (ActiveRecord|Model|Component|BaseObject)|[\]infrastructure[\]' demo/domain
```
