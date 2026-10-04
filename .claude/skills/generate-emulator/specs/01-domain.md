# Spec 01 - Domain layer (`emulator/domain/process/`)

Plain PHP 8.3, namespace `app\domain\process` (the emulator is its own Yii application; alias `@app` = `emulator/`). **No
Yii, no `Yii::`, no ActiveRecord, no infrastructure** (rule `.claude/rules/ddd-yii2.md`). Every file: `<?php`, blank line,
`declare(strict_types=1);`, namespace, imports; classes `final` (value objects `final readonly`); typed everything; comments
only for the non-obvious "why". Nothing is shared with `demo/`: the emulator plays the **remote service**, a different bounded
context (`docs/architecture/code-design.md` §4) - similar shapes, own classes.

What the emulator does: `docs/architecture/flow.md` §6 (checks the request, saves its own process data, answers, sends the
callback).

## Files

| File | Kind | Content |
|------|------|---------|
| `EmulatorStatus.php` | backed enum `EmulatorStatus: string` | the **generic lifecycle** of an emulated process: `Success = 'success'`, `Process = 'process'`, `Fail = 'fail'`. It is **not** extended per emulated service: each emulated service, when it arrives, defines its **own remote-status type** (the service's real values, e.g. `PENDING`, `DECLINED`) in its own namespace, so tests exercise the module's mapping of real remote statuses - the emulator speaks the remote service's language, not ours |
| `InvalidEmulatorValue.php` | `final class InvalidEmulatorValue extends \InvalidArgumentException` | private constructor `(public readonly string $field, string $message)`; `empty(string $field): self` → `"<field> must not be empty."`; `tooLong(string $field, int $maxLength): self` → `"<field> must be at most <max> characters."` |
| `Text.php` | `final class Text` | `public static function assertValid(string $value, int $maxLength, string $field): void` - `trim($value) === ''` → `InvalidEmulatorValue::empty($field)`; `mb_strlen($value) > $maxLength` → `InvalidEmulatorValue::tooLong($field, $maxLength)` |
| `ServiceMethod.php` | `final readonly class` | `public const MAX_LENGTH = 128;` constructor `(public string $value)` calls `Text::assertValid($value, self::MAX_LENGTH, 'service_method')`; `equals(self $other): bool` |
| `EmulatedProcessId.php` | `final readonly class` | the emulated service's own process id - the API stores it as its `external_id`. `MAX_LENGTH = 128`, field `'process_id'`, same shape as `ServiceMethod`; plus `public static function generate(): self` → `new self(bin2hex(random_bytes(16)))` (32 hex characters, unique in practice) |
| `EmulatorProcessRepository.php` | interface | `findByProcessId(EmulatedProcessId $processId): ?EmulatorProcess`; `save(EmulatorProcess $process): void` - inserts or updates and records the assigned id and timestamps on the entity |
| `EmulatorProcess.php` | `final class EmulatorProcess` (aggregate root) | see below |

## `EmulatorProcess` entity

State (all private; constructor private): `?int $id`, `readonly ServiceMethod $serviceMethod`, `readonly EmulatedProcessId
$processId`, `EmulatorStatus $status`, `?int $createdAt`, `?int $updatedAt`.

| Method | Behaviour |
|--------|-----------|
| `static open(ServiceMethod $serviceMethod): self` | a new emulated process: `EmulatedProcessId::generate()`, status `Process`, id/timestamps `null` |
| `static restore(int $id, ServiceMethod, EmulatedProcessId, EmulatorStatus, int $createdAt, int $updatedAt): self` | rebuilds a stored process (for repositories) |
| `changeStatus(EmulatorStatus $status): bool` | same status → `false`, nothing changes; otherwise sets it and returns `true` (the emulated service may report any status in any order - that is what tests of the API need) |
| `recordPersisted(int $id, int $createdAt, int $updatedAt): void` | for repositories after save; an already set, different id → `\LogicException` (identity never changes) |
| getters | `id(): ?int`, `serviceMethod(): ServiceMethod`, `processId(): EmulatedProcessId`, `status(): EmulatorStatus`, `createdAt(): ?int`, `updatedAt(): ?int` |

No public setters, no other public methods (YAGNI).

## Tests - `emulator/tests/Unit/domain/process/EmulatorProcessTest.php`

Namespace `app\tests\Unit\domain\process`, `final class EmulatorProcessTest extends \Codeception\Test\Unit`. Helper
`openProcess()` = `EmulatorProcess::open(new ServiceMethod('pay'))`. Cases:
1. an opened process: status `Process`, no id, a process id of 32 hex characters (`/^[0-9a-f]{32}$/`);
2. two opened processes get different process ids;
3. `changeStatus()` applies a different status (true) and the same status changes nothing (false);
4. any status can follow any other (`Success` → `Fail` → `Process`);
5. `recordPersisted()` keeps the identity (same id twice fine; a different id → `LogicException`);
6. value objects reject empty values (`new ServiceMethod(' ')` → `InvalidEmulatorValue`) and too-long values, naming the field
   (`EmulatedProcessId` with `MAX_LENGTH + 1` → field `process_id`).

## Checks (must print nothing)
```bash
grep -rnE 'Yii::|use yii[\]|extends (ActiveRecord|Model|Component|BaseObject)|[\]infrastructure[\]' emulator/domain
```
