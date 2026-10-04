# module.tests.md expects 422 for invalid init `data`, but the host contract gives 500/error

| | |
|---|---|
| First found | `development/test/test/test_1790877025.md`, iteration 1 (2026-10-01) |
| Source | test-module (live execution) |
| Rows | INIT-04, INIT-05 |
| Status | open - needs a decision, not a mechanical fix |

## Problem

`development/test/specs/module.tests.md` rows INIT-04 (`data.user_id` missing/non-integer) and INIT-05
(`data.test_data` missing/too long) say the expected result is `422`. Live execution observed `500 {"status":"error"}`
instead, both times.

This is **not a code bug**: `BaseController` (`demo/controllers/BaseController.php`) has no per-module validation
hook - a module's `doProcess()` validating `data` and throwing is caught by `BaseController`'s existing generic
`catch (Throwable $e)`, which saves `error` and answers 500. This matches AGENTS.md "Module architecture" rule 3
exactly as documented ("if the module fails - throws... the base saves `error` and answers 500"). `InitData::fromArray()`
throwing `InvalidInitData` inside `doProcess()` is the module doing precisely what the architecture asks of it.

The mismatch is between the **plan**'s expected value (422) and the **actual, intended, already-documented contract**
(500/error) - `module.tests.md` is wrong here, or the contract should change, not the code.

## Options (needs the user's decision - not invented here)

1. Correct `module.tests.md` rows INIT-04/INIT-05 to say `500`/`error` instead of `422`, matching the contract as it
   stands today.
2. Add a per-module 422 hook to `BaseController` - a real host-contract change (not something `fix-code` should
   invent per its own §3.5 pause rule), would need its own design (how does a module report field-level validation
   errors distinctly from "I failed"?).

## Resolution

User chose option 1 (2026-10-01, same session as discovery): correct the plan, not the code. Updated
`development/test/specs/module.tests.md` rows INIT-04/INIT-05 to expect `500`/`error` instead of `422`, with a note
explaining why. Also updated the `create-module` template
(`.claude/skills/create-module/templates/module.tests.md` §2) so future modules' generated test plans state this
correctly from the start, instead of every module repeating this same false "failure" the first time it's tested.
No code change - `BaseController`'s contract (module `doProcess()` failure → `error`/500, AGENTS.md rule 3) was
already correct and intended.
