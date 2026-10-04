# Remote-error ERRCODE rows (HTTP error, timeout, malformed response, signature mismatch) have no safe live trigger

| | |
|---|---|
| First found | `development/test/mail_service/module_mail_service.md`, iteration 1 (2026-10-05) |
| Source | test-module (live execution) |
| Rows | ERRCODE-G-http_error, ERRCODE-G-timeout, ERRCODE-G-malformed_body, ERRCODE-G-signature_mismatch, ERRCODE-P-http_error, ERRCODE-P-timeout, ERRCODE-P-malformed_body, ERRCODE-P-signature_mismatch |
| Status | open - missing test infrastructure, lower priority (not blocking) |

## Problem

Forcing a real remote failure (HTTP error, timeout, a response without `id`/`status`, a wrong signature) would mean
breaking the shared emulator/stack or giving the module a fault-injection path it does not have. The module's own
reaction to these is covered by unit tests with fakes, but the live round trip through the real curl client and the real
emulator is not. Same root cause as `development/backlog/demo/test/no-live-trigger-for-remote-error-paths.md`.

Options: (1) accept the unit-level coverage for these rows; (2) a safe fault-injection path usable only in a dedicated
functional-test run (e.g. a client config pointing at an unreachable/garbage URL).

## Fix attempts
None - not mechanical, left for the user.
