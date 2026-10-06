# Local agent event log

Claude Code and Codex have separate registrations in `.claude/settings.json` and `.codex/hooks.json`. Their small adapters call `scripts/log-agent-action.mjs`. The adapters anchor the destination to their repository location, even when a session or tool starts in a subdirectory.

## Recorded data

Each supported tool event appends one schema-versioned JSON line to `.agent-log/actions.jsonl`: timestamp, agent, full session ID, tool-call ID, original event name, tool name, outcome, exit code when known, optional duration, and repository-relative file paths. Known verification commands have a fixed label; other shell commands are labeled `shell`.

Raw commands, patches, tool output, prompts, error text, search patterns, and URLs are not recorded. This avoids copying credentials or private content from those fields into Git. Live logs and generated summaries are ignored. Copy only reviewed evidence to `docs/runs/` for the capstone; never pass synthetic fixture records off as live agent activity.

- Claude: `PreToolUse`, `PostToolUse`, and `PostToolUseFailure`.
- Codex: `PreToolUse` and `PostToolUse`; a post event does not automatically mean success. Recognized result metadata supplies the exit code; otherwise the outcome is `unknown`.
- Records are correlated by agent + full session ID + tool-call ID.
- A pre event without a terminal event is `unmatched`, not automatically blocked. Tool hooks do not constitute a complete audit trail of all agent activity.
- Logger errors produce a visible diagnostic and exit 1, without returning a policy denial. The summary exits nonzero for unreadable logs or malformed records. Old-format records require explicit conversion; their missing identity is never invented.

## Commands

- `pnpm hooks:selftest`: validate both registrations, check log-directory writability, and run isolated synthetic regression tests, including concurrent writes. It does not prove client activation or trust.
- `pnpm agent:log`: summarize the local live log. It reports an error if no log exists yet.

The application-level `pnpm check` (typecheck, lint, Vitest, Playwright) remains part of the upcoming OpenSpec implementation. A hook self-test is not a substitute for it.

## Activate and verify locally

1. Open a fresh Claude Code session in the actual repository. Use `/hooks` to inspect the three configured logger events and the PreToolUse environment guard.
2. Open a fresh local Codex session in the same repository. Use `/hooks` to review and trust the current hook definitions. Project-local hooks require a trusted project. Do not change user-level trust files from a script.
3. In each client, ask it to run the harmless commands `node -e "process.exit(0)"` and `node -e "process.exit(7)"`, then run `pnpm agent:log`. Verify each client's pre/post records, full session identity, and success/failure outcomes. No product file needs to be edited.
4. If an outcome is `unknown`, inspect a sanitized sample of that client's hook payload and add a regression case before claiming support for that payload shape.
5. Save the actual results and client versions in `docs/runs/`. Synthetic tests, successful live activation, and independent review are separate evidence.

Current live activation is **not yet verified**. The installed Codex CLI failed during review; the desktop runtime was not tested. These registrations target supported local runtimes, not cloud-orchestrated chats. No hooks read `transcript_path`, user-level configuration, or private agent directories.

## Environment-file guard

Both clients register the same `.claude/hooks/protect-env.mjs` for `PreToolUse`, alongside the logger. A matching request exits 2 with a fixed denial message; safe requests exit 0 without granting permission or rewriting input. Malformed JSON or missing inputs for recognized file/shell tools also deny. The guard never reads target files or executes the supplied command.

Protected path components start with `.env` (case-insensitive), including `.env.example`, `.env.sample`, and `.envrc`, matching AGENTS.md's `.env*` rule. The guard checks explicit `file_path`, `notebook_path`, and `path` arguments, plus every Add/Update/Delete/Move target in Codex `apply_patch`. Patch content is not interpreted as a target. Shell checking conservatively rejects literal `.env` references; it may reject harmless mentions too.

This is an input guard, not filesystem isolation. It does not resolve aliases/symlinks, inspect broad directory reads/searches or implicit file loading, decode constructed shell paths, or cover arbitrary custom tool argument formats. Keep client permissions and AGENTS.md boundaries in force. Hook startup failures, disabled/untrusted hooks, and timeouts are not covered by the script's malformed-input denial.

Logging and guarding are independent; do not rely on their execution order. A denied request may leave an unmatched pre record. The summary deliberately does not infer a denial from this alone; keep the actual guard diagnostic as denial evidence. No new denial records are fabricated.

After changing registrations, restart/review hooks in both local clients and trust the updated Codex definitions. Regression tests use synthetic payloads only; no real environment files are read or modified. Live activation remains unverified.

References: [Claude hooks](https://code.claude.com/docs/en/hooks), [Codex hooks](https://learn.chatgpt.com/docs/hooks).
