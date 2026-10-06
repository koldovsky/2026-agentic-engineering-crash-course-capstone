# AgentFlow logging hooks review

Date: 2026-10-04. Reviewer: Codex (Checker). Outcome: changes required.

Reviewed HEAD: `e324e33251ec9f09946e118aaa9f071b91d48bce`, plus the staged hook/script additions, unstaged AGENTS.md additions, and untracked `.agent-log/README.md`. The evidence file records content hashes and diff fingerprints.

## Conclusion

The repository does not yet provide reliable logging for either Claude Code or Codex. Hook scripts exist, but neither project's configuration registers them. The logger also assumes Claude-specific success semantics, so simply connecting the same scripts to both agents would produce incorrect evidence.

The existing standalone self-test passes **41 checks**. That proves its fixture cases work when scripts are invoked directly; it does not prove either agent discovers or runs the hooks. No live agent hook run was performed. No application, hook, test, or configuration implementation was changed during this review.

Evidence: [synthetic probes and actual self-test output](../runs/2026-10-04-logging-hooks-review.json). All probe payloads are synthetic. No real transcripts, credentials, or user-level agent configuration files were read. The synthetic shell commands and patches were never executed.

## Required fixes

### F1 — P1: Register hooks in both agents

Locations: `.claude/settings.json:2-13`; `.codex/config.toml:1-4`.

Claude's settings contain only permission rules and no `hooks`. Codex's config contains comments only; `.codex/hooks.json` does not exist. The README's claim that the logger is wired is false for this repository. Personal configuration was intentionally not inspected.

