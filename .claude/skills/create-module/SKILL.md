---
name: create-module
description: Entry point of adding a new module - takes what the user knows about a new remote-service integration (its requests, data, how it talks to the remote service), writes the specs (four files in development/<name>/specs/ - module.yaml, module.service.yaml, module.service.md, module.tests.md), then runs generate-module (host code in demo/modules/<id>/), generate-emulator Part B (emulator/modules/<id>/) and finally test-module (live test + fix-code loop). The spec step itself writes specs only - all code comes from the skills it starts.
---

# create-module

Entry point of "creating a new module" (`docs/modules/README.md` "Lifecycle"). Stage 1 collects information from the
user and writes the **specs** for one module - this skill never writes module code itself; afterwards (§3.6) it starts
the code stages and the test stage. Templates and their format/field documentation:
`templates/module.yaml`, `templates/module.service.yaml`, `templates/module.service.md`, `templates/module.tests.md`.
Uses skills `yaml-read`, `yaml-write`, `yaml-analyze` for the two YAML specs. Read a template with `yaml-read` first
(learn the format from its own comments) rather than relying on memory.

## 1. Inputs to collect

Obtain from the user's message and by asking **once**, in a single grouped message, for what is missing - never invent
required data:

| Group | Data | Rule |
|-------|------|------|
| Module | `name` | required; lowercase letters/digits/`_`, starts with a letter, no `-` (it is a directory name, a namespace segment `app\modules\<name>` in both apps, and the URL prefix) |
| | `id` | equals `name` - AGENTS.md "Module architecture": one value, not two; do not ask separately |
| | `description` | optional, one sentence |
| | `author.name`, `author.email` | required; the template placeholders (`Your Name`, `you@example.com`) are never accepted as answers |
| Requests | any request beyond the standard `init`/`callback` | optional; the two standard ones are fixed by `BaseController` and never asked about |
| Remote service (`module.service.yaml`) | `remote_service.base_url`, `signature.enabled` | asked; `emulator_url` is always `http://emulator.dev:81` (fixed, do not ask); the signature **algorithm** is undecided project-wide (CLAUDE.md) - never invent it, record only `enabled: true|false` |
| Service methods | per `service_method`: `name`, `data` params, `remote_request` (method, path, body mapping, `response` with `status_param`/`status_map` to `success`/`process`/`fail`), optional `callback` (params, `status_map`, results incl. success and fail) | at least one method; a service without callbacks has no `callback` key; `callback_url` is never asked about or listed under `body.params` - every module adds it itself (flow.md §1a) |
| Extra tables (optional) | tables/columns the module needs beyond the host's `process` table | only if the user names them, or if the requests/data clearly need storage beyond `process` - **propose**, then confirm before writing (§4.3); do not invent tables the module has no job for (YAGNI) |

Accepted input forms: free text, a bullet list, a table, a sample request/response (JSON), a `curl` command, an existing
partial YAML. Normalize everything into the template's structure.

## 2. Output

`development/<name>/specs/` (directory created if missing; nothing outside it is created):
`module.yaml`, `module.service.yaml`, `module.service.md`, `module.tests.md`.

## 3. Procedure

### 3.1 Gather
1. Read `templates/module.yaml` and `templates/module.service.yaml` with `yaml-read`.
2. Extract everything already present in the user's message; list what is missing; ask once (grouped as in §1 table).
   Repeat only for answers still incomplete or contradictory.
3. If `development/<name>/specs/module.yaml` already exists, ask whether to update it or replace it (default: update,
   keep data the user did not touch). Never overwrite silently.

### 3.2 Normalize requests
- Keep the template's standard `init`/`callback` requests unchanged; append any extra request the user describes as its
  own entry (`id` derived `snake_case` from method+path, unique).
- Path placeholders (`{id}`) ↔ `path_params` entries, one to one; body parameters only for methods that take a body.
- Types limited to the template's list (`string`, `integer`, `number`, `boolean`, `array`, `object`); anything else is
  mapped and reported to the user.
- Error responses beyond the template's standard ones are not invented.

### 3.3 Normalize the remote service and its methods (`module.service.yaml`)
- `module` = `module.name`.
- One entry per `service_method`; names unique, become the request's `service_method` values.
- Every `from` path in `remote_request.body.params` must resolve to `requestId`, `service_method` or an existing
  `data.<param>` of the same method; the body must NOT declare `callback_url` (fixed, generator-added).
- Every remote status value (response and, if present, callback) is in exactly **one** `status_map` item; mapped
  statuses are only `success`/`process`/`fail`.
- No `callback` key = the final result is in the response (services without callbacks).

### 3.4 Extra tables (only if needed, §1)
1. If the user names tables/columns, use them as declared.
2. If the requests/data clearly imply storage beyond the host's `process` table and the user has not said so, propose a
   table (name `<module.name>_<resource>`, columns from the relevant parameters: `string`→`string(255)`,
   `integer`→`integer`, `boolean`→`boolean`, `number`→`float`; `nullable`/`default` copied; `created_at`/`updated_at`
   integer columns) and ask for confirmation **before** writing it into the spec.
