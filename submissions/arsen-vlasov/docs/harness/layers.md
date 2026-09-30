# Harness layers: rules, skills, agents, session state

## How the harness is built

The harness has three layers. They differ by *when the agent needs the material*.

**Rules** — invariants that are always true for their files.
The source of truth is `.claude/rules/*.md`, which git tracks. `.cursor/` is local and git-ignored.
`npm run cursor:sync` copies each rule to `.cursor/rules/<name>.mdc`. It only overwrites and never
deletes. `npm run cursor:sync -- --check` reports drift.

The frontmatter carries keys for both tools:

```yaml
---
description: what the rule is about
globs: "tests/**/*.spec.ts"    # Cursor
alwaysApply: false
paths:                          # Claude Code, same thing
  - "tests/**/*.spec.ts"
---
```

You must quote a `globs` value that starts with `*`. Without quotes, the value is invalid YAML,
and Claude Code will skip the rule silently.

A rule with no `globs`/`paths` and with `alwaysApply: true` loads on every request
(`project-base`). Keep those rules short.

**Skills** — step-by-step procedures. The agent selects a skill by the task description, not by
the file path. Skills live in `.claude/skills/<name>/SKILL.md`. Cursor reads that folder as is, so
you do not need to synchronise it. There are six skills now:

| Skill | What it does |
|---|---|
| `api-test` | writing a new API test for an endpoint. `scripts/endpoint-lookup.mjs` gates step 1, and a mutation run closes it |
| `ui-autotest` | writing a regression spec from a Jira test case, proven by a mutation run |
| `bug-report` | triage of a failed test and a bug draft in `docs/bugs/`. `scripts/collect-evidence.mjs` reads `allure-results/` |
| `jenkins-verify` | one Jenkins build → PASS / FAIL / NOT-EARNED through `scripts/ci/jenkins-report.mjs`. Known failures are in `ci/known-failures.json` |
| `agent-log-report` | reporting what this session did, from the hooks' journal |
| `karpathy-guidelines` | behavioural guidelines for writing and reviewing code. Earlier it was an always-on rule |

A skill may ship scripts in its own `scripts/` folder. `agent-log-report`, `api-test` and
`bug-report` do this. Their instructions require the agent to run the script, not to read raw data.

The test for a skill instead of a rule: the material starts with "when asked to do X, follow
steps 1…N". The agent needs that material **before** the file exists, so `globs` can never trigger it.

**Agents** — `.cursor/agents/*.md` and `.claude/agents/*.md`. The two formats are compatible. There
is one agent so far:

| Agent | What it does |
|---|---|
| `spec-reviewer` | the checker for a maker: read-only, a different model (`sonnet`). It builds expectations from the TC before it reads the code. It returns a step → assertion matrix, rule violations with `path:line`, and ACCEPT / CHANGES / REJECT |

A new agent file is not available at once. In this session, the new file registered only after some
minutes. A first call by name failed with "Agent type not found".

**Loops** — `scripts/loop/stabilize.mjs`, run with `npm run loop:stabilize -- <spec>`. It runs one spec
on stage with `--repeat-each=5`. On a failure, `claude -p` fixes the test code, and the loop runs the
spec again. Hard limits stop it: 3 attempts, 20 minutes, 3 USD, and a stall of 2 attempts. A hash of
the protected files and a weakening check on the diff stop it when the agent goes out of its limits.
It never commits. The reports are in `docs/loops/`. Spec: `openspec/specs/stabilize-loop/spec.md`.
With `opus`, one attempt costs about 1.5 USD, so the budget stops the loop before the attempt limit.

**Session state** — cross-session working memory in `docs/logs/session-notes.md`. To open a
session, read its newest block and continue from `Start from`. To close a session, add a new
block on top, before `/compact` or `/clear`. Without a specific `Start from` line, the session
is not really closed.

### Adding to the harness

- rule → `.claude/rules/<name>.md`, then `npm run cursor:sync`
- skill → `.claude/skills/<name>/SKILL.md`, with `name` in the frontmatter matching the folder name
