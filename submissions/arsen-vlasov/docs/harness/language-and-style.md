# Language and style

## Language

All harness and document text is English. This covers `AGENTS.md`, `ARCHITECTURE.md`, `CLAUDE.md`,
`docs/`, `.claude/` and `openspec/`. For the same content, English costs roughly a third of the
tokens that Cyrillic costs.

Three things stay in their original form, because they are data, not prose. Put them in «…» or
backticks:

- product UI strings (`Поиск студента`, `Дата от`)
- role names from the admin panel (`Главный администратор`, `Ментор`)
- example test titles, which this project writes in Russian and Ukrainian

One exception: the **bug text** in `docs/bugs/` is Russian, because the team reads Jira in Russian.
The template and the skill that writes it are English (`.claude/skills/bug-report/`).

## Style: ASD-STE100

Every harness and document text passes the ASD-STE100 skill after someone creates or edits it. The
skill is vendored in `.claude/skills/asd-ste100/` (see its `VENDORED.md`).

- **Strict mode** applies to rules, skills, the agent definition, and hook, guard and lint messages.
  An agent follows these texts.
- **STE-flavored mode** applies to the documents in `docs/` and `openspec/`.

## Checks

| Check | What it fails on | Command |
|---|---|---|
| `english-only` | a line with Cyrillic outside «…», "…", backticks or code, above the per-file baseline | `npm run docs:lint` |
| `docs:ste` | hard STE findings (semicolons, phrasal verbs, long sentences, nominalizations, marketing adjectives, synonym rotation) above the per-file baseline | `npm run docs:ste` |

Both run in `npm run check`. Their baselines are `.docs-language-baseline.json` and
`.ste-baseline.json`. The baselines can only go down.

These paths are not in the STE check:

- `.claude/skills/asd-ste100/`, because it is vendored
- `docs/bugs/`, because it is Russian text
- `openspec/changes/archive/`, because it is a record

Known exception: `.claude/skills/jenkins-verify/SKILL.md` keeps 1 synonym-rotation finding. The
skill name contains the other verb of the pair (`jenkins-verify`). The description needs the trigger phrase "check a build number". A
rename of the skill would break its references, so the baseline keeps this 1 finding.

## Measured on 2026-09-30

| | Before the pass | After the pass |
|---|---|---|
| Files with Cyrillic prose | 24 (560 lines) | 0 |
| Hard STE findings | 224 in 42 files | 1 in 1 file (the exception above) |

Two checker agents then compared each rewritten file with the version before (maker ≠ checker):

- Checker 1 found 6 files with a meaning change or a lost skill trigger. The agent fixed 5 of them.
  It kept 1, the English bug template, because that is the human's decision.
- Checker 2 found 2 records that the agent itself had changed. The agent restored them and added dated
  notes.

See `docs/logs/autonomy-log.md`.