Add separate project registrations calling a shared logger through small provider adapters. Claude needs pre-tool, successful post-tool, and failed post-tool events. Codex uses its own configuration and requires hook trust before execution. Start fresh sessions in this actual repository and inspect active hooks; changing a shell command's working directory does not establish that the current chat loaded this project's configuration. See [Claude hook configuration](https://code.claude.com/docs/en/hooks) and [Codex hook discovery and trust](https://learn.chatgpt.com/docs/hooks).

### F2 — P1: Normalize Codex outcomes before logging

Location: `.claude/hooks/log-action.mjs:57-61`.

Every `PostToolUse` receives `exit: 0`, without inspecting `tool_response`. Codex emits this event even for Bash commands that exit nonzero. A synthetic event with `tool_response.exit_code: 7` was recorded as `exit: 0`. See [Codex PostToolUse](https://learn.chatgpt.com/docs/hooks#posttooluse).

Normalize actual provider payloads separately, preserve the raw event name, and record success, failure, and unknown distinctly. Do not substitute success when the outcome cannot be parsed. Confirm the installed clients' exact payloads in a live smoke test before treating the adapter as verified.

### F3 — P2: Verify registration as well as scripts

Locations: `scripts/hooks-selftest.mjs:18-22`; `package.json:5-10`; `.agent-log/README.md:15`.

The self-test directly invokes hook files and supplies `CLAUDE_PROJECT_DIR`. It passes even though no hooks are configured. The documented `pnpm hooks:selftest` and `pnpm agent:log` commands do not exist. `pnpm check` is also still absent, as already acknowledged in the technical stack.

Add the advertised script commands and configuration checks for both providers. Include adapter tests for success, failure, missing outcomes, and stable project-root resolution when started from a subdirectory. Keep script-level tests and real agent smoke tests clearly distinguished.

### F4 — P2: Make lost or corrupt logs visible

Locations: `.claude/hooks/log-action.mjs:65-72`; `scripts/agent-log-summary.mjs:19-24`.

When `.agent-log` was a regular file in the temporary fixture, the logger wrote nothing yet returned zero with empty stdout and stderr. A file containing only malformed JSON was summarized as zero events with exit zero.

Emit a visible diagnostic when writing fails; a non-blocking logger can warn without denying the agent's tool. Make the health check fail when the log is unwritable. The summary must count/report malformed lines rather than silently presenting incomplete data as healthy evidence.

### F5 — P2: Preserve provider and session identity

Locations: `.claude/hooks/log-action.mjs:43-49`; `scripts/agent-log-summary.mjs:27-37,53`.

The logger omits the provider and truncates session IDs to eight characters. Two distinct synthetic sessions with the same prefix were reported as one. The summary also matches events solely by tool ID: a post event in session B incorrectly matched an unfinished pre event in session A.

Store `agent`, the full `session_id`, and `tool_use_id`; correlate using all three. Shorten identifiers only for display. Count only recognized tool lifecycle events so adding session or interruption events later does not turn them into executed tools.

### F6 — P2: Do not equate a missing post event with a blocked action

Locations: `scripts/agent-log-summary.mjs:33-37,59-61`; `.agent-log/README.md:11`.

A single pre event was immediately classified in the `blocked` column. It could instead be running, interrupted, or missing its post record because logging failed. The current data cannot prove the cause.

Report unmatched/pending or unknown outcomes unless an explicit denial is available. Claim a blocked action as capstone evidence only when the record contains the corresponding decision or another verifiable denial result.

### F7 — P2: Remove the log filter from the minimal setup, or constrain it

Location: `.claude/hooks/log-filter.mjs:74-85`.

The input `cat .agent-log/actions.jsonl && pnpm check` is replaced by just `node scripts/agent-log-summary.mjs`. This silently removes the verification command. Its relative summary command also assumes execution from the repository root. The returned rewrite lacks the `permissionDecision` required by Codex's rewrite contract. See [Codex PreToolUse](https://learn.chatgpt.com/docs/hooks#pretooluse).

For this capstone, expose the summary as an explicit command and omit the filter. If retained, preserve compound command semantics and test each provider's output contract separately.

### F8 — P2: Sanitize records before committing them

Location: `.claude/hooks/log-action.mjs:50-54`; `.agent-log/README.md:16`.

The logger copies command text and URLs into a file intended for Git. A synthetic inline bearer-token marker was retained verbatim. This probe used fake data and made no request.

Use minimal metadata and redact credential-bearing arguments and URL values before persistence. Keep tests for redaction. Ignore generated `summary.txt` and temporary output: currently `git check-ignore .agent-log/summary.txt` reports that it is not ignored, despite the README calling it uncommitted.

## Scope cleanup for Maker

No files were deleted during review.

| File or area | Recommendation |
| --- | --- |
| `log-action.mjs`, `agent-log-summary.mjs`, `hooks-selftest.mjs` | Keep and fix; these serve the requested evidence. Add only the small registrations/adapters needed for both tools. |
| `scripts/pricing-refresh.mjs` | Remove from this change. Downloads AI model token prices; AgentFlow's illustrative pricing section does not need this. |
| `scripts/fixtures-claude.mjs` | Remove from this change. Generates token-usage transcript fixtures for an absent usage parser. Logging tests need small event fixtures instead. |
| `.claude/agents/design-reviewer.md` | Remove from this change. Requires SVG/token files that do not exist and adds a reviewer agent beyond the agreed two-tool workflow. |
| `.claude/rules/app-router.md` and API-handler guidance appended to AGENTS.md | Remove API-specific guidance. Backend routes are outside the approved scope. |
| `.claude/hooks/log-filter.mjs` | Omit for now; F7 explains the concrete failure. |
| `.claude/hooks/protect-env.mjs` | Optional and not a logging prerequisite. It permits `.env.example`, contrary to the current AGENTS rule, and a Codex `apply_patch` payload bypasses its file-path check. Do not claim cross-agent protection from this script. |
| `scripts/openspec-pin.mjs`, `scripts/spec-check.mjs` | Defer until the OpenSpec step, if needed. The CLI is not declared in package.json. `spec-check` also lacks its advertised empty-tree check: with a stub CLI returning zero, it reports success for zero specs and zero changes. This was a stubbed probe, not a real OpenSpec run. |

The new AGENTS.md line choosing Ukrainian UI copy is a product decision. Confirm it is intentional and carry it into the specification; English project documentation remains unchanged.

## Runtime limitations and acceptance for the fix

- Claude Code reports version `2.1.286`; Node reports `v25.9.0`; pnpm reports `12.3.4`.
- The installed Codex CLI does not start: it reports missing optional dependency `@openai/codex-darwin-x64`. No package was installed or changed. This does not establish that the desktop app runtime is broken; that runtime was not tested.
- No claim is made about global hooks or hooks in cloud-orchestrated chats. The target here is local Claude Code and local Codex sessions opened in this repository.
- Before accepting the fix, run real harmless success and failure commands in each supported client, inspect corresponding records in the repository log, and confirm source/session attribution and outcomes. Exercise the scripts from a subdirectory and test concurrent appends with synthetic fixtures.
- Save live output separately from synthetic fixtures. Commit logger/configuration fixes with tests, then record smoke-test evidence. Keep application implementation out of this change.
