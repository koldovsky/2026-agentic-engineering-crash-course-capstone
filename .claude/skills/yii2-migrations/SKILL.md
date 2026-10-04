---
name: yii2-migrations
description: Yii2 database migrations - create, write (schema builder), apply/revert, configure the migrate command, namespaced and separated histories, multiple databases. Use whenever the database schema has to change.
---

# Yii2 database migrations

Source: `https://www.yiiframework.com/doc/guide/22.0/en/db-migrations`. Run commands in the `php-cli` container
(see AGENTS.md), e.g. `docker compose exec -w /app/demo php-cli php yii migrate`.

## Create
`yii migrate/create <name>` generates a timestamped class (`m<YYMMDD_HHMMSS>_<name>`) in the migrations directory,
extending `yii\db\Migration`, with empty `up()` and `down()`.

Names that trigger code generation:
- `create_xxx_table` → table creation
- `add_xxx_column_to_yyy_table` → `addColumn` statements
- `create_junction_table_for_xxx_and_yyy_tables` → junction table with foreign keys

Describe columns with `--fields=name:string(12):notNull` (`COLUMN_NAME:COLUMN_TYPE:COLUMN_DECORATOR`).

## Write
- `up()` applies the change, `down()` reverts it. Prefer `safeUp()` / `safeDown()`: they run in a transaction and roll
  back on failure.
- Use the schema builder instead of raw SQL so the migration is DBMS-independent:
  `$this->primaryKey()`, `$this->string()->notNull()`, `$this->text()`, ...
- Do not use Active Record classes inside migrations (the guide's advice for extension migrations; models change,
  migrations must stay valid).

```php
use yii\db\Migration;

class m260919_120000_create_post_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('post', [
            'id' => $this->primaryKey(),
            'title' => $this->string()->notNull(),
            'body' => $this->text(),
        ]);
    }

    public function safeDown()
    {
        $this->dropTable('post');
    }
}
```

## Apply / revert
| Command | Effect |
|---------|--------|
| `yii migrate` | apply all pending migrations |
| `yii migrate/down [n]` | revert the last `n` migrations |
| `yii migrate/redo` | revert, then re-apply |
| `yii migrate/history` | list applied migrations |

Options: `--migrationPath`, `--db`, `--interactive=0` (no prompts, for scripts), `--templateFile`.
Example for a non-default folder: `yii migrate --migrationPath=@app/migrations/db1 --db=db1`.

## Configure the command globally
```php
return [
    'controllerMap' => [
        'migrate' => [
            'class' => 'yii\console\controllers\MigrateController',
            'migrationTable' => 'custom_migration',
        ],
    ],
];
```

## Namespaced migrations
Use when migrations come from several places (application, extensions):
```php
'migrate' => [
    'class' => 'yii\console\controllers\MigrateController',
    'migrationPath' => null,                 // disable non-namespaced path if a namespace like app\migrations is listed
    'migrationNamespaces' => ['app\migrations', 'some\extension\migrations'],
],
```
- Class name format `M<YYMMDDHHMMSS><CamelCaseName>` (e.g. `M190720100234CreateUserTable`).
- Create with the full namespace and escaped backslashes: `yii migrate/create app\\migrations\\CreateUserTable`.
  `CreateXxxTable` names convert CamelCase to `underscore_case` table names (`CreateBANANATable` → `b_a_n_a_n_a`);
  precede mixed-case names with an underscore (`Create_studentsExamTable`).
- All namespaces share ONE history; you cannot apply/revert a single namespace alone.
- `migrationPath` accepts an array of non-namespaced directories (2.0.12+).

## Separated histories
Several controllers, each with its own `migrationTable` and namespaces/path:
```php
'controllerMap' => [
    'migrate-app' => [
        'class' => 'yii\console\controllers\MigrateController',
        'migrationNamespaces' => ['app\migrations'],
        'migrationTable' => 'migration_app',
        'migrationPath' => null,
    ],
    'migrate-rbac' => [
        'class' => 'yii\console\controllers\MigrateController',
        'migrationPath' => '@yii/rbac/migrations',
        'migrationTable' => 'migration_rbac',
    ],
],
```
Run each: `yii migrate-app`, `yii migrate-rbac`. (Yii's own RBAC tables come from `@yii/rbac/migrations`.)

## Multiple databases
`--db=db2` at run time, or `$this->db = 'db2';` inside the migration; keep migrations per database in separate
`migrationPath` directories.

## Rules of thumb
- Never edit a migration that has been applied elsewhere; add a new one.
- Every migration needs a working `down()`/`safeDown()` (or a deliberate, documented irreversible change).
- Fixed RBAC hierarchies can be created in migrations (see `yii2-rest-security`).
