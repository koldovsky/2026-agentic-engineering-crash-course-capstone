# Varto Agent Instructions

These rules apply to all work under `submissions/yulia/`.

## Sources of context

- This `AGENTS.md` contains stable, project-wide engineering rules.
- [`specs/product.md`](specs/product.md) is the source of truth for current product behavior, scope, and acceptance criteria.
- Task-specific instructions supplied in a Codex session are dynamic context. Do not copy them here unless the project owner decides they are durable project rules.
- Keep Varto work inside `submissions/yulia/`. Do not modify course-owned files at the repository root unless explicitly instructed.

## Product and scope

- Implement only behavior supported by the approved product specification.
- Keep the implementation intentionally small. Prefer the simplest solution that satisfies the specification and can be verified reliably.
- Do not silently expand scope, add speculative features, or introduce product behavior absent from the specification.
- Escalate unresolved or conflicting product decisions to the human instead of inventing an answer.
- Do not silently change the specification to match an implementation. Proposed product changes require human approval and a specification update before implementation.
- Preserve the specified single-user, local-only model. Financial and currency data must remain in the browser and must not be sent to a backend, analytics service, or third party.

## Engineering and verification

- Keep core business rules and calculations deterministic and independently testable, without browser UI or external-service dependencies where practical.
- Treat verification as part of every implementation change. Do not assume behavior works from inspection alone.
- Run all checks relevant to changed behavior after implementation changes and report the results accurately.
- Test product behavior against the acceptance criteria in `specs/product.md`, including invalid and empty states where relevant.
- Do not weaken, remove, skip, or bypass tests merely to make verification pass. Fix the defect or escalate a genuine conflict.
- Keep implementation and tests consistent with the approved specification; a passing test suite does not override the product contract.
