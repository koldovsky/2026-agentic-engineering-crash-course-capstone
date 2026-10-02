# Review: harness (harness-checker)

- Date: 2026-09-29
- Reviewer: harness-checker via Codex CLI
- Model / effort: gpt-6-astra / high, sandbox read-only
- Command: `codex exec review -m gpt-6-astra -c model_reasoning_effort="high" -c sandbox_mode="read-only" -o "D:\Education\External\AI\CrashCourseAgenticEngineering\2026-agentic-engineering-crash-course-capstone\submissions\kyrylo-tsekhanovskyi\.agent-work\review-harness-last-message.md" -`
- Findings: P0=0 P1=2 P2=3 P3=0 · verdict: changes-requested (derived)

## Report

The harness still permits protected-file access and invalid red evidence, and can misreport unsuccessful setup or incomplete reviews as successful. Nineteen read-only script tests passed, but the targeted reproductions exposed gaps those tests do not cover.

Full review comments:

- [P1] Block shell redirection and case variants of protected paths — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/scripts/lib/env-guard.mjs:3-3
  The guard returns false for `cat <.env`, `cat .env.example*`, and `Get-Content .ENV`. Redirection bypasses the token boundary, the wildcard can include protected variants, and Windows resolves `.ENV` to `.env`. These calls can expose secrets despite the protection promised in [AGENTS.md:94–95](AGENTS.md#L94-L95). Handle shell access syntax and platform case sensitivity, and restrict the template exception to an exact filename.

- [P1] Distinguish assertion failures from failed test initialization — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/scripts/lib/red.mjs:22-25
  When an API test's Testcontainers fixture fails because Docker is stopped, xUnit still prints a nonzero `Failed:` count. This classifier accepts that output, so `check:be --red` saves evidence without any scenario assertion executing. That undermines the TDD evidence requirement in [AGENTS.md:81–85](AGENTS.md#L81-L85). Validate assertion-failure evidence and reject fixture/infrastructure failures rather than relying only on summary counts.

- [P2] Implement the promised deny rules for ordinary pushes — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/AGENTS.md:76-77
  The new boundary claims that Claude's deny rules prohibit pushes, but `.claude/settings.json` places ordinary `git push` commands under `ask` and denies only force-push variants. Consequently, an approved tool request can still let the agent push, contrary to [AGENTS.md:76–77](AGENTS.md#L76-L77). Add unconditional deny entries for ordinary pushes through the supported shell tools, or accurately identify this restriction as prompt-only.

- [P2] Reject unrecognized review output instead of approving it — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/scripts/lib/ledger.mjs:79-82
  A nonempty checker response such as 'I could not access the repository' contains neither a summary nor priority tags, yet this fallback returns `approve (derived)`. Because `review.mjs` accepts any nonempty successful response, an incomplete review is then recorded as an approval rather than retried or reported as failed. Preserve the review evidence required by [AGENTS.md:86–89](AGENTS.md#L86-L89) by recognizing supported result formats and failing closed when no valid review result is present.

- [P2] Return failure when the commit hook cannot be installed — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/scripts/setup.mjs:8-9
  If `git config core.hooksPath` fails, for example because `.git/config` is locked or unwritable, setup merely prints the error and ultimately exits successfully. The documented one-time setup can therefore appear successful while leaving the universal commit gate uninstalled, defeating [AGENTS.md:74–75](AGENTS.md#L74-L75). Stop with a nonzero exit code when hook installation fails.
