# ServiceName regex allowed `-`, contract says it must not

| | |
|---|---|
| First found | `development/analize_1790873891_1790873891.md`, iteration 1 (2026-10-01) |
| Source | design-review |
| Severity | error |
| Location | `demo/domain/service/ServiceName.php:13` |
| Rule | E (AGENTS.md "Modules") |

## Problem

`ServiceName::PATTERN = '/^[a-z][a-z0-9_-]*$/'` allowed `-`, but AGENTS.md defines the module id (= service name) as
`[a-z][a-z0-9_]*` and explicitly states "no `-`, it is a namespace segment". The divergence was deliberate, not an
oversight: `demo/tests/Unit/domain/service/ServiceTest.php` asserted `pay-v2` was a *valid* ServiceName.

## Resolution

Fixed in iteration 1 of the same process, confirmed by an independent re-check (fresh subagent, iteration 2):
`ServiceName::PATTERN` tightened to `/^[a-z][a-z0-9_]*$/` (drop `-`); its error message updated to match.
`ServiceTest` now rejects `pay-v2` and uses `pay_v2` as the accepted example instead. Grepped the whole `demo/` tree
for every `ServiceName(` construction and `service` table row usage (including the `test` module's `RegisterService`
migration) - nothing relied on the old permissive pattern, no regression.

No backlog entry - fixed within its first process.
