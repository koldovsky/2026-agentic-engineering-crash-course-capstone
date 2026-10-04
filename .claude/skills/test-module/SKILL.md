---
name: test-module
description: Build a module's own final test spec from the fixed base categories (.claude/skills/test-module/specs/module-test-base.md) expanded with that module's own status map and error codes (development/<name>/specs/module.service.yaml, module.service.md), write it to development/test/<name>/module_<name>.md (check first whether it already exists and still matches the current base/module specs, updating it in place rather than starting over if it doesn't), then actually execute it against the live stack - init, callback, every status change, every final status and every remote-service error code - checking a box only when the real result was observed. Failing or unverifiable rows get a development/backlog/<demo|emulator>/<name>/ file and a fix-code run; then the loop repeats (re-test, re-fix) up to 5 iterations, editing the same development/test/<name>/module_<name>.md file in place throughout - no separate timestamped report file. Use to verify a generated module (demo/modules/<id>/ + emulator/modules/<id>/) actually works end to end, not just that its code looks right.
---

# Test module

Executes, it does not just plan: this skill owns both halves - building the concrete test spec (§3, from the fixed
base categories plus the module's own service spec) and running it for real (§4). For every row, it makes the real
HTTP calls / runs the real test suite / reads the real database against the live stack, and only checks a box when
it actually observed the expected result. A plan row never gets copied over as checked - that is the one thing this
skill exists to prevent.

## 0. When it runs

Stage 3 of module creation (`create-module` writes the specs, then runs `generate-module` → `generate-emulator`
Part B → **`test-module`**): invoked by `create-module` §3.6 once both sides exist (or by `generate-emulator` B.8
when Part B is run on its own), and can also be run on its own for an existing module. It never runs against a
half-built module (§1).

## 1. Preconditions

- `development/<name>/specs/module.service.yaml` and `module.service.md` exist (run `create-module` first if not -
  these are this skill's source of methods, the status map and the error codes; it never invents them).
- `.claude/skills/test-module/specs/module-test-base.md` (the fixed base categories) is read before building any
  module's spec.
- The stack is up (`docker-build`), `demo/modules/<name>/` and `emulator/modules/<name>/` both exist (`generate-module`,
  `generate-emulator` Part B).
- `<name>` = the module id given by the user or caller; if ambiguous, ask rather than guessing which module.
- Never `vendor/` - this skill runs tests, it does not read or alter third-party code.

## 2. Start

Report/spec file: **`development/test/<name>/module_<name>.md`** - one file, under a per-module directory (matching
`development/backlog/`'s and `development/complete/`'s own `<demo|emulator>/<name>/` scoping convention - this
skill's output lives alongside, not inside, that structure since it's one level: `development/test/<name>/`, no
`demo`/`emulator` split, since a module's test spec already names its own module). Created once for the whole
process, then **edited in place** across every iteration of the loop (§4): it is simultaneously the test plan (§3)
and the test report (§4), never split into a separate `module.tests.md`-style plan and a timestamped
`test_<start_ts>.md` report. No `start_ts` in the filename.

## 3. Build (or check and update) the final test spec

Before running anything, **check first**: does `development/test/<name>/module_<name>.md` already exist?

- **It does not exist**: build it fresh (steps 1-4 below), from scratch.
- **It exists**: read it, then re-derive what its rows *should* be right now from the current
  `.claude/skills/test-module/specs/module-test-base.md` and the module's current
  `development/<name>/specs/module.service.yaml`/`module.service.md` (steps 1-3 below, done as a comparison, not
  blindly trusting the file's own header dates). Compare row-by-row:
  - A row whose id still matches current specs and whose condition is unchanged: **keep it exactly as is**
    (checkbox, evidence, iteration note) - do not re-run something that hasn't changed just to regenerate the file.
  - A row the current specs no longer produce (a status removed from `status_map`, a method removed, a base
    category changed): **remove it**, with a one-line note in the Fix log explaining why (which spec change caused
    it).
  - A condition the current specs now produce that has no matching row (a new method, a new mapped status, a new
    base category): **append it**, unchecked, with the new id.
  - A row whose id matches but whose *expected result* changed (e.g. a method's `status_map` reassigned what a
    given remote status maps to): **update the row's text to the new expected result and reset it to unchecked**
    with a note why (the old evidence no longer applies to the new expectation) - never leave a checked row
    describing a result the current spec no longer calls for.
  Report back which rows were kept, removed, added, or reset before continuing to §4.

1. Read `.claude/skills/test-module/specs/module-test-base.md` for the five fixed categories and the row-id
   convention.
2. Read `development/<name>/specs/module.service.yaml` and `module.service.md` for this module's methods, each
   method's `status_map` (response and callback, including `default_status`) and the remote-service error codes/
   conditions `module.service.md` documents for it.
3. Expand each base category into concrete rows for every method:
   - **INIT-\***: the shared `BaseController` validation rules (body `{}`, each missing top-level key, `data` not an
     object, duplicate `requestId`, wrong verb, unregistered service) once, plus this method's own `data`-parameter
     rows (missing/wrong-type/too-long per parameter - `AGENTS.md` rule 3: these fail inside `doProcess()`, so the
     expected result is 500/`error`, not 422, unless the module itself defines a 422 path).
   - **CB-\***: the shared callback validation rules (empty body, missing process id, unknown process id, callback
     before init, wrong verb) once, plus this method's own callback-body-parameter rows.
   - **STATUS-\***: one row per status *transition* this method's map allows (`init`→mapped-on-response,
     mapped→different-mapped-on-callback, `Processing`→`Processing`→final) - reuse
     `docs/architecture/flow.md` §"Callback ordering" for which transitions are legal.
   - **FINAL-\***: one row per distinct value in this method's `status_map` (response-side and callback-side) plus
     one for `default_status` if set - the row drives the flow to exactly that outcome.
   - **ERRCODE-\***: one row per error response code/condition `module.service.md` documents for this method's
     remote call (each HTTP error status, timeout, malformed/empty body, missing id/status parameter) - the row
     forces that condition for real and confirms the module's handling.
4. A row whose condition has **no live trigger yet** (an undecided scenario-selection mechanism, a condition that
   cannot be forced without risking the shared stack) is still written, left unchecked, with the reason stated in the
   row itself - never omitted. Writing the missing trigger (a console scenario, a safe fault-injection path) is
   itself a candidate problem for `fix-code` to pick up (§4), but never invent a result for a row that was never run.
For execution, reuse the Functional-test pattern already established (`demo/tests/Functional/<Module>Cest.php`,
`emulator/tests/Unit/modules/<id>/` for host-side logic) rather than ad hoc one-off `curl` scripts wherever a
Codeception test can express the same check durably - INIT-\*/CB-\* via real HTTP through nginx, STATUS-\*/FINAL-\*
end-to-end including the real ≥5s delayed callback (`docs/architecture/flow.md` §6a - never shortcut this with a
mock), ERRCODE-\* by forcing each condition for real.

## 4. The loop (max 5 iterations)

```
iteration = 1
while iteration <= 5:
    run every row of development/test/<name>/module_<name>.md live, against the current code
    update development/test/<name>/module_<name>.md in place - every row checked only if actually observed passing
    if every row is checked: done, go to §6
    for every unchecked row: ensure a development/backlog/<demo|emulator>/<name>/<id>.md file (module-scoped, since
        every row here belongs to this module - same convention as fix-code §4.0/§4.1 - this
        skill writes these itself so fix-code has something to act on even before its own loop starts)
    run skill fix-code, pointing it at development/test/<name>/module_<name>.md (fix-code applies its own fix-pass /
        internal re-check / backlog-complete bookkeeping unmodified - it does not need to know this file is this
        skill's own spec-plus-report rather than analyze-code's; a row it cannot match against a static
        analyze-code finding on its internal re-check simply stays as fix-code left it, which is correct - this
        skill's own next iteration is the real re-check for a dynamic/behavioural row, not fix-code's)
    iteration += 1
```

- **Stop early, successfully**: every row checked after a run. Go to §6.
- **Stop at the limit**: `iteration` reaches 6 (5 test-fix cycles done) with unchecked rows remaining. Go to §6
  anyway - the documented, expected outcome for a flow that still fails after 5 tries, not a failure to hide.
- Never skip calling `fix-code` for an iteration that still has unchecked rows, even when a fix looks mechanical and
  obvious - §4's loop has one path, not a shortcut for fixes judged simple; apply the fix through `fix-code` so its
  own re-check and backlog/complete bookkeeping run exactly as written.
- If `fix-code` itself paused on a row (a genuine open design decision, its §3.5), do not re-attempt it with a
  different approach on the next iteration - surface it to the user the same way `fix-code` did, and let it stay
  unchecked through to §6's backlog handling.

## 5. The file's shape

`development/test/<name>/module_<name>.md` (built by §3, updated by §4 - one file, plan and report together):

````markdown
# Module `<name>` — final test spec

| | |
|---|---|
| Module | `<name>` |
| Base categories | `.claude/skills/test-module/specs/module-test-base.md` |
| Module specs | `development/<name>/specs/module.service.yaml`, `module.service.md` |
| Built | <when §3 last (re)built the row set> |
| Stack | demo `http://demo.dev`, emulator `http://emulator.dev:81` |
| Iteration | <N> |

Progress: <passed> / <total> checked.

## Init request tests (`INIT-*`)
- [ ] INIT-<method>-01 ...

## Callback request tests (`CB-*`)
- [ ] CB-<method>-01 ...

## Status-change tests (`STATUS-*`)
- [ ] STATUS-<method>-<from>-<to> ...

## Final-status tests (`FINAL-*`)
- [ ] FINAL-<method>-<status> ...

## Error-code tests (`ERRCODE-*`)
- [ ] ERRCODE-<method>-<code> ...

Each row, whether passed or not:
- [x] FINAL-service_1-success [observed] POST /test/v1/init -> remote Complete -> API 200 {"status":"success"}; `process`
  row confirmed `status = success`, `external_id` set. (iteration 1)
- [ ] STATUS-service_1-process-success [blocked] init -> remote Processing -> API status: process; callback Complete
  (>=5s later) -> record success
  Blocked: the emulator's live endpoint has no scenario-selection mechanism yet (module.service.md §10, open) - this
  scenario cannot be triggered through the public HTTP path as it exists today. Not a transient failure; needs a
  design decision before it can run. (iteration 1)

## Fix-code runs
{one line per iteration that invoked fix-code: its report file reference is this same file; summarize its outcome}

## Fix log
{appended by fix-code, same convention as analyze-code's own Fix log}
````

## 6. When the loop ends

- Every still-unchecked row: `development/backlog/<demo|emulator>/<name>/<id>.md` exists and is current - this
  module's rows are always module-scoped (`fix-code` §4.0's module case; `<name>` is this skill's own module id, not
  something to re-derive) - same convention as `fix-code` §4.1, including the slug/content shape. If the last
  `fix-code` run already filed/updated it, nothing more to do; otherwise write it now (this skill owns backlog
  bookkeeping for rows that never went through `fix-code`, e.g. ones blocked by an open design decision that
  `fix-code` paused on rather than fixing).
- Every row confirmed passing that has a backlog file from an earlier run: handled by `fix-code`'s own §4.2 the
  moment it last ran (move to `development/complete/<demo|emulator>/<name>/`) - do not duplicate that step here.

## 7. Report

- Outcome: clean (all rows pass) or limit reached (N rows still failing/blocked after 5 cycles), with the file path
  `development/test/<name>/module_<name>.md`.
- Per iteration: what was tested, what passed/failed/was blocked, what `fix-code` changed.
- Never claim a flow works without having just watched it work in this run - a row's checkbox is the only claim this
  skill makes, and it is only ever set after an observed pass.

## Rules
- Never check a row without having executed it in this run; a row carried over as "probably still fine" is a bug in
  this skill's output, not a shortcut.
- `development/test/<name>/module_<name>.md` is this skill's own file, built and edited by this skill (§3, §4) - unlike
  `create-module`'s other specs, it is not read-only input from elsewhere; a row that looks wrong is corrected in
  place (with a Fix-log note saying why), not worked around.
- Never a separate `test_<start_ts>.md` report file - the final test spec is the only file this skill writes to for
  a module's test run; one file per module, not one per run.
- Max 5 iterations, hard limit, same as `fix-code`'s own limit but a separate budget - a full test-fix-retest cycle
  here is not the same unit as one of `fix-code`'s own internal fix passes.
- Never `vendor/`.
- Test data this skill creates against the real database is cleaned up after each run (same approach as
  `demo/tests/Functional/TestModuleCest.php`'s `cleanUpProcess()`), whether the row passed or not.
