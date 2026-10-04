---
name: fix-code
description: Fix the problems a checklist report lists - a development/analize_*.md report (written by analyze-code) or a development/test/<name>/module_<name>.md final test spec (built and run by test-module) - then re-run analyze-code to verify - looping (max 5 iterations) until nothing is left or the limit is hit. Maintains development/backlog/<demo|emulator>/[<module>/] (one file per problem still open when the process ends, scoped to the app/module it belongs to) and the matching development/complete/<demo|emulator>/[<module>/] (one file per confirmed-fixed problem, every time, with a description of the fix - moved from backlog/ if it had one, created fresh otherwise). Use to act on an analyze-code or test-module report, or to start the whole analyze-fix process from scratch (it calls analyze-code itself for the first check and every re-check).
---

# Fix code

Drives the loop; `analyze-code` is the checker it calls (maker ≠ checker inside the loop too - this skill fixes,
`analyze-code` independently re-verifies, never the same pass). Never mark a problem fixed on your own say-so; only
`analyze-code`'s next run not re-detecting it confirms that.

Works on either report shape, both the same checkbox-row format: `development/analize_*.md` (static findings from
`analyze-code` - design-review/phpstan) or `development/test/<name>/module_<name>.md` (`test-module`'s own final test spec
- plan and live-result report in one file, one per module id, no timestamp). For a `test/<name>/module_<name>.md` row, this skill's own re-check (via
`analyze-code`, which only speaks static findings) naturally will not "detect" a dynamic/behavioural problem again -
that is expected and correct, not a gap: a fix to such a row stays as this skill left it (fixed-but-tentative) unless
`analyze-code` finds a *new static* problem the fix introduced; `test-module`'s own next run is the real re-check for
whether the flow actually works now, not this skill's internal loop. Still apply every other rule in this file
(backlog/complete bookkeeping, the pause conditions, the vendor/ exclusion, the iteration limit) exactly the same
regardless of which report it is.

## 1. Start

- **Given a report path** (`development/analize_<start_ts>_<check_ts>.md` or `development/test/<name>/module_<name>.md`): use
  it; for the `analize_*` shape, `<start_ts>` is the process's start time for everything below, for the
  `test/<name>/module_<name>.md` shape there is no timestamp - use the file's own `Iteration` counter instead.
- **Given nothing** (asked to "fix the code" / "analyze and fix"): this is a fresh process. `start_ts` = now
  (`date +%s`). Run skill **`analyze-code`** with this `start_ts` to produce the first report. If it finds zero
  problems, stop here and say so - there is nothing to fix.

## 2. The loop (max 5 iterations)

One iteration = one fix pass + one re-check. `iteration` starts at 1 (the report's first creation by `analyze-code`
already represents the pre-fix state, not an iteration by itself).

```
while open problems remain AND iteration <= 5:
    fix pass (§3) over every "- [ ]" row in the report
    re-run analyze-code on the same report file (its §4: edits in place, never a new file)
    iteration += 1
```

- **Stop early, successfully**: the report has zero `[ ]` rows after a re-check. Go to §4.
- **Stop at the limit**: `iteration` reaches 6 (5 fix passes done) with `[ ]` rows still present. Go to §4 anyway -
  reaching the limit is not a failure to hide, it is the documented, expected outcome for a report that still has
  open problems after 5 tries.
