---
name: jenkins-verify
description: >-
  Check a Jenkins build of the autotest jobs (stage-api-tests, lms-stage-regression-tests,
  admin-stage-regression-tests) and return PASS, FAIL or NOT-EARNED. It splits the failures into
  new, known, fixed and stale against ci/known-failures.json. Use it when asked whether the
  nightly or last Jenkins run is green, what failed in Jenkins, to check a build number, or
  to check a change in CI.
---

# Check a Jenkins build

Run the script. Do not open Jenkins JSON yourself. Do not judge by the build colour. A green build
with zero executed tests is not a pass.

```bash
node scripts/ci/jenkins-report.mjs <job> [<build number>|last]
```

Jobs: `stage-api-tests`, `lms-stage-regression-tests`, `admin-stage-regression-tests`.
Treat Jenkins as read-only. Never trigger, stop or rebuild a job.

## What the verdict means, and what to do

| Exit | Verdict | Next step |
|---|---|---|
| 0 | **PASS** — tests ran, no new failure | Report it with the counts line. List `fixed` and `stale` entries for the human to remove |
| 1 | **FAIL** — at least one new failure | For each new failure, run it locally on stage. Then the `bug-report` skill decides product / test / environment / flake |
| 2 | **NOT-EARNED** — running, aborted, no report, or 0 executed | Say why, from the reason line. Never call it green. A finished build without a report usually means that the build broke outside the tests. Link the console. Do not guess |
| 3 | access or usage error | Name the variable from the message. The human fixes `.env`. Never print a token value. Never ask for a token value |

To reproduce a new failure locally, run:

```bash
ENV=stage HEADLESS=true npx playwright test <spec from the "new" line> --repeat-each=3
```

## Known failures are a ratchet

`ci/known-failures.json` makes a red test not count. So:

- **Adding** an entry is the human's decision. Propose it with the test id, the reason and the
  Jira issue. Never add it yourself to turn a FAIL into a PASS.
- **Removing** `fixed` and `stale` entries is always right. Propose the removal in the reply.

Entry format: `{ "test": "<suite> › <name>", "job": "<job>", "reason": "…", "issue": "PRJ-1234", "added": "YYYY-MM-DD" }`.
Copy `test` exactly from the script output. `job` limits the `stale` status to builds of that job.
Without it, every other job would report the entry as stale.

## Before showing the result

- [ ] The script's verdict line quoted as is, with the build link
- [ ] NOT-EARNED never reported as green
- [ ] Every new failure either reproduced locally or marked "not reproduced yet"
- [ ] `ci/known-failures.json` unchanged, unless the human approved the exact entry
