# Design

## Pure core, thin shell

As in `scripts/ci/jenkins-report.mjs`, each check is a pure function over plain data, so the tests
need no repository:

- `lintDocs({ files, isIgnored })` in `scripts/docs/docs-lint.mjs`. `files` maps each path to its
  content, and `isIgnored(path)` is a function. It returns the findings of each check.
- The language check and `docs:ste` share `ratchet(counts, baseline)`. It returns the files that
  are new, worse and improved.

The shell reads the file list from `git ls-files -co --exclude-standard`, and calls
`git check-ignore -q` for the policy paths. It prints one line per check, in the `rules:lint` format,
and exits 0 or 1.

## Language rule

After removing code fences, inline code, «…», "…" and “…”, the line must have no letter in
`[А-Яа-яЁёІіЇїЄєҐґ]`. Tables get no special exception. You must quote a UI string in a table cell,
the same as in prose. That is what the STE pass does, and it keeps the rule simple.

## STE

`docs:ste` calls `python3 .claude/skills/asd-ste100/scripts/ste-lint.py --json` with all files in one
call. It groups `violations` by `file` and counts `level == "advisory-free"`. The baseline file is
`.ste-baseline.json` at the repo root, next to `.rules-lint-baseline.json`.

## Exemptions found on the first real run

The first run on the repository (2026-09-30) listed hard STE findings in `docs/bugs/`, which is Russian
text, and in `openspec/changes/archive/`. Both are now exempt from the STE ratchet (spec: "The scope is
explicit and never empty"). The language check still covers the archive.

## Baselines

`.docs-language-baseline.json` and `.ste-baseline.json` hold the counts when the checks start. Then the
translation and STE pass lowers them. The commit that lowers the counts also updates the baselines. Before and after, the counts are evidence.