3. Every extra table gets `entity: {generate: true, class: <StudlyCase>}` and, if it has NOT NULL columns without
   defaults, a proposed `records` sample (source order: matching parameter `example` → column `default` → type sample →
   `${now}` for `created_at`/`updated_at`). Tell the user records were generated and show them.
4. If the module needs nothing beyond `process`, leave `migrations.extra_tables: []` - do not invent a table.

### 3.5 Write, validate, document, report
1. Create `module.yaml` and `module.service.yaml` from the templates with `yaml-write` (copy, then edit; minimal diffs,
   comments kept, `spec_version` unchanged).
2. Parse and run `yaml-analyze` on both. Fix own mistakes; ask about anything needing a decision. Repeat until no errors.
3. Generate `module.service.md` from `templates/module.service.md` §1 (rules) and §3 (template), and `module.tests.md`
   from `templates/module.tests.md` §1 and §3 - only after step 2 has no errors. Both are regenerated from scratch (no
   hand-written state). Check against `templates/module.service.md` §4 (S1-S9) and `templates/module.tests.md` §4 (T1-T8).
4. Report: paths of the four files; the module block; a table of requests; a table of extra migrations → tables →
   columns (or "none - process tracking only"); generated records if any; the scenarios and checkbox count of
   `module.tests.md`; open points (from `module.service.md` §10) - then continue with §3.6.

### 3.6 Run the rest of the pipeline
After the specs are written and valid (§3.5 steps 1-3 done, no open question that blocks generation), run in this order:
1. Skill **`generate-module`** for `<name>` - the host code in `demo/modules/<id>/` (stage 2a).
2. Skill **`generate-emulator`** Part B for `<name>` - the emulated service in `emulator/modules/<id>/` (stage 2b; it
   reads the same specs and does not touch `demo/`, so 1 and 2 are independent, but both must be done before 3).
   Part B's own B.8 must not start `test-module` - this skill does it.
3. Skill **`test-module`** for `<name>` - builds/updates `development/test/<name>/module_<name>.md`, runs it live
   against both apps and loops with `fix-code` (max 5 iterations).

A stage that fails stops the pipeline: the report names the stage and what is left, and later stages never run
against a broken earlier one. Do not start generation if the user answered "specs only" / "don't generate yet", or if
a spec question is still open - report the specs and stop after §3.5.
The final report combines everything: the spec report (step 4 above), then each stage's own report (files per layer,
migrations/`service` row, check and test counts, review verdicts) and the `test-module` outcome (clean, or N rows
open with their backlog files).

## 4. Rules and limits

1. Never invent required information (author, business fields, table names); ask.
2. Never leave template placeholder values in the final files.
3. Keep identifiers as the user wrote them except normalization the format requires (case, `snake_case`); report every
   normalization.
4. Write only inside `development/<name>/specs/`. Do not edit the templates.
5. This skill itself writes no code, touches no database and makes no `demo/`/`emulator/` changes - the stages it
   starts in §3.6 (`generate-module`, `generate-emulator` Part B, `test-module`) do, each under its own rules.
6. Idempotent: running again with the same input yields the same files (except the generation date in the two `.md`
   documents).
7. `module.id` always equals `module.name` - never ask for or accept two different values.
8. `callback_url` is never part of the user's input or of `remote_request.body.params` - it is fixed, generator-added
   (flow.md §1a); do not ask about it, do not let the user redefine it.

## 5. Acceptance criteria

| # | Given | When | Then |
|---|-------|------|------|
| G1 | a user message with module name, author and one service method | the skill runs | asks only for the still-missing data, once |
| G2 | complete input | the skill finishes | `module.yaml` and `module.service.yaml` exist in `development/<name>/specs/` and parse |
| G3 | the file | inspect `module` | values from the user; `id` = `name`; no placeholder author |
| G4 | the file | inspect `requests` | standard `init`/`callback` unchanged, extra requests (if any) follow |
| G5 | the file | inspect `migrations` | `register_service: true` always; `extra_tables` empty unless the module needs storage beyond `process` |
| G6 | `module.service.yaml` | inspect | `module` = `module.name`; every `from` path resolves; every remote status mapped exactly once; no `callback_url` in `body.params`; methods without callback have no `callback` key |
| G7 | the two YAML files | run `yaml-analyze` | no errors |
| G8 | an existing `module.yaml` | the skill runs | asks update/replace before touching it |
| G9 | `module.service.md` | check S1-S9 of `templates/module.service.md` §4 | all hold |
| G10 | `module.tests.md` | check T1-T8 of `templates/module.tests.md` §4 | all hold |
| G11 | the working tree after §3.5 (before §3.6) | inspect | only the four files under `development/<name>/specs/` were created/changed |
| G12 | the report | read | lists generated records (if any), normalizations, open points, and the outcome of each pipeline stage (§3.6) |
| G13 | the pipeline (§3.6) | the specs are valid | `generate-module`, `generate-emulator` Part B and `test-module` run in that order; a failed stage stops it |
