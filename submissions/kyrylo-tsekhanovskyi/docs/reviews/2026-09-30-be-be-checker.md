# Review: be (be-checker)

- Date: 2026-09-30
- Reviewer: be-checker via Codex CLI
- Model / effort: gpt-6-astra / high, sandbox read-only
- Command: `codex exec review -m gpt-6-astra -c model_reasoning_effort="high" -c sandbox_mode="read-only" -o "D:\Education\External\AI\CrashCourseAgenticEngineering\2026-agentic-engineering-crash-course-capstone\submissions\kyrylo-tsekhanovskyi\.agent-work\review-be-last-message.md" -`
- Findings: P0=0 P1=0 P2=3 P3=0 · verdict: approve (derived)

## Report

Transaction retries can report unpersisted choices, concurrent duplicate creation returns the wrong status, and the contract normalizer drops constraints. Test execution was blocked by the read-only sandbox denying MSBuild temporary-directory creation.

Full review comments:

- [P2] Rebuild tracked state when retrying a transaction — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/backend/src/BOMKeeper.DAL/Repositories/EfUnitOfWork.cs:13-19
  If SaveChanges succeeds but the transaction subsequently rolls back on a transient failure, EF retains the accepted entity values. Retrying this delegate with the same context can therefore skip the writes: SetChoiceAsync can return an offer as chosen while the database still has it unchosen. Recreate and reload the operation's tracked state for each attempt, preserving the atomic switch required by [design D3](openspec/changes/add-mvp1-core-tracking/design.md#L65-L70), and test a failure between saving and committing.

- [P2] Translate duplicate-index violations into the domain conflict — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/backend/src/BOMKeeper.BLL/Offers/OfferService.cs:52-53
  Two simultaneous POSTs linking the same item and listing can both pass ExistsAsync. The losing insert then throws DbUpdateException from the unique index, which BllExceptionHandler does not handle, producing 500 instead of the specified 409 `/problems/duplicate-offer`. Translate this specific constraint violation through the DAL/BLL boundary and add a concurrent-request integration test; keep domain-error mapping consistent with [AGENTS.md](AGENTS.md#L68).

- [P2] Preserve sibling constraints when unwrapping nullable schemas — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/backend/tests/BOMKeeper.Api.IntegrationTests/Contract/ContractNormalizer.cs:286-289
  For a nullable union with sibling constraints, returning only its non-null branch discards those constraints. For example, schemas with `oneOf: [{type: string}, {type: null}]` and different sibling `maxLength` values normalize identically, allowing contract drift to pass unnoticed. Preserve the wrapper's validation constraints when unwrapping and add fixtures with constraints outside the union; [design D5](openspec/changes/add-mvp1-core-tracking/design.md#L119-L128) requires those bounds to participate in comparison.
