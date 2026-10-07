# Factory Run Contract

## Goal

Produce a reviewable, privacy-safe submission package that demonstrates the selected brownfield change and the Agentic Engineering practices used.

## In Scope

- public Markdown documentation;
- synthetic evidence and its manifest;
- deterministic verification scripts;
- factory contracts, reports, corrections, and lessons.

## Out of Scope

- proprietary implementation or diffs;
- production data, schemas, endpoints, logs, or credentials;
- changes to the historical product result;
- automated publication or relaxation of privacy controls.

## Invariants

1. Historical, reproducible, private, and synthetic evidence remain distinguishable.
2. A maker never approves its own output.
3. Any privacy or integrity failure produces `STOP`.
4. Skipped tests and known limitations remain visible.
5. Only the human owner authorizes disclosure and release.

## Completion Criteria

- all hard gates pass;
- gate mutation tests fail for the intended bad states;
- a checker report contains no unresolved `STOP` or `REVISE` finding;
- the run ledger records the outcome;
- the human completes media review and release approval.
