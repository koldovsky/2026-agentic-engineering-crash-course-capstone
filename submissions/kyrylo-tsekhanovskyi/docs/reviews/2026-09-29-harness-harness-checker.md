# Review: harness (harness-checker)

- Date: 2026-09-29
- Reviewer: harness-checker via Codex CLI
- Model / effort: gpt-6-astra / high, sandbox read-only
- Command: `codex exec review -m gpt-6-astra -c model_reasoning_effort="high" -c sandbox_mode="read-only" -o "D:\Education\External\AI\CrashCourseAgenticEngineering\2026-agentic-engineering-crash-course-capstone\submissions\kyrylo-tsekhanovskyi\.agent-work\review-harness-last-message.md" -`
- Findings: P0=0 P1=2 P2=5 P3=0 · verdict: unparsed

## Report

The harness accepts infrastructure failures as TDD evidence and permits trivial protected-file access. Argument parsing, parallel execution, and review-resolution enforcement also have actionable defects. All 15 existing script tests passed, but Codex and OpenSpec CLIs were unavailable for end-to-end verification.

Full review comments:

- [P1] Require assertion-failure evidence before accepting a red run — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/scripts/lib/red.mjs:13-16
  When the test command fails because dotnet is unavailable, npm has no test script, or NuGet restore fails, this function returns `ok: true` and `check --red` saves valid-looking evidence despite no tests executing. This undermines the TDD requirement in [AGENTS.md](AGENTS.md#L81-L85). Require positive evidence of executed, failing assertions and reject infrastructure failures.

- [P1] Block wildcard access to protected environment files — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/scripts/lib/env-guard.mjs:1-2
  The guard returns false for `cat .env*`, so the allowed shell command can read `.env` and `.env.production` after shell expansion without being denied. It also permits literal `.envrc` and `.env.sample`, although [AGENTS.md](AGENTS.md#L93) protects `.env*` with only `.env.example` exempted. Cover wildcard access and the full protected filename prefix, with an exact template exception.

- [P2] Distinguish file access from harmless text mentioning .env — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/scripts/hooks/protect-env.mjs:6-7
  An Edit or Write targeting an ordinary documentation file is denied whenever its content includes text such as `Do not read .env files`, because the entire tool input is searched. This also prevents legitimate edits to the guard and its tests. The restriction in [AGENTS.md](AGENTS.md#L93) concerns accessing protected files, not mentioning them; inspect destination paths for file tools and access expressions for shell tools instead.

- [P2] Consume option values even when they start with dashes — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/scripts/lib/proc.mjs:45-48
  The frontend maker's documented `--filter "--include src/app/items/**"` invocation is parsed as `filter: true` plus a separate option. Consequently, the red runner invokes `npm --prefix frontend run test -- true` instead of selecting the requested tests. Define which options require values and consume their next argument verbatim, rejecting missing values.

- [P2] Scope subagent stop checks to the terminating maker — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/scripts/hooks/stop-check.mjs:18-19
  During the planned parallel maker workflow, a finished backend maker also runs frontend checks against the frontend maker's unfinished changes, and vice versa. A failure then blocks the successful maker and asks it to fix code outside its permitted directory, contrary to [AGENTS.md](AGENTS.md#L69-L70). Select the relevant side for maker SubagentStop events and reserve checking both sides for the main session.

- [P2] Serialize concurrent ledger updates — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/scripts/review.mjs:129-132
  The plan runs backend and frontend reviews in parallel, but both processes read and rewrite the same ledger without locking. If they read the same version before either writes, the later write silently removes the other review's row; concurrent retry-stop writers have the same problem. This violates the recording requirements in [AGENTS.md](AGENTS.md#L86-L92). Use a shared cross-process lock around ledger read-modify-write operations.

- [P2] Validate review resolutions at the commit gate — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/scripts/check.mjs:56-60
  After `review.mjs` creates a row with an empty Resolution, the full check and pre-commit hook can still succeed because neither validates the review ledger. Thus unresolved reviews can be committed despite [AGENTS.md](AGENTS.md#L86-L88) requiring resolution before commit. Add a commit-gate check rejecting non-placeholder rows with empty resolutions, or explicitly identify this boundary as prompt-only rather than leaving its enforcement unspecified.
