# Autonomy Log

| Stage | Trust level | Human responsibility | Agent responsibility | Evidence |
|---|---:|---|---|---|
| Repository orientation | 1 — assistant | Selected the private repository and problem area | Read repository guide and mapped relevant UI, service, and tests | Read-only investigation |
| Diagnosis | 1 — assistant | Asked why date filters appeared inconsistent | Traced request parameters and backend predicates; found the intentional stale-alert exception | Behavior explanation with file/line references in private session |
| Scope decision | 2 — supervised agent | Chose automatic custom-range behavior | Proposed the smallest UI change and matching test | Bounded file list |
| Implementation | 2 — supervised agent | Authorized editing | Added automatic reload, reset state, and updated tests | Private diff |
| Focused verification | 2 — supervised agent | Reviewed intended behavior | Ran targeted dashboard tests | Passing focused run |
| Regression verification | 2 — supervised agent | Accepted the validation boundary | Ran the full suite excluding live database integration | 1,285 passed; 10 skipped |
| Commit | 1 — assistant | Explicitly authorized commit | Checked staged scope and created focused commit | Private Git history |
| Publication | 1 — assistant | Decides what can leave the organization | Produces sanitized documentation only | This package |

## Decisions Kept Human

- Whether an operational exception was correct product behavior.
- Whether the result was ready to commit.
- Whether proprietary artifacts could be disclosed.
- Which test boundary was sufficient for this change.
- Final acceptance and submission.

## Responsibility Boundary

| Area | Agent contribution | Human control |
|---|---|---|
| Investigation | Located relevant flows, traced parameters, compared behavior with tests | Selected the problem and confirmed business meaning |
| Design | Proposed the smallest coherent change and acceptance scenarios | Approved scope and the stale-alert safety invariant |
| Implementation | Edited the bounded UI, metadata, and test surface | Authorized repository changes and reviewed the result |
| Verification | Ran focused and broad tests, inspected scope, recorded limitations | Accepted exclusions and judged whether evidence was sufficient |
| Publication | Generated sanitized explanations, mockups, scans, and checksums | Owns disclosure decisions, media review, video upload, and submission |

The agent had no authority to publish private code, expose production data, reinterpret domain policy, widen the change without approval, or claim that excluded live integrations had passed.

## Operational Guardrails

- Begin with read-only discovery and state assumptions before editing.
- Keep edits inside the agreed vertical slice and preserve unrelated worktree content.
- Treat existing tests and invariants as evidence, not obstacles to overwrite.
- Escalate product, privacy, and publication decisions to the human owner.
- Report skipped verification and evidence limitations alongside successful results.
- Require deterministic package gates, then retain manual review for screenshots and video.

## Agent Mistake Prevention

- Read-only diagnosis preceded edits.
- Existing tests were treated as evidence of intent.
- The change was limited to the smallest relevant slice.
- Narrow tests ran before the full suite.
- Unrelated working-tree files were not staged.
- Public artifacts were rewritten rather than copied from private code.
