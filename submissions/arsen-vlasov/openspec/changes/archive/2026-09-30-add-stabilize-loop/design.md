# Design

## One iteration

1. The loop runs `npx playwright test <spec> [--grep <title>] --repeat-each=5 --retries=0 --max-failures=1
   --reporter=dot,json` with `ENV=stage` and `HEADLESS=true`. The JSON report goes to a temporary
   folder through `PLAYWRIGHT_JSON_OUTPUT_FILE`. `--max-failures=1` saves time, because one failure is
   enough for a fix attempt.
2. `summarize(report)` gives the counts and, for each failure, the test title, the first 15 lines of
   the error without ANSI codes, and the path of `error-context.md`. Playwright writes the page snapshot
   at the failure to that file.
3. `decide(state)` returns a stop reason or no stop.
4. The loop hashes the protected files and starts the agent:

   ```
   claude -p <prompt> --model opus --output-format json --max-budget-usd <remaining>
     --permission-mode dontAsk --setting-sources project --strict-mcp-config
     --allowedTools Read Grep Glob Edit(page-objects/**) Edit(tests/**) Edit(utils/**)
     --disallowedTools Bash WebFetch WebSearch Agent
   ```

   The loop removes `CLAUDECODE` from the environment of the child, so a loop can start from inside a
   Claude Code session.
5. The loop reads `total_cost_usd`, `session_id` and the last `VERDICT:` line from the JSON result.
   Then it hashes the protected files again and checks the diff for weakening.

## Pure core, thin shell

As in the other harness scripts, the tests call pure functions: `parseArgs`, `summarize`, `signature`,
`decide`, `weakening`, `changedProtected`, `agentVerdict`, `buildPrompt` and `renderReport`.

`runLoop(options, deps)` is the whole loop. `deps` gives the side effects: `runTests`, `runAgent`,
`runCheck`, `hashProtected`, `diff`, `restore`, `writeReport` and `now`. The tests give fakes, so each
stop reason has an offline test with no cost. The real `deps` spawn Playwright, `claude` and git.

## Why the agent gets so little

- **No Bash.** The loop runs the tests, so the agent does not need a shell. The project allow list
  would also let it run the stage regression. `--disallowedTools Bash` closes that.
- **Project settings only.** `--setting-sources project` loads `.claude/settings.json`: the guard, the
  edit hooks and the deny list. It does not load `settings.local.json`, which allows `git commit`.
- **No MCP.** `--strict-mcp-config` with no config gives no servers. The AIO Tests server has write
  tools, and the fix does not need any server.
- **Edit only in three folders.** `dontAsk` refuses every tool call that the allow list does not name.
  The hash is a second line of defense for the case where a rule does not hold.

## The failure signature

`signature(run)` sorts the failures, and for each it takes the test title and the first error line.
It replaces each run of digits with `#`, so `within 15000ms` and `2026-09-28T00:29:32.959Z` do not make
two failures look different. A check failure has the signature `check: <first failed step>`.

## Limits that stay

- The weakening check sees patterns, not meaning. A changed expected value, or a looser assertion
  inside a `should…` method, passes it. The human review of the final diff and `spec-reviewer` catch
  this. The loop never commits, so a person always sees the diff.
- `--max-failures=1` shows only the first failure of a run. A spec with two independent flaky tests
  needs more iterations.
- A flake that shows only under the load of the full Jenkins run can pass 5 of 5 locally. The stop
  reason is then `NOT_REPRODUCED`, not `GREEN`. Loop 1 (`activity-calendar.spec.ts`) stopped this way.
- **Found in loop 2.** `GREEN` covers only the target of the loop. The agent can fix a flake in a
  shared helper and break other specs that call it. Loop 2 fixed tests 11 and 14 in
  `utils/helpers/api-helper.ts`. A stage run of the callers then found 5 broken tests. See
  `docs/reviews/2026-09-30-loop2-helper-review.md`. Before a commit, run each spec that calls a
  changed shared file.
