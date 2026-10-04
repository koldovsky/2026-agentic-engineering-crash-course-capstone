# Spec 03 - Infrastructure layer (`demo/infrastructure/persistence/`, migrations, wiring)

Yii lives here. Namespace `app\infrastructure\persistence`. ActiveRecord is only a **persistence model** (row DTO); it never
leaves this layer and holds no business logic (`docs/architecture/ddd-yii2.md` §2.1-2.2). File conventions as in spec 01.

## `ServiceRecord.php` - `final class ServiceRecord extends yii\db\ActiveRecord`

- Class docblock: `Persistence model of table `service`; no business logic (the rules live in app\domain\service\Service).`
  plus `@property` lines: `int $id`, `string $name`, `int $created_at`, `int $updated_at`.
- `tableName(): string` → `'{{%service}}'`; `behaviors(): array` → `[TimestampBehavior::class]`.
- `rules(): array` → `[['name', 'required'], ['name', 'string', 'max' => ServiceName::MAX_LENGTH]]`.

## `ArServiceRepository.php` - `final class ArServiceRepository implements ServiceRepository`

| Method | Behaviour |
|--------|-----------|
| `findByName(ServiceName)` | `ServiceRecord::findOne(['name' => $v])` (hash format) → `null` or `Service::restore(new ServiceId((int) id), new ServiceName(name))` |

Read-only: the host never inserts services (module migrations do).

## `ProcessRecord.php` - `final class ProcessRecord extends yii\db\ActiveRecord`

- Class docblock: `Persistence model of table `process`; no business logic (the rules live in app\domain\process\Process).`
  plus `@property` lines: `int $id`, `int $service_id`, `string $request_id`, `string $service_method`,
  `string|null $external_id`, `string $incoming_data JSON`, `string $status`, `int $created_at`, `int $updated_at`.
- `tableName(): string` → `'{{%process}}'`.
- `behaviors(): array` → `[TimestampBehavior::class]` (fills `created_at` / `updated_at` with Unix time).
- `rules(): array` - storage constraints only, lengths from the value objects (DRY):
  `[['service_id', 'request_id', 'service_method', 'incoming_data', 'status'], 'required']`, `['service_id', 'integer']`,
  `['request_id', 'string', 'max' => RequestId::MAX_LENGTH]`, `['service_method', 'string', 'max' => ServiceMethod::MAX_LENGTH]`,
  `['external_id', 'string', 'max' => ExternalId::MAX_LENGTH]`, `['incoming_data', 'string']`, `['status', 'string', 'max' => 16]`.

## `ArProcessRepository.php` - `final class ArProcessRepository implements ProcessRepository`

| Method | Behaviour |
|--------|-----------|
| `existsByRequestId(RequestId)` | `ProcessRecord::find()->where(['request_id' => $v])->exists()` (hash format = bound parameters) |
| `findByExternalId(ServiceId, ExternalId)` | `ProcessRecord::findOne(['service_id' => $sid, 'external_id' => $v])` → `null` or `toDomain()` |
| `findById(int $id)` | `ProcessRecord::findOne(['id' => $id])` → `null` or `toDomain()` |
| `save(Process)` | record = new (`id() === null`) or `findOne(['id' => id])` (missing → `RuntimeException "Process <id> no longer exists."`); set `service_id = serviceId()->value`, `request_id`, `service_method`, `incoming_data = Json::encode(incomingData())`, `external_id = externalId()?->value`, `status = status()->value`; remember `$isInsert = $record->getIsNewRecord()`; `save()` false → `RuntimeException('Process not saved: ' . Json::encode(getFirstErrors()))`; on `yii\db\IntegrityException` (comment: the unique indexes close the race between a check and the write): `$isInsert && existsByRequestId(...)` → `DuplicateRequestId($requestId, $e)`; else external id set and another process (`id` different, or any when inserting) has the same `service_id` + `external_id` → `DuplicateExternalId($serviceId, $externalId, $e)`; otherwise rethrow; finally `$process->recordPersisted((int) id, (int) created_at, (int) updated_at)` |
| private `toDomain(ProcessRecord): Process` | `Process::restore(...)` with value objects (`new ServiceId((int) service_id)`), `Json::decode(incoming_data)`, `external_id` null → null, `Status::from(status)`, int casts |

## Migrations (`demo/migrations/`, history table: the default `migration`)

Both keep the shape of Yii's `migrate/create` template (no namespace, no `declare(strict_types=1)`, class not `final`,
`safeUp()`/`safeDown()` without return types) - the file conventions of spec 01 do not apply to them. No ActiveRecord inside.

### 1. `m<YYMMDD_HHMMSS>_init_process.php`
Create the file with `php yii migrate/create init_process --interactive=0` (inside `php-cli`, `-w /app/demo`) - **only if no
migration in `demo/migrations/` creates `{{%process}}` yet**; then write its body.

Exception - the history already has a row `m<YYMMDD_HHMMSS>_init_process` but the file is missing (e.g. `demo/` was
recreated while the database volume was kept): if `SHOW CREATE TABLE process` matches the table **as this migration creates
it** (below - before migration 2), or matches the final table (after migrations 2 and 3, whose history rows must then exist too),
write the file under **that recorded name** instead of creating a new one; `migrate` then applies nothing. If the table
differs, stop and ask the user. Class docblock: `Table `process`: the progress of every process (docs/architecture/flow.md
§4).` `safeUp()`:

