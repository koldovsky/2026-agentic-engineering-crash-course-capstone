# Review: harness (harness-checker)

- Date: 2026-09-29
- Reviewer: harness-checker via Codex CLI
- Model / effort: gpt-6-astra / high, sandbox read-only
- Command: `codex exec review -m gpt-6-astra -c model_reasoning_effort="high" -c sandbox_mode="read-only" -o "D:\Education\External\AI\CrashCourseAgenticEngineering\2026-agentic-engineering-crash-course-capstone\submissions\kyrylo-tsekhanovskyi\.agent-work\review-harness-last-message.md" -`
- Findings: P0=0 P1=1 P2=1 P3=0 · verdict: changes-requested (derived)

## Report

The protected-file guard still permits straightforward bypasses, and the review parser can reject legitimate clean results. Full validation was limited by unavailable CLIs and the read-only sandbox.

Full review comments:

- [P1] Check shell-expanded operands for protected environment files — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/scripts/lib/env-guard.mjs:4-4
  Commands such as `cat .e*`, `Get-Content .e*`, and `cat .env{,.local}` return false from this guard despite accessing protected files after shell expansion. Literal `.env+backup` also bypasses detection. This defeats the protection required by [AGENTS.md:94–95](AGENTS.md#L94-L95), including through allowed shell commands. Check expanded file operands or conservatively reject access patterns that can match protected filenames.

- [P2] Recognize successful clean reviews in the native output format — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/scripts/lib/ledger.mjs:85-88
  A valid review containing an empty `findings` array and `overall_correctness: "patch is correct"` is classified as `unrecognized` unless its explanation happens to match the narrow prose regex; even “No actionable findings.” is rejected. Consequently, `review.mjs` reruns a successful checker and can exhaust both attempts without saving its report or review-ledger row, contrary to [AGENTS.md:86–87](AGENTS.md#L86-L87). Parse the native structured result explicitly and support its rendered clean-review output rather than relying on incidental wording.