- Never a 6th fix pass. If genuinely blocked on an individual problem before the limit (see §3's pause conditions),
  leave it `[ ]`, move on to the next problem in the same pass, and let the limit or a clean re-check end the loop
  normally - do not spin retrying one problem.

## 3. One fix pass

For every `- [ ]` row in the report, in order:
0. **Never a row whose file is under `vendor/`** - `analyze-code` should never produce one (its own rule), but if one
   is found anyway, skip it with a note ("vendor/ - out of scope, never edited, `AGENTS.md`") rather than fixing it;
   do not let it count toward the iteration limit as a real attempt.
1. Read its full finding text (written by `analyze-code` - file:line, rule/identifier, suggested fix).
2. Fix it the way `design-review`/`phpstan`'s own guidance says to (never by suppressing - `phpstan` skill §2's rule
   against blanket `ignoreErrors`; never by weakening a design-review rule's intent to make the finding disappear).
   Follow `code-generation`'s procedure for the change itself (model → layers → write → test → self-check).
3. Run the project's unit tests for the app(s) touched (`AGENTS.md` "Commands") - a fix that breaks a test is not a
   fix; resolve that before moving on.
4. Mark the row `- [x]` in the report file **now** (tentatively - §2's re-check is what actually confirms it), with
   a one-line "Fixed in iteration `<n>`: `<what changed>`" note appended under it, same as `analyze-code`'s template.
5. **Pause and ask the user** instead of fixing, for any row where:
   - the fix is not mechanical and requires a decision `CLAUDE.md` lists as open (authentication, signature algorithm
     for a module not yet decided, emulator scenario selection, emulator database), or any other genuine design
     choice - never invent one to make a checkbox go away;
   - the "fix" would mean changing a rule in `AGENTS.md`/`docs/architecture/*.md` itself rather than the code;
   - two rows conflict (fixing one would reintroduce the other) - surface the conflict, do not pick a side silently.
   Leave the row `[ ]`, add a note explaining why it was skipped, and continue with the rest of the pass.
6. After the pass, append a `### Iteration <n> (<timestamp>)` subsection to the report's "Fix log" with one line per
   row touched (fixed / skipped-and-why).

## 4. When the loop ends

Whether it ended clean or at the 5-iteration limit:

### 4.0 Scope every problem before filing it

`development/backlog/` and `development/complete/` are not flat - a problem's file goes under the app/module it
belongs to, so a module's own problems travel with it and a flood of unrelated findings never pile up in one place.
Derive the scope from the row's own file path(s) (the `file:line` `analyze-code`/`test-module` already put in the
row - never guess from the row's prose alone):

- **Module-specific** - any path under `demo/modules/<id>/` or `emulator/modules/<id>/` (including that module's own
  `development/<id>/specs/` or `demo/tests/.../modules/<id>/` test files): `development/backlog/<demo|emulator>/<id>/`.
- **App-level, not module-specific** - a path under `demo/` or `emulator/` outside any `modules/<id>/` directory
  (host `domain/`, `application/`, `infrastructure/`, `controllers/`, `config/`, `migrations/`, their own
  `tests/`): `development/backlog/<demo|emulator>/` (no module subdirectory).
- **Neither** (a skill file, a project doc, something not scoped to one running app) - `development/backlog/`
  directly, same as before this scoping rule existed.
- A row naming paths in **both** `demo/` and `emulator/` (or both inside and outside a `modules/<id>/` dir) - file it
  at the **narrowest** scope that covers every path named (e.g. only `demo/modules/<id>/...` paths → that module;
  a `demo/modules/<id>/...` row alongside a `demo/config/...` row → `demo/`, not `demo/<id>/`, since the config path
  isn't module-specific). Never split one problem's file across two scopes.
- `development/complete/` mirrors the same scoping, always - a problem's complete-file lives at the same
  `<demo|emulator>/<id>` (or app-level, or top-level) path its backlog file had.

### 4.1 Still-open problems → `development/backlog/<scope>/`
For every `- [ ]` row remaining in the report:
- Check that scope's directory (§4.0) for a file already covering this problem (same file:line + rule/identifier -
  problems persist across separate `fix-code` runs, this is not scoped to one process; also check the un-scoped
  `development/backlog/` root for a pre-scoping file that has not been migrated yet, and move it into the correct
  scoped directory if found rather than leaving a duplicate at the old flat location). If found, update it (append
  this process's attempts/notes) rather than duplicating.
- If none exists, create `development/backlog/<scope>/<id>.md` (`<id>` = a short slug from the file path + rule, e.g.
  `process-repository-nullable-externalid.md` - stable and descriptive, not just `P-001`, since the problem outlives
  this report's ids) with: the full problem description (copied from the report row), where it was first found
  (`<start_ts>`, the report file), every fix attempt made against it and why each failed or was skipped, current
  status.

### 4.2 Every confirmed-fixed problem → `development/complete/<scope>/`
For **every** `- [x]` row that is confirmed fixed (survived the final re-check) - on every run of this skill, not
only when the problem previously had time in `backlog/`:
- If a matching file exists in `development/backlog/<scope>/` (same problem, from this process's §4.1 of a
  *previous* run, or an earlier independent `fix-code` run): **move** it to `development/complete/<scope>/<same
  name>.md`, appending the "## Resolution" section below, and remove it from `backlog/`.
- If no backlog file exists (fixed within its very first process, never spent time open): **create**
  `development/complete/<scope>/<id>.md` directly (same `<id>` slug convention as §4.1 - short, stable, descriptive,
  not just `P-<n>`) with the full problem description (copied from the report row) plus the "## Resolution" section
  below.
- **Never skip this step.** A confirmed fix with no record in `development/complete/` is the bug this rule exists to
  prevent - one file per fixed problem, always, regardless of whether it ever touched `backlog/`.

"## Resolution" section (same content either way): what changed (the fix notes from the report's rows across every
iteration that touched it), when (`iteration`, timestamp), and the report file this confirmation came from.

## 5. Report

- Loop outcome: clean (0 open) or limit reached (N open after 5 iterations), with the report file path.
- Per iteration: problems fixed, problems skipped (and why), test results.
- `development/backlog/` and `development/complete/` changes: files created, updated, or moved, with their scoped
  path (§4.0) - e.g. "filed to `development/backlog/demo/test/`", not just "filed to backlog".
- If the loop stopped at the limit, say plainly that problems remain and point at their backlog files - never imply
  the code is now clean when it is not.

## Rules
- Never invoke `analyze-code` to *skip* a fix pass - every re-check in the loop happens after a fix pass, never
  instead of one (an empty fix pass because every row was skipped still counts as the iteration and still re-checks).
- Never hand-edit the report's checkbox state based on your own judgement of "this looks fixed" - only `analyze-code`
  not re-detecting a problem on its next run makes a `[x]` final; your own marks in §3.4 are provisional.
- Max 5 iterations, hard limit - stated to the user up front if they ask for more ("fix everything", "keep going
  until it's clean") when the 6th would be needed.
- `development/backlog/` and `development/complete/` are project memory across runs - never delete a backlog file
  except by moving it to `complete/` (§4.2); never recreate a `complete/` file as open again without the user saying
  the problem regressed; always scoped per §4.0 - never write a module-specific problem to the app-level directory
  or vice versa, and never invent a third scope beyond `<demo|emulator>/[<module>/]`/top-level.
- **Never `vendor/`** (`AGENTS.md` "Never edit `vendor/`"): no fix pass row, no backlog file, no complete file ever
  names a path under `vendor/` - third-party code is out of scope for this whole skill, not just a filter on one step.
