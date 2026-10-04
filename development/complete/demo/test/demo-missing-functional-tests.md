# No functional tests for the `test` module's init/callback flow

| | |
|---|---|
| First found | `development/analize_1790873891_1790873891.md`, iteration 1 (2026-10-01) |
| Source | design-review |
| Severity | error (test coverage) |
| Location | `demo/tests/Functional/` |
| Rule | G |

## Problem

Only `_bootstrap.php` existed under `demo/tests/Functional/`. AGENTS.md ("tests must cover success and fail") and
`docs/architecture/code-design.md` §5 require functional coverage of every success/fail/error path through the real
API <-> emulator wiring; only unit tests with fakes existed for module `test`.

## Resolution

Fixed in iteration 1 of the same process, confirmed by an independent re-check (fresh subagent, iteration 2):
added `demo/tests/Functional/TestModuleCest.php` (6 cases, real HTTP through the real API<->emulator wiring, not
fakes): init success, 422 missing field, 422 duplicate requestId, 405/wrong-verb, 404 unknown callback id, 400 empty
callback body. Required fixing `demo/config/test.php` (was the unmodified Yii2 skeleton default - no module
registration, no container/queue wiring - `test/v1/init` would have 404'd) to build on `web.php` instead, and
`demo/config/test_db.php` (pointed at a never-provisioned `yii2basic_test`/`localhost` db) to reuse the real `demo`
database (no separate test db exists in `docker/mysql/init/`; tests clean up their own rows). Added dev dependency
`codeception/module-rest` (needed for JSON response assertions) and enabled it in `Functional.suite.yml`. All 6
pass; verified by the re-check's reading of the test file and config.

**Not covered** (documented, not silently dropped): the remote "fail" outcome and the exact callback-before-init race
- the emulator's live endpoint always answers its default scenario (`Complete`, no scenario-selection mechanism
decided yet - `development/test/specs/module.service.md` §10, an existing open point this fix did not resolve).

No backlog entry - fixed within its first process.
