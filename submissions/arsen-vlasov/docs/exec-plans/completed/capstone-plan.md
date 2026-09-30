# Capstone plan — Agentic Engineering (fwdays, 2026)

The capstone project is the harness of this autotest repository (Playwright + TS, LMS and Admin Panel).
The submission deadline is **2026-10-04**. The requirements are the README, the RUBRIC and the PR template
in the [capstone repo](https://github.com/koldovsky/2026-agentic-engineering-crash-course-capstone).
The main rule of the rubric: one practice with clickable evidence is worth more than five practices that are only named.

## Decisions (2026-09-29)

| Question | Decision |
|---|---|
| Jenkins | `https://jenkins.example.com/`, jobs `admin-stage-regression-tests`, `lms-stage-regression-tests`, `stage-api-tests`. A separate pipeline starts them on a schedule. How that pipeline works is out of scope |
| `.claude/` and `.cursor/` in git | Track them |
| Bugs | Only a draft in a file in `docs/bugs/`. A human files it in Jira |
| SDD | OpenSpec. The version is pinned exactly |
| Global `~/.claude/skills/api-test` | Remove it when the project skill is restored. There must be no window of time with no skill at all |

## Step 0.0 — authorization

| Service | Status on 2026-09-29 | What is necessary |
|---|---|---|
| GitLab `gitlab.example.com` (origin) | ✅ SSH reads (`git ls-remote`) | — |
| AIO Tests MCP (user-level) | ✅ `get_project PRJ` → enabled | Forbid writes in the permissions (phase 4) |
| Atlassian MCP (`.mcp.json`) | ❌ `needs_auth` | Human: `/mcp` → atlassian → sign in. Grant only read/search |
| Jenkins `jenkins.example.com` (2.528.3) | ❌ an anonymous user gets 403 on `/api/json` | Human: API token → `JENKINS_URL`, `JENKINS_USER`, `JENKINS_API_TOKEN` in `.env` |
| Context7 MCP (project) | ❌ «Invalid API key»: `settings.local.json` holds the placeholder `ctx7sk-...` | Human: the real key in `.env` → `npm run mcp:sync` → restart the session |
| Firecrawl MCP | ❌ placeholder key `fc-...`, and the client rejects the outputSchema of the tools (draft-07). It does not work with any key | Decide in phase 1: remove it from `.mcp.json` (the autotests do not need it, and WebFetch exists) |
| GitHub (capstone fork, PR) | ❌ no `gh` | Human: `brew install gh` → `gh auth login --web` |

## Baseline — findings before the start

1. **On `main`, the harness does not work for Claude.** `.claude/` and `.cursor/` are in `.gitignore`
   (commit `4ad2368` removed them from git). `.claude/rules/` is empty (the 22 symlinks are missing).
   `.claude/skills/{api-test,writing-autotests-from-tc}` are empty. There is no `.claude/settings.json`.
   A session loads only CLAUDE.md and AGENTS.md. The live versions are in
   `chore/agentic-harness@789573c`. AGENTS.md describes a harness that is not on disk.
2. **A glob gets past the guard.** `wc -l .agent-log/*.jsonl` → allowed. `cat .agent-log/actions.jsonl` → journal.
   The agent found this by chance during exploration (it only counted lines).
3. **The guard blocks too much.** `cat .env.example` → secret: the agent cannot read a template that has no secrets.
4. **The prod guard works.** The guard blocked an agent command that had the string `ENV=prod` inside a JS check (2026-09-29).
5. AIO Tests MCP can call `create/update_test_case`, but `project-base` forbids changes to a TC. So the ban is only advice.
6. The allow list in `settings.local.json` has `git add *`, `git commit -m *`, `git clone *` and one-off `cp` commands.
7. AGENTS.md has 212 lines (a folder map, the harness structure). The course asks for a map, not an encyclopedia.
8. 22 rules:
   - Some are procedures (`pro-trading-autotests` with 160 lines, `admin-panel-create-admin-user`).
   - `karpathy-guidelines` (alwaysApply) duplicates the skill.
   - `date-helper` is alwaysApply, and `rules:lint` already catches it.
   - The API knowledge is in 4 places (the rule, the project skill, the global skill, `docs/test-strategy/api/index.md`).
9. Context7 is connected twice: as a project server and as a claude.ai connector. This puts extra tools in the window.
10. `package.json` points the repository to `gitlab.com`, but origin is `gitlab.example.com`.
11. `.cursor/debug.log` (gitignored) holds a full Bearer JWT of a dev admin from an old debug session. The token expired, but a person must remove the file by hand.
12. The repo has no Jenkinsfile (commit `511899a` removed gitlab-ci). The harness scripts have no unit runner.

## Target structure

```
.claude/
  settings.json               defaultMode, deny/ask/allow — in git
  rules/*.md → .cursor/rules/*.mdc
  skills/
    ui-autotest/              TC → regression spec (formerly writing-autotests-from-tc)
    api-test/                 the only version, project-level
    bug-report/               triage + bug draft with evidence
    jenkins-verify/           Jenkins build analysis: PASS / NOT-EARNED / FAIL
    agent-log-report/
  agents/spec-reviewer.md     checker: read-only, a different model
openspec/                     config.yaml, specs/, changes/
scripts/ci/jenkins-report.mjs (+ fixtures, node --test)
docs/ autonomy-log.md · context-log.md · bugs/ · loops/ · harness.md
```

## Status on 2026-09-30

| Phase | Status | Evidence |
|---|---|---|
| 0 Restore and baseline | done | `3a77f59` |
| 1 Context diet | done | `c6cb469`, `docs/logs/context-log.md` |
| 2 Skills | done | `1ecfe4a`, the `jenkins-verify` OpenSpec change |
| 3 Verification, SDD, gates | done | `openspec/specs/`, `npm run check` (docs gates, `spec:check`, `harness:test`) |
| 4 Hooks | done | OpenSpec `add-edit-hooks`: `bce7631` → `ecaee28` → `fe74fa0` → `0fe4e06` |
| 5 Maker ≠ checker | done | `docs/reviews/2026-09-29-control-review.md` |
| 6 Loop | done (2026-09-30). The human first skipped it, then asked for it. After loop 2, the human stopped the fix loop for the flaky LMS tests | OpenSpec `add-stabilize-loop`: `e1a9540` → `51ace4a` → `e292bc1`. `docs/loops/index.md`, `docs/reviews/2026-09-30-loop2-helper-review.md` |
| 7 Real task (PRJ-TC-69) | done, except the Jenkins step | `docs/reviews/2026-09-29-phase7-gd-tc-69.md`. The Jenkins step needs the merge into `main` |
| 8 Packaging | the fork and the branch are pushed (2026-09-30). The pull request waits for the name, the video and the text of the human | `scripts/capstone/export.mjs` (`1b0dbc7` → `a2ea93c`). Fork `ArsenVlasov/2026-agentic-engineering-crash-course-capstone`, branch `arsen-vlasov`, commit `20b5f8d` |

Harness v2 (2026-09-30) also moved the rules into `.claude/rules/`, made `.cursor/` local, split the docs
behind `docs/index.md`, and passed all harness and doc text through English and ASD-STE100.

After the push of phase 8, the human moved this plan to `completed/`. The human also removed the
export tool (`scripts/capstone/`), the README source (`docs/capstone/`) and the two control inputs of
`docs/reviews/`. Git history has them: the export tool and the README source in `8dc0bac`, the control
inputs in `bded737`.

## Phases

### Phase 0 — restore and baseline
- Branch `chore/capstone-harness` from `main`. Return `.claude/` and `.cursor/` to git. Restore the rule
  symlinks, the skills, `settings.json` and the hooks from `789573c`. Compare them with the current
  `.cursor/rules` (edited on 2026-09-28).
- Baseline numbers: `npm run check`, `npm run hooks:selftest`, `/context` → `docs/logs/context-log.md`.
- `docs/logs/autonomy-log.md` on the course template: write the level before the work, and the fact after it.
- **Evidence:** the baseline numbers, and the finding about the empty harness on main.

### Phase 1 — context diet
- AGENTS.md ≤ 100 lines: commands, definition of done, boundaries, «do not use». The harness structure → `docs/harness/index.md`.
- Rules: procedures → `references/` of the `ui-autotest` skill. Remove `karpathy-guidelines` from the always-on rules.
  Reduce the rules that `rules:lint` catches to «why and how to fix».
- `.mcp.json`: remove Firecrawl. Keep one Context7.
- `# Compact instructions` in CLAUDE.md.
- **Evidence:** `/context` before/after + the same prompt in a fresh session → a row in `docs/logs/context-log.md`.

### Phase 2 — skills

| Skill | Input | Steps | Output / evidence | Level |
|---|---|---|---|---|
| `ui-autotest` | TC from AIO/Jira (read-only) or text | plan → POM, test-data, spec → `npm run check` → run with `ENV=stage`. Then the **mutation**: break the expected value in a POM assertion → the test must fail → revert | a green run + an observed red run, and coverage of the TC steps | 2 |
| `api-test` | endpoint | 0: `scripts/endpoint-lookup.mjs` (exit 1 if the endpoint is not in `endpoints.csv`) → schema → spec → mutation of a schema field | red/green by the schema | 2 |
| `bug-report` | a failed test (local or Jenkins) | triage product / test / env-flaky (`--repeat-each=3`, known-failures) → `collect-evidence.mjs` from `test-results/` → search for duplicates in Jira (read-only) → `docs/bugs/<date>-<slug>.md` | a draft on the template. A human files it in Jira | 1 |
| `jenkins-verify` | job + build number | `jenkins-report.mjs` (JSON API, compact summary, no raw JSON in the window) → compare with `ci/known-failures.json` (ratchet) → new / known / fixed / flaky. For a new failure: local run → `bug-report` or a fix | **PASS / NOT-EARNED / FAIL** | 2 |

Jenkins access goes through a CLI script, not MCP. Tests and builds go through the CLI, at zero context
cost. The token is only in `.env`. Add the path to `guard-policy`.

### Phase 3 — verification, SDD, gates
- OpenSpec: an exact version in devDependencies, `openspec init`, and all calls pinned to `npx openspec`.
  Add `spec:check` to `npm run check`: `validate --all --strict` + the counters `specs / active changes / archived`, and a failure on zeros.
- The first OpenSpec change is `add-jenkins-verify`. Its WHEN/THEN scenarios use numbers
  («0 tests → NOT-EARNED, not PASS», «a failure from known-failures does not make the build red»).
  The fixtures are anonymized JSON from Jenkins. Commit order: spec and tasks → red tests → implementation → archive.
- `node --test` for the harness scripts (no new dependencies) → `harness:test` in `npm run check`.
- `rules:lint` prints the number of checked files and fails on 0.
- Pre-commit: the baseline files (`.rules-lint-baseline.json`, `eslint-suppressions.json`) can only decrease.
  One commit does not mix harness edits with specs.
- See each gate red once (negative control) → an entry in the log.

### Phase 4 — enforcement by hooks
- PostToolUse on Edit/Write of `tests/**/*.spec.ts` and `page-objects/**` → `rules:lint` on the file. The hook returns the violation to the agent.
- Guard: close the glob bypass of the journal, and open `.env.example`. Add cases to `hooks:selftest`.
- Permissions: deny writes to AIO and Jira. `git add` / `git commit` → ask. Remove the one-off allows.
- SessionStart (source=compact) prints the top block of `docs/logs/session-notes.md`.

### Phase 5 — maker ≠ checker
- `.claude/agents/spec-reviewer.md`: read-only, a different model. It first builds expectations from the TC steps,
  then reads the diff. Output: a matrix «TC step → covered by», violations with `path:line`, and a verdict ACCEPT / CHANGES / REJECT.
- Control: a spec with a planted defect (a missing TC step, `expect` in the spec). Does the reviewer catch it?

### Phase 6 — loop
- `scripts/loop/stabilize.mjs` — a wrapper around `claude -p --max-budget-usd`: `--repeat-each=5` → on a failure, the agent fixes it → repeat.
  Safety limits: 3 attempts, 20 min, $3, stall 2. A hash of the protected files before and after each attempt.
  The iteration log and the stop reason → `docs/loops/`.

### Phase 7 — a real task through the whole pipeline
A TC from the backlog goes through these steps:

1. plan mode
2. `ui-autotest`
3. check + mutation
4. `spec-reviewer`
5. run in Jenkins
6. `jenkins-verify`
7. on a failure, `bug-report`

This is the story for the video and the PR, with the real mistakes of the agent.

### Phase 8 — packaging
`submissions/arsen-vlasov/` in the fork: the sanitized harness and the evidence. A script exports them and replaces
names and domains. A grep gate fails on `acme`, stage URLs and tokens. Extracts of `git log --stat` (GitLab is private).
The package also includes:

- README «practice → evidence file»
- a video of 1–2 min
- a PR on the template: what the human decided, what the agent decided, and where the agent was wrong

## Schedule

| Day | What |
|---|---|
| Tue 29.09 | Authorization, phases 0–1 |
| Wed 30.09 | Phase 2 |
| Thu 01.10 | Phases 3 and 5 |
| Fri 02.10 | Phase 7. Phases 4 and 6 if time remains |
| Sat 03.10 – Sun 04.10 | Phase 8 |

Required: 0, 1, 2, 3, 5, 7, 8. If possible: 4, 6. Parity with Cursor comes last.

## What the human decides

- the autonomy levels
- the acceptance of each «done»
- filing bugs in Jira
- changes to baselines, rules and dependencies
- the text of the PR and the video
