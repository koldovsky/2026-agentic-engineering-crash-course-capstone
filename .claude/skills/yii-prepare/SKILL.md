---
name: yii-prepare
description: Prepare a fresh Yii2 basic skeleton for use as the API/emulator base - delete the default controllers, models, commands, assets, views and widgets and fix the configuration that referenced them. Argument - the skeleton directory (init-project uses tmp/yii-skeleton). Use right after yii-clone-install and before the skeleton is copied into demo/ or emulator/.
---

# Prepare the Yii2 skeleton

## Logging

Log every step with skill **`init-log`** into `<log dir>/log_yii-prepare.log` (JSON line: `action`, `start_time`,
`end_time`, `execution_time`). Use the log dir you were given by the calling skill; if you were started on your own, create one
(`bash .claude/skills/init-log/init-log.sh start`).
Steps to log: `check state`, one step per deleted directory content (`delete default controllers`, models, commands, assets,
views, widgets, `delete default tests`), `fix config/web.php`, `fix config/test.php`, `php -l config/web.php`, `yii help`.

Argument: `<dir>` = the skeleton directory relative to the repository root; `init-project` passes **`tmp/yii-skeleton`**.
Run from the repository root. This is **destructive for the default skeleton files only**: check the target list first and
never touch anything else (`vendor/`, `migrations/`, `config/` except the fixes below).

## 1. Check the state
- `<dir>/` and `<dir>/vendor/autoload.php` exist (else run `yii-clone-install` first).
- Already prepared (none of the default files of step 2 left and the config already fixed) → nothing to do; report it.
- Anything that is not a default skeleton file stays untouched; report what was kept.

## 2. Delete the default files
Default files of `yiisoft/yii2-app-basic` (delete the files, keep the now-empty directories with a `.gitkeep`):

| Directory | Default content |
|-----------|-----------------|
| `<dir>/controllers/` | `SiteController.php` |
| `<dir>/models/` | `ContactForm.php`, `LoginForm.php`, `User.php` |
| `<dir>/commands/` | `HelloController.php` |
| `<dir>/assets/` | `AppAsset.php` |
| `<dir>/views/` | `layouts/`, `site/` (whole tree) |
| `<dir>/widgets/` | `Alert.php` |
| `<dir>/tests/Unit/` | `LoginTest.php`, `LogoutTest.php`, `Models/` (whole tree), `widgets/` (whole tree) - tests of the default pages |
| `<dir>/tests/Functional/` | `ContactFormCest.php`, `LoginFormCest.php` |
| `<dir>/tests/Acceptance/` | `AboutCest.php`, `ContactCest.php`, `HomeCest.php`, `LoginCest.php` |

Keep the test infrastructure: the suite configurations (`tests/*.suite.yml`, `codeception.yml`), every `_bootstrap.php` and
`tests/Support/` - the applications add their own tests to these suites. Directories that become empty stay (no `.gitkeep`
needed: each keeps its `_bootstrap.php`).

List each directory first and delete only what is there; if a file has content different from the skeleton (modified),
ask before deleting it. Use `rm` on the listed files only (no wildcards outside `<dir>/`).

## 3. Fix the configuration that referenced the deleted code
- `<dir>/config/web.php`: remove `errorHandler.errorAction` (`site/error`, controller is gone) and the `identityClass` line
  (`app\models\User` is gone). Keep `enableAutoLogin` out: set `user` to `['enableSession' => false, 'loginUrl' => null]`
  (stateless API, AGENTS.md "Host application rules"). The identity class is set later, when the authentication method is
  decided (an open question, see CLAUDE.md) - tell the user.
- `<dir>/config/test.php`: remove `user.identityClass` (it names the deleted `app\models\User`); keep the fixed test
  `cookieValidationKey` (a test value, not a secret).
- `<dir>/config/console.php`: nothing references `app\commands\HelloController`; keep `controllerNamespace` as is.
- Leave `web/index.php`, `yii`, `params.php`, `db.php` untouched (app-specific configuration is done by `init-api` /
  `init-emulator` after the copy).

## 4. Verify
```bash
MSYS_NO_PATHCONV=1 docker compose exec -T -w /app/<dir> php-cli php -l config/web.php
MSYS_NO_PATHCONV=1 docker compose exec -T -w /app/<dir> php-cli php yii help
```
Both work (do not pipe the logged `yii help` into `head`). The HTTP check happens after the copy, in `init-api` /
`init-emulator` (the skeleton directory is not served by nginx).

## 5. Report
Deleted files, kept files, config changes, and what was **not** touched: `<dir>/mail/`, `README.md`, `Vagrantfile`,
`docker-compose.yml` of the skeleton - ask the user whether to remove them.
