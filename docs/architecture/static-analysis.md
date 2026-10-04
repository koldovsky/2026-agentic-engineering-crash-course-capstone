# Static analysis: PHPStan

PHPStan (https://phpstan.org/documentation) checks types and reachability statically, without running the code - it
catches a different class of bugs than `design-review` (which checks SOLID/DDD/structure) and the unit tests (which
check behaviour): wrong argument types, calling undefined methods, dead code, nullable values used without a check.
Run it on every module after `generate-module` / `generate-emulator` Part B generates it, and whenever you hand-write
PHP in `demo/` or `emulator/`.

## 1. Setup (already done)

`phpstan/phpstan` is a dev dependency of both `demo/` and `emulator/` (`composer.json`; it shipped with the Yii2
basic-app skeleton, now also explicit). Each application has its own `phpstan.neon` at its root:

```neon
parameters:
    level: 5
    bootstrapFiles:
        - vendor/yiisoft/yii2/Yii.php   # defines the `Yii` class alias (yii\BaseYii) PHPStan cannot see otherwise
    paths:
        - domain
        - application
        - infrastructure
        - controllers
        - modules
    tmpDir: runtime/phpstan
```

- **`bootstrapFiles`** is required for any Yii2 project: `Yii` is a runtime `class_alias('yii\BaseYii', 'Yii')` inside
  `Yii.php`, not a real class PHPStan's autoloading can discover on its own - without this every `Yii::$app`/`Yii::$container`/
  `Yii::error()` call answers `class.notFound`.
- **`paths`** lists only this project's own code - `domain/`, `application/`, `infrastructure/`, `controllers/`,
  `modules/` (which recurses into every `demo/modules/<id>/`/`emulator/modules/<id>/`). Never `vendor/`. `config/`,
  `migrations/`, `commands/`, `tests/`, `web/`, `runtime/` are left out: Yii2 config arrays and migration
  `safeUp()`/`safeDown()` bodies are dynamic by design and produce noise PHPStan can't usefully check; add `tests` to
  `paths` only if the project later wants its test code analysed too.
- **`tmpDir`** keeps PHPStan's cache inside `runtime/`, next to Yii2's own cache (already git-ignored by the skeleton).

## 2. Running it

```bash
docker compose exec -w /app/demo php-cli vendor/bin/phpstan analyse
docker compose exec -w /app/emulator php-cli vendor/bin/phpstan analyse
```

(`MSYS_NO_PATHCONV=1` prefix in Git Bash on Windows, per `AGENTS.md` "Commands".) No path arguments needed - it reads
`phpstan.neon`'s `paths`. `--no-progress` is useful when piping output; `-c <file>` overrides which config to use.

## 3. The level (why 5, not higher)

PHPStan's levels (`0`-`9`/`max`, each stricter than the last - https://phpstan.org/user-guide/rule-levels):

| Level | Adds |
|-------|------|
| 0 | unknown classes/functions/methods on `$this`, wrong argument counts, always-undefined variables |
| 1 | possibly-undefined variables, unknown magic `__call`/`__get` methods/properties |
| 2 | unknown methods on any expression (not just `$this`), validates PHPDoc |
| 3 | return types, types assigned to properties |
| 4 | basic dead code (always-false `instanceof`, dead `else`, unreachable code after `return`) |
| 5 | **types of arguments passed to methods and functions** (this project's level) |
| 6 | missing type-hints reported |
| 7 | partially-wrong union types (a method that exists on only some members of a union) |
| 8 | calling methods / accessing properties on a nullable type without a null check |
| 9 | explicit `mixed` may only be passed to another `mixed` |
| max | implicit `mixed` (a missing type-hint) is held to the same strictness as explicit `mixed` |

Level 5 is where both apps are clean today and already catches real argument-type mistakes (the most common class of
bug in loosely-typed PHP). Levels 6-9 were tried during setup and found genuine, if mostly cosmetic, gaps - **don't
raise the committed level to fix these ad hoc**; raise it as a deliberate decision (reviewed, all new errors fixed
or ignored on purpose) and record the change here:

- **Level 6** (`missingType.iterableValue`): most `array $data`-typed parameters/returns in this project (request
  bodies, callback bodies) have no PHPDoc `@param array<string, mixed> $data`-style value type. Mechanical to add,
  high volume - a good first ratchet step.
- **Level 8** found two cases worth knowing about, both non-bugs:
  - `demo/infrastructure/persistence/ArProcessRepository.php`: `DuplicateExternalId`'s constructor takes a non-null
    `ExternalId`, but `$process->externalId()` is typed `?ExternalId`. The branch that throws it only runs when
    `otherProcessHasExternalId()` is true, which is only possible when `externalId()` is already set - true by the
    business logic, invisible to PHPStan's static types. Fix (if ratcheting to 8): an explicit null-check/assertion
    right before the throw, not a behaviour change.
  - A module's `infrastructure/*RemoteServiceClient.php` (`curl_exec()` result into `json_decode()`): PHPStan's curl
    stub types `curl_exec()` as `string|true` when it can't trace `CURLOPT_RETURNTRANSFER` through a dynamic
    `curl_setopt_array()` call; the `$responseBody === false` check already handles the real failure case. A known
    PHPStan/curl-stub limitation, not a bug - silence it with a narrow `/** @var string $responseBody */` cast if
    ratcheting to 8, don't restructure the curl call to work around it.

## 4. Baseline (for existing code that can't be fixed right now)

PHPStan's baseline (https://phpstan.org/user-guide/baseline) snapshots today's errors into a separate file
(`phpstan-baseline.neon`, included from `phpstan.neon`) so they stop failing the build while every *new* error still
does - use it when raising the level surfaces a batch of pre-existing issues that need a dedicated cleanup pass,
never to silence something before it's understood:

```bash
vendor/bin/phpstan analyse --generate-baseline
```

Not used yet in this project (both apps are clean at the committed level) - add it only together with raising the
level, not as a way to merge code with known errors.

## 5. Where this fits

| Tool | Checks |
|------|--------|
| `vendor/bin/phpunit` | behaviour (unit/functional tests) |
| `design-review` skill | SOLID, DDD layers, the `BaseController` boundary, ubiquitous language (`code-design.md`) |
| PHPStan (this page) | types, reachability, nullability - independent of both, catches different bugs |

Run PHPStan as part of generating or reviewing any module's code (`generate-module`, `generate-emulator` Part B,
`design-review`): a clean run is a precondition for reporting generated code done, the same way the unit suite is.
