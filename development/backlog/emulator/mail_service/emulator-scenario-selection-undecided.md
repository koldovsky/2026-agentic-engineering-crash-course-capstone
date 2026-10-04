# No scenario-selection mechanism - inline Sending / Fail / unmapped answers unreachable through the live init

| | |
|---|---|
| First found | `development/test/mail_service/module_mail_service.md`, iteration 1 (2026-10-05) |
| Source | test-module (live execution) |
| Rows | FINAL-G-response-process, FINAL-G-response-fail, FINAL-G-response-default, FINAL-P-response-process, FINAL-P-response-fail, FINAL-P-response-default |
| Status | open - CLAUDE.md-level design decision, not a mechanical fix |

## Problem

The emulator's public endpoint (`POST /mail_service/init-process`) always answers its default scenario (`Sended` at
once, no callback); how a test selects another scenario is an open decision (CLAUDE.md, `module.service.md` §10). So the
demo's real init can never be made to receive `Sending`, `Fail` or an unmapped status inline, and the demo's response
mapping for those values has no end-to-end evidence (only unit tests). The callback-side paths and the
`Sending -> ...` flows are covered another way (see the STATUS/FINAL-callback rows). Same root cause as
`development/backlog/emulator/test/emulator-scenario-selection-undecided.md` of module `test`.

Options (needs the user's decision): a reserved field in the init request that only the emulator reads, a request
header, or per-`request_id` configuration. None is assumed here.

## Fix attempts
None - fix-code must pause on this (its §3.5).
