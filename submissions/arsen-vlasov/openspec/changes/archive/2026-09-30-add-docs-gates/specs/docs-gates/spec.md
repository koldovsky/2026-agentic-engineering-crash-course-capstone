# Spec Delta

## Purpose

Keeps the harness and the documents in a shape that an agent can navigate and read without a human.
The checks fail with a message that says how to fix each problem.

## ADDED Requirements

### Requirement: The scope is explicit and never empty

The checks SHALL apply to these files: `AGENTS.md`, `ARCHITECTURE.md`, `CLAUDE.md`, the Markdown files
under `docs/`, `.claude/` and `openspec/`, and the rule files `.claude/rules/*.md`. `docs/bugs/**` SHALL
be exempt from the language check, because bug text is Russian on purpose. These paths SHALL be exempt
from the STE ratchet:
- the vendored skill under `.claude/skills/asd-ste100/`, because the project does not edit vendored files.
- `docs/bugs/**`, because the STE rules are for English text.
- `openspec/changes/archive/**`, because an archived change is a record and is not rewritten.

Each check SHALL print the number of files it checked. A check that finds 0 files SHALL
fail.

#### Scenario: Empty scope

- **WHEN** the file list is empty
- **THEN** the check fails with `0 files in scope`, and it does not report a pass

### Requirement: AGENTS.md stays a map

The check SHALL fail when `AGENTS.md` has more than 100 lines. The message SHALL name the line count
and say to move detail into `docs/` and link it.

#### Scenario: A long AGENTS.md

- **WHEN** `AGENTS.md` has 101 lines
- **THEN** the check fails with `AGENTS.md has 101 lines (limit 100)` and the fix message

### Requirement: Relative links resolve

The check SHALL resolve every relative Markdown link `text` outside code, from the directory of
the file that contains it. It SHALL ignore `http:`, `https:`, `mailto:` and `#` links. Each broken link
SHALL be reported as `file:line → target`.

#### Scenario: A broken link

- **WHEN** `docs/a.md` line 3 links to `missing.md` and that file does not exist
- **THEN** the check fails with `docs/a.md:3 → missing.md`

### Requirement: Every document is reachable from the index

Every `.md` file under `docs/` SHALL be reachable from `docs/index.md` through relative links, directly
or through other docs. An unreachable doc SHALL be reported as an orphan, with the advice to add it to
`docs/index.md` or to the index of its folder.

#### Scenario: An orphan

- **WHEN** `docs/design/new.md` exists and no reachable doc links to it
- **THEN** the check fails with `orphan: docs/design/new.md`

#### Scenario: Reachable through a folder index

- **WHEN** `docs/index.md` links to `reviews/index.md`, and that file links to `reviews/x.md`
- **THEN** `docs/reviews/x.md` is not an orphan

### Requirement: No Cyrillic prose in harness and document text

A line SHALL count as Cyrillic prose when it still contains Cyrillic letters after these parts are
removed: code fences, inline code, text in «…», and text in "…" or “…”. Each such line SHALL be
reported as `file:line`, with the advice to translate it and to quote a UI string in «…» or backticks.
The check SHALL use a per-file baseline ratchet, the same way as `rules:lint`. A count above the
baseline fails, and a lower count asks for a baseline update.

#### Scenario: A quoted UI string is data

- **WHEN** a line reads ``Click «Применить» or `Ментор` `` and has no other Cyrillic
- **THEN** it is not reported

#### Scenario: Prose is reported

- **WHEN** a line reads `Открыть таблицу и проверить фильтры`
- **THEN** it is reported, and the file fails if its count is above the baseline

#### Scenario: Bug drafts are exempt

- **WHEN** a line of Cyrillic prose is in `docs/bugs/2026-09-30-x.md`
- **THEN** it is not reported

### Requirement: The git-ignore policy holds

The check SHALL ask git whether paths are ignored (`git check-ignore`). `.cursor/` SHALL be ignored.
These paths SHALL NOT be ignored: `docs/logs/`, `docs/index.md`, `.claude/rules/`, `openspec/`,
`ci/known-failures.json`. A violation SHALL name the path and point to `docs/harness/git-policy.md`.

#### Scenario: A committed path is ignored

- **WHEN** `.gitignore` has a pattern that matches `docs/logs/`
- **THEN** the check fails with `docs/logs/ must be committed but is ignored`

### Requirement: STE hard violations do not grow

`docs:ste` SHALL run the vendored ASD-STE100 linter on the files in scope. It SHALL count the hard
violations per file (level `advisory-free`), and SHALL compare them with `.ste-baseline.json`.
- A file above its baseline, or a new file with more than 0 hard violations, SHALL fail. The message
  SHALL name the file, the rules and the lines.
- A file below its baseline SHALL pass, with the advice to run `npm run docs:ste -- --update-baseline`.
- Advisory findings SHALL never fail the run.

#### Scenario: Records and bug text are not rewritten

- **WHEN** a file is under `openspec/changes/archive/` or `docs/bugs/`
- **THEN** `docs:ste` does not check it

#### Scenario: A new semicolon

- **WHEN** a file has baseline 0 and now has 1 semicolon outside code
- **THEN** `docs:ste` fails and names the file, the rule `semicolon` and the line

#### Scenario: Python is missing

- **WHEN** `python3` cannot be started
- **THEN** `docs:ste` fails with `python3 not found — docs:ste cannot run`, and it does not report a pass
