---
name: yaml-analyze
description: Analyze any YAML file of this project (compose.yaml, module and application configs, CI workflows, module configs under demo/modules and emulator/modules) for validity and internal consistency (syntax, duplicate keys, type pitfalls, unique names, broken references, unresolved placeholders, schema rules of known formats, leaked secrets) and report findings with severity and location - without changing the file. Use before relying on a YAML file or after editing one.
---

# Analyze a YAML file

Read-only audit. Output is a findings report; fixes are only proposed (apply them with `yaml-write` after the user agrees).

## 1. Prepare
1. Read and parse the file with `yaml-read` (including its header comments - for a project file they define its format:
   field lists, allowed values, absent vs `null`, placeholders).
2. Decide the file kind (`yaml-read` §1): Docker Compose, a file with a known external schema, a template/example, or a
   project file described by its own comments. Placeholder/example values are expected in a template and only *warnings*
   elsewhere.
3. Analyze what is in the file, not what you think should be there. If the format defines a field the file lacks, that is a
   finding; if the file has a field the format does not define, that is a finding too.

## 2. Checks

### A. Syntax and structure (error)
- File parses; no duplicate keys within one mapping (many parsers silently keep the last one - check the raw text); no tabs;
  consistent indentation.
- Anchors are defined before use; every alias refers to an existing anchor; merge keys (`<<:`) merge mappings only.
- Required top-level blocks (by schema or by the file's own comments) are present and of the right kind (mapping vs list).
- Every item of a list has the same shape where the format expects it (e.g. each item a mapping with its required keys).

### B. Values and types (error / warning)
- Scalars have the expected type: booleans really boolean, integers not strings (and vice versa).
- YAML 1.1 pitfalls: unquoted `yes/no/on/off/y/n` read as booleans; `0755` as octal; `1e3`, `1_000` as numbers; `12:30` as
  a sexagesimal number; port mappings like `22:22` unquoted - flag each one where text was meant.
- A key with an empty value (`key:`) is `null` - flag it where "absent" or an empty string was meant.
- Enumerations only use allowed values (by schema or by the file's comments).
- Placeholders: every `${...}` is resolvable - Compose variables exist in `.env.example` (never read or print `.env` values);
  other placeholders are defined by the file's own conventions.

### C. Uniqueness (error)
- Names that act as ids are unique in their scope (services, networks, volumes, jobs/steps ids, list item ids).

### D. References (error)
- Everything that points at a name resolves: aliases → anchors; Compose `depends_on` / `extends` / `volumes_from` → existing
  services; named volumes and networks used by a service → declared at top level; `build.context` / `dockerfile` /
  `env_file` / bind-mount sources → existing paths in the repository.
- References to other files of the repository (paths, class names, host names) exist - `Grep`/`Glob` for them.

### E. Schema of known formats
- **Docker Compose:** `docker compose config -q` passes; `depends_on` with `condition: service_healthy` targets a service
  that has a `healthcheck`; published ports do not collide; the file follows the project rules in AGENTS.md (ports 80/81 for
  nginx, secrets only via `${VAR}` from `.env`).
- **Other known schemas** (GitHub Actions, Codeception suites, …): required keys and allowed values of that format; if you
  are not sure of a rule, say so instead of guessing.
- **Project files described by comments:** the rules written in the header comments.

### F. Security (error)
- No secrets in plain text: passwords, tokens, API keys, private keys. They belong in `.env` (git-ignored) and are referenced
  as `${VAR}`. Report the location only; never quote the value.

### G. Semantics and completeness (warning unless stated)
- Contradictions inside the file (e.g. a value outside a range documented in the same file).
- Leftovers: example/placeholder values in a non-template file, empty lists or mappings, commented-out blocks that look like
  forgotten data.
- Cross-file consistency the user cares about (e.g. `compose.yaml` ↔ `docker/nginx/default.conf` ↔
  `docs/architecture/technical.md`) - report mismatches as questions, not errors.

## 3. Report format
1. **Verdict** (one line): `ok` / `ok with warnings` / `not ok`, plus counts (errors, warnings, notes).
2. **Findings table**, sorted by severity then location:

   | # | Severity | Location (path in the document) | Finding | Suggested fix |
   |---|----------|---------------------------------|---------|---------------|

   Location is a readable path such as `services.php-fpm.environment.DB_HOST` (add the line number if known).
3. **Checks that passed** - one line listing the groups A–G with no findings, so it is clear what was covered.
4. **Not checked** - anything you could not verify (for example: the file was not machine-parsed).

Do not edit the file. If the user agrees with the fixes, hand over to `yaml-write` and re-run this analysis on the result.
