# development/

Planning and process artifacts, not application code (`demo/`, `emulator/`). Two independent things live here:

- `<name>/specs/` - one module's specs, written by skill `create-module`: `module.yaml`, `module.service.yaml`,
  `module.service.md`, `module.tests.md`. Read by `generate-module` and `generate-emulator` Part B.
- `analize_<start_ts>_<check_ts>.md` - a code-analysis report (static: design-review + phpstan), written and updated
  by skill `analyze-code`, acted on by skill `fix-code`. One file per analyze-fix process
  (`.claude/skills/analyze-code/SKILL.md` §3).
- `test/<module name>/module_<module name>.md` - a module's final test spec: built by skill `test-module` from the fixed base
  categories (`.claude/skills/test-module/specs/module-test-base.md`) expanded with that module's own status map and
  error codes, then actually executed against the stack (init, callback, status changes, every final status, every
  remote-service error code) - plan and live-result report in the one file, no timestamp, acted on by skill
  `fix-code`. One file per module, edited in place across every test-fix iteration
  (`.claude/skills/test-module/SKILL.md` §2-§3).
- `backlog/` - one file per problem still open when a `fix-code`/`test-module` run ended, **scoped** to where the
  problem lives (`fix-code` SKILL.md §4.0-§4.1), not flat:
  - `backlog/<demo|emulator>/<module name>/<id>.md` - a problem specific to that module (`demo/modules/<id>/` or
    `emulator/modules/<id>/`).
  - `backlog/<demo|emulator>/<id>.md` - a problem in that app but not specific to any module (host `domain/`,
    `application/`, `infrastructure/`, `controllers/`, `config/`, ...).
  - `backlog/<id>.md` (no app/module subdirectory) - neither (a skill file, a project doc, something not scoped to
    one running app).
  Persists across runs.
- `complete/` - problems resolved, moved from `backlog/` (or created fresh if never backlogged) with a description
  of the fix (`fix-code` SKILL.md §4.2) - mirrors `backlog/`'s same scoped layout.
