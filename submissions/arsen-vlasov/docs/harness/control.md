# Harness control layer: hooks, guard, permissions, journal

## Control layer (Claude Code)

`.claude/settings.json` (tracked) carries the shared permissions and the hooks.
`.claude/settings.local.json` (gitignored, per-user) carries personal allows and MCP keys.
The spec of the hooks is `openspec/specs/edit-hooks/spec.md`.

| Hook | When | What it does |
|---|---|---|
| `guard-secrets.mjs` | PreToolUse, every tool | Blocks the actions in the list below. Exit 2, and the reason goes to the agent |
| `log-action.mjs` | PreToolUse and PostToolUse, every tool | Appends the call to the local action journal |
| `post-edit-check.mjs` | PostToolUse on `Edit`, `Write`, `MultiEdit` | Checks the edited file. Doc text: the language check and ASD-STE100 against the baselines. Specs and page objects: `rules:lint` for the file and ESLint errors. A finding exits 2 |
| `session-start.mjs` | SessionStart | Prints the newest block of `docs/logs/session-notes.md` |

The guard blocks these actions. Permission rules cannot express them:

- Reading credential files through Bash. `Read(...)` rules cover only the Read tool, not `cat`.
- A `Grep` or `Glob` call on `test-data/users/static/`. `Read(...)` rules do not cover these tools.
- Running tests against prod. Deny rules strip a leading `ENV=`, so they cannot catch it.
- Any read of the journal directory, a glob included. Use `npm run agent:log` instead.
- `git commit` or `git push` with `--no-verify`, and `git commit -n`. Only the human can skip the git
  hooks, in a terminal.

The env template `.env.example` holds no secrets, so the guard allows it.

The categories live in `scripts/harness/guard-policy.mjs`. Add a new category there, and both the
Claude adapter and the Cursor adapter use it. `classify(text, toolName)` gets the tool name from the
Claude adapter. The Cursor adapter sends no tool name, so the `Grep`/`Glob` rule is Claude-only.

A `PreToolUse` line with no matching `PostToolUse` for the same `tool_use_id` means that the
agent proposed the action, but the action never ran. A hook, a permission rule or a human stopped it.

```
npm run agent:log        # summary per tool, with the blocked actions listed
npm run hooks:selftest   # verify the hooks without starting an agent
```

The journal is local and gitignored.

## git hooks

`npm run hooks:install` sets `core.hooksPath` to `.githooks/` in the local git config. Run it once per
clone. The pre-commit hook (`scripts/harness/pre-commit.mjs`) blocks a commit in these cases:

- a staged env file (`.env` or `.env.*`), except `.env.example`
- a baseline entry that is new or larger than in `HEAD`. The baselines are `.rules-lint-baseline.json`,
  `.ste-baseline.json`, `.docs-language-baseline.json` and `eslint-suppressions.json`
- a new `ci/known-failures.json` entry without an `issue` of the form `PRJ-<number>`

## Cursor

**The same policy guards Cursor.** Its hook contract is different: `.cursor/hooks.json`,
different event names, and a JSON `permission` field instead of exit code 2. So the two tools
share the policy, not the plumbing:

```
scripts/harness/guard-policy.mjs   what is forbidden, stated once
.claude/hooks/guard-secrets.mjs    adapter: exit 2 + stderr
.cursor/hooks/guard-secrets.mjs    adapter: {"permission": "deny", …} on stdout
```

Change a rule in the policy and both tools follow. `npm run hooks:selftest` asserts that
the two adapters return the same verdict for the same command. `.cursor/` is local, so on a clone
without it the selftest prints `SKIP` for the Cursor cases.

Permissions and the edit and session hooks are Claude-only. Cursor has no equivalent of
`.claude/settings.json`, and the Cursor side does not write the journal yet. The git hooks work for
every tool and every person, after `npm run hooks:install`.
