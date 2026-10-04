---
name: analyze-code
description: Check code (demo/, emulator/, or a given module/scope) against the project's architecture and structure rules (via design-review) plus PHPStan static analysis (via the phpstan skill), and write the combined findings as a checklist to a report file in development/ - analize_<start_ts>_<check_ts>.md. Use standalone to get a findings report, or as the checking half of the analyze-fix loop driven by fix-code. Read-only: never edits code.
---

# Analyze code

Orchestrates two existing read-only checks - **`design-review`** (architecture/structure: SOLID, DDD layers, the
`BaseController` boundary, ubiquitous language) and **`phpstan`** (static analysis: types, reachability, nullability,
`docs/architecture/static-analysis.md`) - into one combined, checkbox-per-problem report file. Never edits code
itself; that is `fix-code`'s job. Re-run (not re-created) by `fix-code` across its loop - see §4.

## 1. Scope

- Default scope: all of `demo/` and `emulator/` (host + every module). A caller (the user or `fix-code`) may narrow it
  to one app, one module (`demo/modules/<id>/`, `emulator/modules/<id>/`), or a diff - state the scope at the top of
  the report either way.
- **Never `vendor/`.** Third-party code, never edited (`AGENTS.md` "Never edit `vendor/`"), so it is never analysed
  either: both `design-review` and `phpstan` already scope to this project's own code only (`phpstan.neon`'s `paths`
  never lists `vendor/` - `docs/architecture/static-analysis.md` §1), and a scope a caller gives must stay inside
  `demo/`/`emulator/` minus `vendor/` - reject or narrow a scope that would reach into it rather than running against
  it. A `phpstan` finding whose file is under `vendor/` (a third-party stub issue) is reported, never turned into a
  `P-<n>` row for `fix-code` to act on - there is nothing in this project to fix for it.
- Preconditions: the stack is up (`docker-build`); `vendor/bin/phpstan` exists in the app(s) in scope
  (`docs/architecture/static-analysis.md` §1 - already set up project-wide). If a scoped app has no `phpstan.neon`,
  skip PHPStan for it and say so in the report rather than failing the whole run.

## 2. Run the checks

1. Run skill **`design-review`** over the scope. Keep its full findings table (# / Severity / File:line / Rule /
   Finding / Suggested fix) - do not summarize away detail the fix step will need.
2. Run skill **`phpstan`** over the scope (both apps unless narrowed - `phpstan` §1's commands). Keep every reported
   error (file, line, message, identifier).
3. Merge both into one problem list, each item tagged by its source (`design-review` or `phpstan`) and keeping that
   source's own severity/identifier. Do not deduplicate across sources (a design-review finding and a PHPStan error on
   the same line are two different problems unless they are plainly the same root cause - say so in the finding text
   if you merge two rows into one, never merge silently).

## 3. The report file

**Path and name**: `development/analize_<start_ts>_<check_ts>.md`, both unix-second timestamps (`date +%s`, same
convention as `logs/init_<unix seconds>` - skill `init-log`).
- `<start_ts>`: when the overall analyze-fix **process** started. If this run was launched by `fix-code`, `fix-code`
  passes this value (its own loop-start time) - use it verbatim, do not generate a new one. If `analyze-code` is run
  standalone (no orchestrator), `<start_ts>` = now, the same value as `<check_ts>`.
- `<check_ts>`: when the **first** check of that process ran. Set once, when this file is first created, and never
  changed afterward - a re-run (§4) **edits this same file**, it never creates a new one with a new `<check_ts>`.
- Because of the rule above, the filename is decided once per analyze-fix process and stays constant for its whole
  lifetime (every iteration of `fix-code`'s loop writes to the one file created on iteration 1).

**Template** (`<...>` = filled in; `{...}` = instruction):

````markdown
# Code analysis

| | |
|---|---|
| Main process started | <start_ts, human-readable + unix> |
| First check | <check_ts, human-readable + unix> |
| Scope | <demo/, emulator/, or the narrower scope given> |
| Checks | design-review (`docs/architecture/code-design.md`), phpstan (`docs/architecture/static-analysis.md`) |
| Iteration | <N - 1 on first creation, incremented each time `fix-code` calls this skill again> |

Progress: <closed> / <total> problems closed.

## Problems
{One row per problem, stable id `P-<3-digit sequence>` assigned on first appearance and never reused or renumbered.
Unchecked = open, needs a fix. Checked = fix-code marked it fixed in some iteration; a later re-run that still detects
it must REOPEN it (uncheck + a note), never leave a stale checkmark on a problem that is still there.}

- [ ] P-001 [design-review|phpstan] `<file>:<line>` - <one-line summary>
  <full finding text: severity/identifier, rule, suggested fix - everything fix-code needs without re-reading the
  original design-review/phpstan output>
- [x] P-002 [phpstan] `<file>:<line>` - <one-line summary>
  <same>
  Fixed in iteration <N>: <what changed, one line>

## Fix log
{Appended by fix-code, not by this skill - one subsection per iteration it ran. analyze-code never writes here.}
````

## 4. Updating an existing report (re-run inside the loop)

When `fix-code` calls this skill again (after a fix attempt), **edit the existing file in place** - never create a
new one for the same process:
1. Read the current file; note every `P-<n>` id and whether it is currently `[ ]` or `[x]`.
2. Run the checks (§2) fresh.
3. For each problem the checks still detect:
   - matches an existing `P-<n>` (same file:line + same rule/identifier, even if currently `[x]`) → if it was `[x]`,
     **uncheck it** and append a note ("still present after fix attempt in iteration <N-1>"); if already `[ ]`, leave
     as is.
   - matches nothing existing → append as a new row with the next `P-<n>` id, unchecked.
4. A `P-<n>` that was `[x]` and is **not** re-detected stays `[x]` - that is confirmation the fix held; do not touch
   rows for problems that no longer exist and were not reopened.
5. Bump `Iteration` in the header table; recompute `Progress`.
6. Never delete a row and never renumber - `fix-code` and the backlog/complete bookkeeping (its §5-§6) key off these
   stable ids across the whole process.

## 5. Report back

To whoever invoked it (the user, or `fix-code`): the file path, the counts (open/closed/new-this-run/reopened-this-run),
and whether the scope is now clean (`Progress` = total/total, zero `[ ]` rows). Never claims code was fixed - that
claim belongs to `fix-code`'s own report.

## Rules
- Read-only: this skill never edits `demo/`, `emulator/`, or any file outside `development/analize_*.md`.
- One report file per analyze-fix process (§3); never split one process's findings across multiple report files.
- Every problem keeps its PHPStan identifier or design-review rule tag verbatim - do not paraphrase away the
  specific, re-checkable detail a fix needs.
