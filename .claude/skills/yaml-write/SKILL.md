---
name: yaml-write
description: Create or edit any YAML file of this project (compose.yaml, module and application configs, CI workflows, module configs under demo/modules and emulator/modules) - add, change or remove entries while keeping its structure, comments and semantics intact, and verify the result parses. Use when the user asks to create a YAML file or change values in one.
---

# Write / edit a YAML file

Goal: valid YAML that keeps the file's structure and comments, changes only what was asked, and never contains invented
data or secrets.

## 1. Before writing
1. Read the target with `yaml-read` (or the template/example you will copy). Learn the structure, the conventions written in
   the header comments (absent vs `null`, placeholders, allowed values) and, for a file with an external schema (Docker
   Compose, GitHub Actions, …), the keys that schema allows.
2. New file from a template/example (`*.default.yaml`, `*.example.yaml`, `*.dist.yml`): copy it to the destination and edit
   the copy. Never edit the template itself unless the user asks to change the template.
3. Missing information (names, types, defaults, ports, image tags) is **asked**, not invented. Placeholder values copied from a
   template are reported as "still to be filled", not left silently.
4. Confirm the destination before overwriting an existing file; show what will change.
5. Project rules for particular files apply on top of this skill: environment changes go through `compose.yaml`, `docker/**`
   and `.env.example`, and new variables go into `.env.example` (AGENTS.md). Never write secrets into a YAML file; use
   `${VAR}` interpolation from `.env` instead.

## 2. Editing rules
- Use `Edit` for changes to an existing file (minimal diff). Use `Write` only for a brand-new file or when the user asks for
  a rewrite. Do not reorder keys, reformat untouched blocks or drop comments.
- Keep the file's key order and naming style exactly (`snake_case`, `kebab-case`, … as already used); do not add keys the
  format does not define without saying so.
- Indent as the file already does (2 spaces if new), no tabs. Lists use `- `. Keep flow style (`{a: 1}`) only where the file
  already uses it.
- Quote strings that could be misread: values containing `: `, `#`, leading `${`, `*`, `&`, `!`, `@`, `%`, or that look like
  booleans/numbers/null when they are meant as text (`"yes"`, `"on"`, `"1.0"`, `"null"`, `"0755"`), port mappings
  (`"80:80"`), and empty strings (`""`).
- Absent vs `null`: to say "not set" **omit** the key; write `null` only when an explicit null is meant. Do not add
  `key: null` "for completeness".
- Identifiers (service names, job ids, list item ids) must be unique within their scope; keep them consistent with every
  place that references them (see §3).
- Placeholders (`${...}`) and anchors/aliases are kept as written; do not expand them unless asked.
- Comments: keep existing ones; add a short `# why` only for non-obvious decisions. Commented-out example blocks stay
  commented out.
- UTF-8, LF line endings, newline at end of file.

## 3. Keep references consistent
When you add, rename or remove something, update everything that points at it in the same edit, for example:
- Compose: a service → `depends_on`, `links`, network `aliases`, `extends`, and host names used by other services or by
  `docker/` configs (e.g. nginx `fastcgi_pass php-fpm:9000`); a named volume or network → its top-level `volumes:` /
  `networks:` declaration; an environment variable → `.env.example`;
- anchors → every alias that uses them;
- any id/name → every other key or file in the repository that refers to it (`Grep` for it before renaming).
Then run the checks of `yaml-analyze` on the touched parts.

## 4. After writing (always)
1. Parse the file (procedure in `yaml-read` §2); for Compose files also `docker compose config -q`. A file that does not
   parse is not done.
2. Compare the parsed data with the intent: print the affected part back as JSON/outline and check it against the request
   (types preserved, absent keys still absent, no accidental `null`/string conversions).
3. Report: file path, what was added/changed/removed (bullets), values still to be filled, and the parse result.
