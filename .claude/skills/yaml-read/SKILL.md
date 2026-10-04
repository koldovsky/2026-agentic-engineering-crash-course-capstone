---
name: yaml-read
description: Read and summarize any YAML file of this project (compose.yaml, module and application configs, CI workflows, module configs under demo/modules and emulator/modules) without modifying it - locate it, parse it with a real parser, report its structure and values faithfully. Use whenever the user asks what a YAML file contains, or before changing or analyzing one.
---

# Read a YAML file

Read-only. Never edit the file while reading; never "fix" values. If something looks wrong, report it (and suggest
`yaml-analyze`).

## 1. Locate the file
- Use the path the user gave. Otherwise `Glob` for `**/*.yaml` and `**/*.yml` from the repository root, skipping `vendor/`,
  `node_modules/`, `runtime/` and `.git/`. Modules live in `demo/modules/<id>/` and `emulator/modules/<id>/`; the apps in `demo/` and
  `emulator/`.
- If several candidates exist, list them and ask which one; do not pick silently.
- Note what kind of file it is, because that decides how it is parsed and checked:
  - **Docker Compose** (`compose.yaml`, `docker-compose*.yml`);
  - **a file with a known external schema** (GitHub Actions `.github/workflows/*.yml`, Codeception `*.suite.yml`, …);
  - **a template/example** (`*.default.yaml`, `*.example.yaml`, `*.dist.yml`: example values and commented-out blocks);
  - **a project data/config file** whose format is described only by its own header comments.

## 2. Read it
1. `Read` the file completely. Comments carry rules: field descriptions, allowed values, conventions.
2. Parse it with a real YAML parser instead of interpreting indentation by eye when the structure is non-trivial (nested
   lists, anchors/aliases, merge keys `<<:`, flow style `{a: 1}`, multi-line strings). Procedures that work in this project,
   with nothing added to the repository:
   - **Compose files:** the resolved model as Compose sees it (interpolated, merged):
     ```bash
     docker compose config --no-interpolate      # structure without substituting .env values
     ```
     Never print the interpolated output (`docker compose config` without `--no-interpolate`): it contains secrets from `.env`.
   - **Any YAML file** (throwaway parser in the php-cli container; host path conversion off for Git Bash on Windows):
     ```bash
     # 1) install the parser outside the repository
     MSYS_NO_PATHCONV=1 docker compose exec php-cli sh -c 'mkdir -p /tmp/yamlcheck && cd /tmp/yamlcheck && composer require symfony/yaml -q --no-interaction'
     # 2) parse a file (the repository root is mounted at /app) and print JSON
     MSYS_NO_PATHCONV=1 docker compose exec php-cli php -r 'require "/tmp/yamlcheck/vendor/autoload.php"; echo json_encode(Symfony\Component\Yaml\Yaml::parseFile("/app/<path>"), JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES);'
     # 3) clean up
     MSYS_NO_PATHCONV=1 docker compose exec php-cli rm -rf /tmp/yamlcheck
     ```
   If the containers are not running, read the file with `Read` only and say the structure was not machine-parsed.
3. A parse error is a result, not an obstacle: report the message and line, stop, and do not guess the intended content.

## 3. Interpret values exactly
- **Absent key ≠ `null` ≠ empty string ≠ empty list.** A key with no value (`key:`) is `null`. If the file's header comments
  define other semantics, follow them. Report these cases differently.
- Placeholders are **not** resolved by parsing: `${VAR}` / `${VAR:-default}` in Compose come from the environment/`.env`,
  other `${...}` forms are defined by the file's own conventions. Report them as placeholders; never look up or print the
  values of secrets.
- Anchors (`&name`), aliases (`*name`) and merge keys (`<<: *name`): report the resolved result and say that it came from an
  anchor.
- Commented-out blocks are examples, not data: mention that they exist, do not treat them as content.
- Types matter: `"1"` (string) vs `1` (integer); `yes/no/on/off` may be parsed as booleans by YAML 1.1 parsers; `0755`
  may be octal; `1e3` is a number. Quote from the parsed result, not from memory.
- Keep identifiers, names and values verbatim (case, underscores). Do not translate or "normalize" them.

## 4. Report
Give, in this order (short, tables where useful):
1. **File**: path, kind (see §1), version field if present (e.g. a `version` key), size (top-level keys and their item counts).
2. **Outline**: the tree down to the level that is meaningful (e.g. services → image/build, ports, volumes, depends_on),
   one line per node with its key fields.
3. **Values the user asked about**, quoted exactly (secrets masked).
4. **Oddities you noticed** (missing required-looking keys, empty lists, duplicate names, unresolved placeholders) - only
   listed, not fixed. Suggest `yaml-analyze` for a full check.

State plainly what you did not verify (e.g. "not machine-parsed").
