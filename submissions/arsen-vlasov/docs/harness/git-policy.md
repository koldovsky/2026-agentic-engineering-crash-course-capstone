# Git policy: what is committed and what is local

The principle comes from `koldovsky/project-factory`: commit the evidence, and ignore only what is
local to one person or is scratch output. A result that exists only in a working tree is not evidence.

| Path | In git | Why |
|---|---|---|
| `.claude/` | yes | The harness: rules (the source of truth), skills, the reviewer agent, hooks, `settings.json` |
| `.claude/settings.local.json` | no | Personal permissions and MCP keys |
| `.claude/worktrees/` | no | Temporary git worktrees made by the agent |
| `CLAUDE.local.md` | no | The personal memory file of Claude Code for one person |
| `.cursor/` | no | Local to each Cursor user. `npm run cursor:sync` fills `.cursor/rules/` from `.claude/rules/`. Never delete files in it |
| `AGENTS.md`, `ARCHITECTURE.md`, `CLAUDE.md` | yes | The entry points for agents |
| `docs/` | yes | The system of record: design docs, test strategy, plans, logs, reviews, bug drafts |
| `openspec/` | yes | Harness specs written before the code, including the archive |
| `ci/known-failures.json` | yes | The ratchet list that `jenkins-verify` reads |
| `scripts/` | yes | Checks and harness scripts |
| `.rules-lint-baseline.json`, `eslint-suppressions.json` | yes | The ratchets for inherited debt |
| `test-data/users/static/*.json` | yes | Static test users. This is how the project works today. See the tech-debt tracker |
| `.agent-log/` | no | The raw action journal. It can hold command text. Commit the output of `npm run agent:log` instead |
| `.playwright-mcp/`, `test-results/`, `playwright-report/`, `blob-report/`, `*allure-results`, `*allure-report`, `storage/` | no | Run output, rebuilt on every run |
| `.env`, every `.env.*`, `config/.env` | no | Secrets. `.env.example` is the template, and it is in git |
| `.auth/` | no | Saved login states. The code does not make them today. The rule is a safety net |
| `docs/logs/` | yes | Evidence and the session handoff. After the capstone, `session-notes.md` can become local. Then delete its links from `docs/index.md` and `AGENTS.md` |
| `graphify-out/`, `node_modules/` | no | Generated |

## After a change to this table

1. Update `.gitignore`.
2. Update this file.
3. Run `npm run check`.
