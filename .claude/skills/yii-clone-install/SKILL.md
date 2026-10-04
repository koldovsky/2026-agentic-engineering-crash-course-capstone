---
name: yii-clone-install
description: Create a Yii2 application skeleton (yiisoft/yii2-app-basic) with its vendors installed - built with Composer inside the php-cli container's own filesystem and then copied into a directory of the repository. Argument - the target directory (init-project uses the temporary skeleton directory tmp/yii-skeleton). Use when a prepared skeleton is needed and does not exist yet.
---

# Clone the Yii2 skeleton and install vendors

## Logging

Log every step with skill **`init-log`** into `<log dir>/log_yii-clone-install.log` (JSON line: `action`, `start_time`,
`end_time`, `execution_time`). Use the log dir you were given by the calling skill; if you were started on your own, create one
(`bash .claude/skills/init-log/init-log.sh start`).
Steps to log: `check target`, `composer create-project (container /tmp)`, `composer install --prefer-dist (container /tmp)`,
`yii help (container /tmp)`, `copy to <dir>`, `check <dir>/vendor/autoload.php`, `remove container build dir`.

Argument: `<dir>` = target directory relative to the repository root; `init-project` passes **`tmp/yii-skeleton`** (the
temporary skeleton that `init-api` and `init-emulator` copy from; `tmp/` keeps its contents out of git). Run from the
repository root; all Composer/PHP commands run inside `php-cli` (`docker compose exec -T ...`); the stack must be up (skill
`docker-build`). In Git Bash on Windows prefix commands that use `-w /app/...` or container paths with `MSYS_NO_PATHCONV=1`.

**Why the build happens in the container's `/tmp`:** on Docker Desktop for Windows, Composer writing into the bind-mounted
project fails (observed here: `--prefer-source` → `fsync ... Operation not permitted` after ~16 minutes; `--prefer-dist` →
`could not be saved to .../vendor/composer/tmp-*.zip`, 4 attempts, different packages each time). Building in the
container's own filesystem avoids that; only the finished result is copied onto the mount.

## 1. Check the target
- `<dir>/vendor/autoload.php` exists → nothing to do; report it and stop (the skeleton is already there).
- `<dir>/` exists without vendors → ask the user before replacing it; never delete it silently.
- Otherwise continue.

## 2. Build in the container
```bash
B=/tmp/yii-build-$(date +%s)          # container path; keep it for all following steps
MSYS_NO_PATHCONV=1 docker compose exec -T php-cli composer create-project --prefer-dist yiisoft/yii2-app-basic $B --no-install --no-interaction
MSYS_NO_PATHCONV=1 docker compose exec -T -w $B php-cli composer install --prefer-dist --no-interaction
MSYS_NO_PATHCONV=1 docker compose exec -T -w $B php-cli php yii help
```
- "Class yii\composer\Installer is not autoloadable" after `create-project` is expected (`--no-install` skips vendors).
- `composer install` runs the skeleton's post-install script, which generates a `cookieValidationKey` in `config/web.php`.
- A failed download is repeated **once**; if it fails again, stop and report (do not loop).
- `yiisoft/yii2 not loaded` (unresolvable root version): add `"version": "2.0.56"` to `$B/composer.json` (project
  convention) and repeat.
- Do not pipe the logged `yii help` step into `head`: the closed pipe makes it look `FAILED` although it worked.

## 3. Copy into the repository
```bash
MSYS_NO_PATHCONV=1 docker compose exec -T php-cli sh -c "mkdir -p /app/<dir> && cp -a $B/. /app/<dir>/"
MSYS_NO_PATHCONV=1 docker compose exec -T php-cli rm -rf $B
```
Check that `<dir>/vendor/autoload.php` and `<dir>/yii` exist on the host.

## 4. Report
Target directory, Yii/skeleton versions, the build directory used, repeated steps and why.

## Rules
- Never edit `vendor/`. Never delete an existing `<dir>/` without asking.
- Do not change the skeleton here (cleaning is the skill `yii-prepare`).
