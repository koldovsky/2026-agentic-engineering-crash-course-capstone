# MCP servers and secrets

## MCP servers

The project configures five servers, so the whole team gets the same set:

| Server | Why it is here |
|---|---|
| `playwright` | driving a browser from the agent |
| `sequential-thinking` | long multi-step reasoning |
| `markitdown` | reading PDFs, docs and spreadsheets |
| `context7` | current Playwright and Allure docs — the model's memory of these is stale |
| `atlassian` | reading Jira test cases by ID |

The list lives in two files because the two tools expand variables differently:

```
.mcp.json          Claude Code   ${VAR}
.cursor/mcp.json   Cursor        ${env:VAR}, plus envFile for stdio servers
```

When you add or remove a server, edit both files. Neither file contains a secret.

**Jira access must be read-only.** You grant the scope at OAuth time, not in this config. Grant
read and search permissions and nothing else. `project-base` forbids changes to a test case. A
token that cannot write is the version of that rule that does not rely on the agent's good
behaviour.

## Secrets

Keys live only in `.env` (gitignored, template in `.env.example`) and never reach the
repository.

Claude Code does not read `.env`. `${VAR}` in `.mcp.json` expands from the environment of the
process that started the session. So a session that you start from the editor cannot see a key
that you exported in one terminal. `npm run mcp:sync` copies the keys from `.env` into
`.claude/settings.local.json`. That file is gitignored, and Claude Code reads it however the
session starts. Run the command after you edit `.env`. Then restart the session.

Cursor needs none of that for stdio servers: `envFile` in `.cursor/mcp.json` refers to
`.env` directly. Its remote servers still read the shell environment.
