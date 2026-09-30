# Spec Delta

## Purpose

Makes the project checks run at the moment of the change. The checks run after each edit, before each
commit and at the start of each session. The guard makes these gates binding for the agent.

## ADDED Requirements

### Requirement: A doc edit is checked at once

After an `Edit`, `Write` or `MultiEdit` of a file in the docs-gates scope, the hook SHALL run the
language check and the STE linter on that one file. It SHALL compare each count with the baseline of
that file in `.docs-language-baseline.json` and `.ste-baseline.json`. When a count is above the
baseline, the hook SHALL exit 2 and print the findings with their lines and the fix. It SHALL skip the
paths that docs-gates exempts.

#### Scenario: Cyrillic prose in a skill

- **WHEN** an edit leaves the line `Открыть таблицу` in `.claude/skills/x/SKILL.md`, and the file baseline is 0
- **THEN** the hook exits 2 and names the file, the line and the fix

#### Scenario: A known finding does not nag

- **WHEN** an edit of `.claude/skills/jenkins-verify/SKILL.md` leaves 1 hard STE finding, and its baseline is 1
- **THEN** the hook exits 0

#### Scenario: Python is missing

- **WHEN** `python3` cannot start
- **THEN** the hook skips the STE part, prints a note, and does not block the edit

### Requirement: A code edit is checked at once

After an edit of a `.ts` file under `tests/` or `page-objects/`, the hook SHALL run `rules:lint`. It
SHALL report the `NEW` and `WORSE` lines that name the edited file, together with the rule and the fix.
It SHALL also run ESLint on the file and report the errors only. Any such finding SHALL exit 2.

#### Scenario: expect in a regression spec

- **WHEN** an edit adds `expect(` to a file under `tests/specs/regression/`
- **THEN** the hook exits 2 and names the rule `playwright-specs-no-expect.md`

#### Scenario: A new file is checked

- **WHEN** the edited spec is new, and git does not track it yet
- **THEN** `rules:lint` checks it the same way as a tracked file

### Requirement: The hooks never break a session

An internal error in a hook SHALL NOT block the agent. On empty or malformed input, or when a tool the
hook needs is missing, the hook SHALL exit 0. A missing tool SHALL also produce a note.

#### Scenario: Malformed input

- **WHEN** the hook receives `{not json`
- **THEN** it exits 0

### Requirement: The guard closes the known gaps

The guard SHALL block these actions:

- every read of `.agent-log/` through a tool call, including a glob such as `.agent-log/*.jsonl`
  (the summary commands `npm run agent:log` and the report script stay allowed)
- a `Grep` or `Glob` call with a path under `test-data/users/static/`
- `git commit` or `git push` with `--no-verify`, and `git commit` with the short flag `-n`.

The guard SHALL allow `.env.example`, because it is a template with no secrets. It SHALL still block
`.env`, `.env.local` and every other `.env.*` file.

#### Scenario: A glob on the journal

- **WHEN** the command is `wc -l .agent-log/*.jsonl`
- **THEN** the guard blocks it

#### Scenario: The template is readable

- **WHEN** the command is `cat .env.example`
- **THEN** the guard allows it, and `cat .env.local` is still blocked

#### Scenario: Grep on a static user file

- **WHEN** a `Grep` call has the path `test-data/users/static/stage.json`
- **THEN** the guard blocks it

#### Scenario: Skipping the git hooks

- **WHEN** the command is `git commit --no-verify -m x` or `git commit -nm x`
- **THEN** the guard blocks it, and `git log -n 5` is still allowed

### Requirement: A commit cannot hide debt

The pre-commit hook SHALL read the staged versions of files and compare them with `HEAD`. It SHALL
block the commit in these cases, and name the file and the key:

- a staged file named `.env` or `.env.*`, except `.env.example`
- a baseline entry that is new or larger than in `HEAD`. The baselines are `.rules-lint-baseline.json`,
  `.ste-baseline.json`, `.docs-language-baseline.json` and `eslint-suppressions.json`
- a new entry in `ci/known-failures.json` whose `issue` does not match `PRJ-<number>`.

A smaller or removed baseline entry SHALL pass.

#### Scenario: A baseline grows

- **WHEN** the staged `.ste-baseline.json` has `"AGENTS.md": 2`, and `HEAD` has `"AGENTS.md": 1`
- **THEN** the commit is blocked, with the file, the key and the reason

#### Scenario: A baseline shrinks

- **WHEN** the staged `.ste-baseline.json` has no `AGENTS.md` entry, and `HEAD` has `"AGENTS.md": 1`
- **THEN** the commit passes

#### Scenario: A known failure without an issue

- **WHEN** a staged new entry in `ci/known-failures.json` has `"issue": "TODO"`
- **THEN** the commit is blocked

### Requirement: A session starts from the last notes

At session start, a hook SHALL print the newest block of `docs/logs/session-notes.md`: the first
`## ` section, up to the next one. When the file or the block is missing, the hook SHALL print nothing
and exit 0.

#### Scenario: The newest block

- **WHEN** the notes file has two `## ` blocks
- **THEN** the hook prints only the first block
