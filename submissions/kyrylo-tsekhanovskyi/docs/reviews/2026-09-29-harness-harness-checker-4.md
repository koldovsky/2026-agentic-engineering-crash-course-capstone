# Review: harness (harness-checker)

- Date: 2026-09-29
- Reviewer: harness-checker via Codex CLI
- Model / effort: gpt-6-astra / high, sandbox read-only
- Command: `codex exec review -m gpt-6-astra -c model_reasoning_effort="high" -c sandbox_mode="read-only" -o "D:\Education\External\AI\CrashCourseAgenticEngineering\2026-agentic-engineering-crash-course-capstone\submissions\kyrylo-tsekhanovskyi\.agent-work\review-harness-last-message.md" -`
- Findings: P0=0 P1=0 P2=3 P3=0 · verdict: approve (derived)

## Report

The patch weakens dependency-change approval controls, allows stale staged API types through a repeated commit check, and reports successful setup after tool restoration fails. All 11 red-classifier tests passed.

Full review comments:

- [P2] Preserve approval gates for package-changing commands — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/.claude/settings.json:68-72
  The new broad permissions allow `dotnet package add` and PowerShell package operations without confirmation, while the existing Bash NuGet approval rules are removed. Likewise, the new PowerShell Angular permissions allow `ng update`, but only `ng add` receives an approval rule. This contradicts the package-install approval requirement in [AGENTS.md:27](AGENTS.md#L27). Retain explicit approval rules for dependency-changing commands in both shells.

- [P2] Keep stale generated types from passing on a second commit attempt — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/scripts/check.mjs:108-114
  When a stale schema is staged, the first pre-commit check regenerates its working-tree copy and fails. Retrying without staging that regenerated file then passes this comparison, although Git still commits the stale schema. The new check therefore does not reliably enforce the staleness requirement in [AGENTS.md:34](AGENTS.md#L34). Generate into a temporary location without updating the checked file, or additionally verify the staged schema when running the commit gate.

- [P2] Return a failing exit code when tool restoration fails — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/scripts/setup.mjs:16-17
  If `dotnet tool restore` fails, for example because NuGet is unavailable, setup prints `FAILED` but continues and exits successfully. Callers consequently treat setup as complete even though the pinned `dotnet-ef` tool is unavailable. Propagate a nonzero exit status for this newly added installation step, even if prerequisite reporting continues afterward.
