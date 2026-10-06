# Logging fixes — Maker handoff

Date: 2026-10-04. Author: Codex, acting as Maker at the user's explicit request to fix the review findings. This document is implementation evidence, **not an independent review**. The original [Checker report](2026-10-04-logging-hooks-review.md) is unchanged.

Base commit: `e324e33251ec9f09946e118aaa9f071b91d48bce`. The changes are uncommitted; [actual verification output and source hashes](../runs/2026-10-04-logging-hooks-fixes.json) identify the tested state.

## Findings addressed in source

| Finding | Change |
| --- | --- |
| F1 | Registered Claude pre/success/failure events and Codex pre/post events through two small adapters and one shared logger. Live activation still needs confirmation below. |
| F2 | Provider-specific outcomes preserve failures and unknown results; a Codex post event is no longer assumed successful. |
| F3 | Added `pnpm hooks:selftest` and `pnpm agent:log`. Tests inspect registrations and execute their exact configured commands in isolated repositories. |
| F4 | Failed writes and malformed input return a diagnostic and nonzero status. The summary reports corrupt records; the health check checks the real log destination without adding fake events. |
| F5 | Full session identity and provider are retained and used with the tool-call ID for correlation. |
| F6 | Missing post records are called unmatched, not blocked. |
| F7 | Removed the command-rewriting log filter; the summary is an explicit command. |
| F8 | Persist only minimal metadata and fixed verification-command labels. Omit raw commands, tool output, URLs, prompts, search patterns, and patch content. Ignore live logs and generated summaries. |

Removed the eight reviewed extras: the log filter, incomplete environment guard, model-pricing downloader, unused transcript fixture generator, extra design agent, API route guidance, and two premature OpenSpec helper scripts. AGENTS.md retains the approved scope, existing language choice and boundaries, removes duplicate API guidance, and no longer claims hooks enforce environment-file protection. No dependencies or product functionality were added.

## Verification

- `pnpm hooks:selftest`: **29 passed, 0 failed**. Includes both provider registrations, exit outcomes, redaction, session separation, corrupt/unwritable logs, paths containing spaces, subdirectory execution, and 20 concurrent synthetic appends.
- `pnpm lint`: passed for the repository.
- `pnpm check`: unavailable (`Command "check" not found`). The application verification pipeline remains a planned OpenSpec implementation task; hook tests do not replace Vitest or Playwright.
- `pnpm agent:log`: correctly returned exit 1 because no live log exists yet.

A real manual failure/fix cycle is preserved: the first candidate run passed 27 tests and failed the summary CLI test. macOS path aliases caused the entry-point guard to skip execution. Resolving the executable's real path fixed the code; the original assertion remained unchanged. A later test also covers relative file paths from a subdirectory. Initial pnpm sandbox failures are recorded separately as environment restrictions, not product regressions.

## Remaining acceptance

Fresh sessions in this repository must load the registrations. Inspect `/hooks`; review and trust Codex definitions before use. In both clients, run actual harmless exit-zero and exit-seven commands, then inspect the recorded events. The installed Codex CLI failed during the original review; no global installation or trust setting was changed. Desktop activation remains untested. Follow the [activation steps](../../.agent-log/README.md).

Commit this source-and-test change as `fix: make agent logging reliable for Claude and Codex`. That commit demonstrates implementation, regression coverage and the manual repair loop; it does not prove live activation. Keep subsequent live evidence and independent review attributable to their actual runs and commits.

Suggested Claude Code Checker prompt:

> Act as the independent Checker for the logging fix. Read AGENTS.md, docs/reviews/2026-10-04-logging-hooks-review.md, and docs/reviews/2026-10-04-logging-hooks-fixes.md. Review the committed change against F1–F8 without changing implementation or tests. Run pnpm hooks:selftest and pnpm lint. Record findings with the reviewed commit SHA. Distinguish synthetic tests from live hook activation; do not claim pnpm check or live Codex support passed without evidence.
