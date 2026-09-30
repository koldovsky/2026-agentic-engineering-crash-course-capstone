# Tasks

## 1. Tests first (red)

- [x] 1.1 Fixtures in `scripts/ci/fixtures/`: green, zero-executed, no-report, running, aborted, known-only, new-among-known, fixed-and-stale, many-failures, bearer-in-error
- [x] 1.2 `scripts/ci/jenkins-report.test.mjs`: one test per spec scenario, against the pure core and the offline CLI
- [x] 1.3 `harness:test` in `package.json` and in `check`; run it and see it red (module missing)

## 2. Implementation (green)

- [x] 2.1 `scripts/ci/jenkins-report.mjs`: pure `verdict()`, formatter with redaction and the 15-line limit
- [x] 2.2 Shell: argument parsing, offline `--from <file>`, live fetch with `JENKINS_*` from `.env`, exit codes
- [x] 2.3 `ci/known-failures.json`, empty list
- [x] 2.4 `harness:test` green; `npm run check` green

## 3. Skill and live check

- [x] 3.1 `.claude/skills/jenkins-verify/SKILL.md`: when to run, what each verdict means, a new failure goes to `bug-report`
- [x] 3.2 One live run per job; record the output (sanitised) and any spec change reality forced
- [x] 3.3 `openspec validate --strict`, then archive the change

## 4. Allure as the data source (added after the first live run)

- [x] 4.1 Invented fixture `scripts/ci/fixtures/allure-suites.json` in the plugin's `suites.json` shape, with passed, failed, broken, skipped and a nested describe
- [x] 4.2 Tests for the conversion (identity `<spec> › <name>`, status mapping, broken counts as failed); see them red
- [x] 4.3 Implement `fromAllure()` and switch the live fetch to `/allure/data/`; green; `npm run check` green
