# Review: spec (spec-checker)

- Date: 2026-09-29
- Reviewer: spec-checker via Codex CLI
- Model / effort: gpt-6-astra / high, sandbox read-only
- Command: `codex exec review -m gpt-6-astra -c model_reasoning_effort="high" -c sandbox_mode="read-only" -o "D:\Education\External\AI\CrashCourseAgenticEngineering\2026-agentic-engineering-crash-course-capstone\submissions\kyrylo-tsekhanovskyi\.agent-work\review-spec-last-message.md" -`
- Findings: P0=0 P1=1 P2=5 P3=0 · verdict: changes-requested (derived)

## Report

The proposal contains an unsafe choice-switching prescription, a summary schema that rejects valid totals, and ordering and contract ambiguities that should be resolved before implementation. All 65 scenario titles are mapped to tasks, but that traceability does not resolve these defects.

Full review comments:

- [P1] Specify ordered writes when switching the chosen offer — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/openspec/changes/add-mvp1-core-tracking/design.md:63-64
  When switching between existing offers, a single `SaveChangesAsync` does not guarantee that EF clears the previous choice before setting the new one. PostgreSQL checks the partial unique index immediately, so setting the new choice first fails even inside a transaction. Replace the save-once prescription with explicitly ordered clear-then-set writes within one transaction, and test switching in both directions against PostgreSQL.

- [P2] Give aggregate totals a schema without the unit-price ceiling — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/openspec/changes/add-mvp1-core-tracking/contracts/openapi.yaml:553-556
  A valid chosen offer priced at 999999999.99 with quantity 2 produces a total of 1999999999.98, but `totals` reuses `Money`, whose maximum is 999999999.99. The required summary therefore violates the contract for valid inputs. Define a separate aggregate-money schema with an appropriate range and add a scenario covering totals above the individual-price limit.

- [P2] Use a genuinely ordered value for creation-order sorting — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/openspec/changes/add-mvp1-core-tracking/design.md:39-41
  `Guid.CreateVersion7()` orders UUIDs by milliseconds but randomizes the remaining bits; IDs generated within the same millisecond are not ordered by creation. Sorting only by these IDs can therefore violate the item, listing and offer ordering requirements and make rapid-insertion tests intermittent. Specify a monotonic insertion-order value or another ordering mechanism that handles timestamp ties, and cover that case explicitly.

- [P2] Require the promised fields in error-response schemas — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/openspec/changes/add-mvp1-core-tracking/contracts/openapi.yaml:709-712
  `ValidationProblemDetails` has no `required` list, so a 400 response without `errors` satisfies the contract despite the projects error requirement and the frontend field-error mapper. Likewise, the conflict response permits an absent or null `type` although rule identification requires it. Require `errors` for validation responses and a non-null rule `type` for conflicts, using a dedicated conflict schema if necessary.

- [P2] Reconcile currency validation with the accepted ISO-code rule — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/openspec/changes/add-mvp1-core-tracking/specs/offers/spec.md:48-50
  The proposed rule accepts any three uppercase letters, including `ZZZ`, whereas [ADR 0002, lines 10–11](docs/adr/0002-money-per-currency-no-fx.md#L10-L11) requires an ISO 4217 code. Both the contract regex and the listed rejection scenarios permit this drift. Specify the supported ISO-code set and an unknown-uppercase-code rejection scenario, or obtain an explicit amendment to the accepted decision.

- [P2] Define an exhaustive contract-comparison scope — D:/Education/External/AI/CrashCourseAgenticEngineering/2026-agentic-engineering-crash-course-capstone/submissions/kyrylo-tsekhanovskyi/openspec/changes/add-mvp1-core-tracking/design.md:91-97
  D5's comparison list omits bounds, patterns, array-item schemas, media types and headers, but then says every other difference fails. These instructions allow materially different comparers: a listed-field projection can miss changed quantity or money limits, while comparing everything else includes generator metadata not addressed by normalization. Define the exact compared structure and exclusions, including recursive schemas and validation constraints, and add corresponding fixtures to task 7.1 so the independent contract gate required by [ADR 0007, lines 14–16](docs/adr/0007-contract-first-parallel-makers.md#L14-L16) has a determinate implementation.
