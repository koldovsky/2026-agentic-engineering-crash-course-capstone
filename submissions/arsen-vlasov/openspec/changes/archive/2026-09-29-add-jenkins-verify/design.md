# Design

## Context

The jobs run Playwright with the CI reporter set (`list`, `junit` to `test-results/results.xml`,
`allure-playwright`). Jenkins exposes the JUnit results through its JSON API. The CLI is a harness
script, so it follows the harness conventions: Node only, no new dependency, secrets from `.env`,
tests with `node --test`.

## Decisions

**CLI, not an MCP server.** A script costs no context until it runs, and prints only the summary.
An MCP server would add tools to every session and return raw JSON into the window.

**Data source — changed after the first live run (2026-09-29).** The original design read Jenkins'
JUnit report (`/testReport/api/json`). All three jobs answered 404 there: they publish no JUnit at
all, only the Allure report through the Allure plugin (`/allure/`) and `allure-results/` as
artifacts. The CLI reported NOT-EARNED for all three builds — correct by the spec, useless in
practice. The source is now the Allure plugin's report data:

1. `/job/<job>/<n|lastCompletedBuild>/api/json?tree=number,result,building,url,timestamp,duration`
2. `/job/<job>/<n>/allure/data/suites.json` — a tree `root → project (chromium | api) → spec file →
   describe… → test`, each test with `uid`, `name`, `status`. A 404 means "no test report".
3. `/job/<job>/<n>/allure/data/test-cases/<uid>.json` — only for the new failures that get printed
   (at most 15), for the first line of `statusMessage`.

The Allure tree is converted into the same neutral report shape the core already takes
(`suites[].cases[]` with `className`, `name`, `status`, `errorDetails`), so `verdict()`, its tests and
the existing fixtures stay as they are.

**Pure core, thin shell.** `verdict(build, report, known)` takes plain objects and returns the
verdict object; the shell only fetches or reads the saved file, formats and exits. Tests cover the core
with fixtures and the shell with one offline run per exit code.

**Test identity** is `<suite> › <name>`, where the suite is the spec path (the second level of the
Allure tree, the same value as the Allure `suite` label) and the name is the test title.
It survives reordering and parallel workers; it breaks when a test is renamed, which then shows up as
one `fixed`/`stale` entry plus one `new` failure — visible, not silent.

**Status mapping.** Allure `passed` → PASSED; `failed`, `broken` → FAILED; `skipped`, `unknown` →
SKIPPED. The core keeps accepting the JUnit statuses too (`FIXED`, `REGRESSION`), should a job start
publishing JUnit later.

**Known failures** live in `ci/known-failures.json`:
`[{ "test": "<suite> › <name>", "reason": "…", "issue": "PRJ-1234", "added": "YYYY-MM-DD" }]`.
Adding an entry is a human decision (it makes a red test not count). The CLI never writes this file.

**Saved build format** for offline mode: `{ "build": <build json>, "report": <report json or null> }`.
The fixtures are hand-made in this format, with invented names, so no real data enters the repository.

## Risks

- ~~The JUnit report may be published under a different action in these jobs, or not at all.~~
  It was not published at all; see "Data source" above.
- Access: the variables must be present in the root `.env` for harness scripts.
  **Changed during implementation:** the CLI loads the root `.env` and then `config/.env` (the file
  Playwright reads): the first live probe saw none of the variables from the root file alone, and
  with both files loaded the CLI got past the credentials check.
- Network: the first live run from the author's machine timed out on connect
  (`UND_ERR_CONNECT_TIMEOUT`) while other hosts answered — Jenkins is reachable only from the office
  network or VPN. The CLI now prints the cause code instead of a bare `fetch failed`.