| Column | Definition |
|--------|------------|
| `id` | `primaryKey()` |
| `request_id` | `string(64)->notNull()` + **unique** index `idx-process-request_id` |
| `service_method` | `string(128)->notNull()` |
| `external_id` | `string(128)->null()` + index `idx-process-external_id` |
| `incoming_data` | `text()->notNull()` (JSON) |
| `status` | `string(16)->notNull()` |
| `created_at`, `updated_at` | `integer()->notNull()` |

`safeDown()`: `dropTable('{{%process}}')`.

### 2. `m<YYMMDD_HHMMSS>_add_service_registry.php`
Create with `php yii migrate/create add_service_registry --interactive=0` if no migration creates `{{%service}}` yet (the same
recorded-name exception as migration 1 applies). Class docblock: `Service registry: table `service` (one row per module,
inserted by the module's own migration) and `process.service_id`, with external ids unique per service
(docs/architecture/flow.md §4).` `safeUp()`, in this order:
1. refuse to run when `process` has rows: `(int) $this->db->createCommand('SELECT COUNT(*) FROM {{%process}}')->queryScalar() > 0`
   → `throw new \RuntimeException('Table process has rows: assign them to a service before adding process.service_id.')`;
2. `createTable('{{%service}}', ['id' => primaryKey(), 'name' => string(64)->notNull(), 'created_at' => integer()->notNull(),
   'updated_at' => integer()->notNull()])` + **unique** index `idx-service-name` on `name`;
3. `addColumn('{{%process}}', 'service_id', integer()->notNull()->after('id'))`;
4. `dropIndex('idx-process-external_id', '{{%process}}')`; `createIndex('idx-process-service_id-external_id', '{{%process}}',
   ['service_id', 'external_id'], true)` (unique per service; MySQL allows many `NULL` external ids - processes in `init`);
5. `addForeignKey('fk-process-service_id', '{{%process}}', 'service_id', '{{%service}}', 'id', 'RESTRICT', 'CASCADE')`.

`safeDown()`: exact reverse - `dropForeignKey('fk-process-service_id', ...)`, `dropIndex('idx-process-service_id-external_id',
...)`, `createIndex('idx-process-external_id', '{{%process}}', 'external_id')`, `dropColumn('{{%process}}', 'service_id')`,
`dropTable('{{%service}}')`.

### 3. `m<YYMMDD_HHMMSS>_add_service_signature_keys.php`
Signature key pair of a module whose remote service requires signing (CLAUDE.md "Decided", `AGENTS.md` "Signing",
`docs/architecture/flow.md` §1b). Create with `php yii migrate/create add_service_signature_keys --interactive=0` if no
migration adds `service.api_key` yet (the same recorded-name exception as migration 1 applies, and the table `service` of
that case then already has both columns). Class docblock: `Signature key pair of a service: service.api_key /
service.secret_key (nullable - only signed modules set them, in their own RegisterService migration).` `safeUp()`:
`addColumn('{{%service}}', 'api_key', $this->string(64)->null()->after('name'))` and
`addColumn('{{%service}}', 'secret_key', $this->string(64)->null()->after('api_key'))`. `safeDown()`: `dropColumn` of
`secret_key`, then of `api_key`. The host never reads or writes these columns (no domain/application code uses them);
the modules do, through their own infrastructure.

## Module service migrations (contract, not generated here)
Every module (`demo/modules/<id>/`) ships a namespaced migration (`app\modules\<id>\migrations\M<YYMMDDHHMMSS>RegisterService`,
its namespace listed in `config/console.php` `migrationNamespaces`) that runs `insert('{{%service}}', ['name' =>
'<module-id>', 'created_at' => time(), 'updated_at' => time()])` in `safeUp()` and `delete('{{%service}}', ['name' =>
'<module-id>'])` in `safeDown()` (`AGENTS.md` "Module architecture").

## Wiring - `demo/config/web.php` → `container.singletons`

Add (keep the skeleton's mailer entry):
```php
\app\domain\process\ProcessRepository::class => \app\infrastructure\persistence\ArProcessRepository::class,
\app\domain\service\ServiceRepository::class => \app\infrastructure\persistence\ArServiceRepository::class,
// action parameter injection (BaseController) resolves only types registered in the container
\app\application\process\ProcessService::class => \app\application\process\ProcessService::class,
```

## Tests
No automated test yet: the repositories need a database (the skeleton's test config points at a test database that does not
exist). Verify by the migration checks and a one-off probe against the database (temporary `service` row; save, scoped find,
duplicate external id → `DuplicateExternalId`; delete the probe rows afterwards); an integration test is an open item.

## Checks
- `php yii migrate --interactive=0` applies; `SHOW CREATE TABLE service` / `process` match the tables above (read through
  `docker compose exec mysql`, never print passwords); history rows in `migration`; `migrate/down 1` + `migrate` works
  (migration 2 is reversible).
- ActiveRecord only here (must print nothing):
  `grep -rln "extends ActiveRecord" demo --include=*.php | grep -v -e "/infrastructure/" -e "/vendor/"`
