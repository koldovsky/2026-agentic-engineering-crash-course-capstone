# Spec 03 - Infrastructure layer (`emulator/infrastructure/persistence/`, migration, wiring)

Yii lives here. Namespace `app\infrastructure\persistence`. ActiveRecord is only a **persistence model**; it never leaves this
layer and holds no business logic (`docs/architecture/ddd-yii2.md` §2.1-2.2). File conventions as in spec 01.

## `EmulatorProcessRecord.php` - `final class EmulatorProcessRecord extends yii\db\ActiveRecord`

- Class docblock: `Persistence model of table `emulator_process`; no business logic (the rules live in
  app\domain\process\EmulatorProcess).` plus `@property` lines: `int $id`, `string $service_method`, `string $process_id`,
  `string $status`, `int $created_at`, `int $updated_at`.
- `tableName(): string` → `'{{%emulator_process}}'`.
- `behaviors(): array` → `[TimestampBehavior::class]`.
- `rules(): array` - storage constraints only, lengths from the value objects:
  `[['service_method', 'process_id', 'status'], 'required']`,
  `['service_method', 'string', 'max' => ServiceMethod::MAX_LENGTH]`, `['process_id', 'string', 'max' => EmulatedProcessId::MAX_LENGTH]`,
  `['status', 'string', 'max' => 32]`.

## `ArEmulatorProcessRepository.php` - `final class ArEmulatorProcessRepository implements EmulatorProcessRepository`

| Method | Behaviour |
|--------|-----------|
| `findByProcessId(EmulatedProcessId)` | `EmulatorProcessRecord::findOne(['process_id' => $v])` (hash format) → `null` or `toDomain()` |
| `save(EmulatorProcess)` | record = new (`id() === null`) or `findOne(['id' => id])` (missing → `RuntimeException "Emulator process <id> no longer exists."`); set `service_method`, `process_id`, `status = status()->value`; `save()` false → `RuntimeException('Emulator process not saved: ' . Json::encode(getFirstErrors()))`; database errors are not caught (a duplicate generated id is practically impossible and would be a real fault); finally `recordPersisted((int) id, (int) created_at, (int) updated_at)` |
| private `toDomain(EmulatorProcessRecord): EmulatorProcess` | `EmulatorProcess::restore(...)` with value objects, `EmulatorStatus::from(status)`, int casts |

## Migration - `emulator/migrations/m<YYMMDD_HHMMSS>_init_emulator_process.php`

Create it with `php yii migrate/create init_emulator_process --interactive=0` inside `php-cli` with `-w /app/emulator`
(**the emulator's** console, whose `migrate` controller writes its history to `emulator_migration` - `init-emulator` §3) -
**only if no migration in `emulator/migrations/` creates `{{%emulator_process}}` yet**; then write its body.

Exception - `emulator_migration` already has a row `m<YYMMDD_HHMMSS>_init_emulator_process` but the file is missing (e.g.
`emulator/` was recreated while the database volume was kept): if `SHOW CREATE TABLE emulator_process` matches the table
below, write the file under **that recorded name** instead of creating a new one; `migrate` then applies nothing. If the
table differs, stop and ask the user. Class docblock:
`Table `emulator_process`: the emulator's own process data (docs/architecture/flow.md §6).` `safeUp()`:

| Column | Definition |
|--------|------------|
| `id` | `primaryKey()` |
| `service_method` | `string(128)->notNull()` |
| `process_id` | `string(128)->notNull()` + **unique** index `idx-emulator_process-process_id` |
| `status` | `string(32)->notNull()` |
| `created_at`, `updated_at` | `integer()->notNull()` |

`safeDown()`: `dropTable('{{%emulator_process}}')`. No ActiveRecord in the migration. The migration keeps the shape of Yii's
`migrate/create` template (no namespace, no `declare(strict_types=1)`, class not `final`, `safeUp()`/`safeDown()` without
return types) - the file conventions of spec 01 do not apply to it.

## Wiring - `emulator/config/web.php` → `container.singletons`

Add (keep the skeleton's mailer entry):
```php
\app\domain\process\EmulatorProcessRepository::class => \app\infrastructure\persistence\ArEmulatorProcessRepository::class,
```
(The first emulated service's controllers/use cases will need it; action-parameter injection resolves only registered types -
`yii2-fundamentals`.)

## Tests
No automated test yet: the repository needs a database (the skeleton's test config points at a test database that does not
exist). Verify by the migration checks below; an integration test is an open item.

## Checks
- `php yii migrate --interactive=0` in `emulator/` applies; `SHOW CREATE TABLE emulator_process` matches the table above (read
  through `docker compose exec mysql`, never print passwords).
- The history row is in **`emulator_migration`**, and the API's `migration` table is unchanged (compare its rows before and
  after).
- ActiveRecord only here (must print nothing):
  `grep -rln "extends ActiveRecord" emulator --include=*.php | grep -v -e "/infrastructure/" -e "/vendor/"`
