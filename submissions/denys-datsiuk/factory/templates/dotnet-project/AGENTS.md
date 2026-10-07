# Repository Agent Rules

## Operating Mode

Work as a supervised maker in a private, on-premises .NET integration system. Begin with read-only discovery. Do not edit until the request, affected flow, invariants, and verification plan are explicit.

## Absolute Boundaries

- Never open, print, search, copy, summarize, modify, or stage `.env*`, `appsettings.*.json` containing real settings, user-secrets, key stores, certificates, database dumps, production logs, exports, backups, or credential files.
- Never run commands against production or shared environments.
- Never expose connection strings, tokens, endpoints, personal records, internal identifiers, or real payloads in prompts, logs, tests, screenshots, or documentation.
- Use synthetic fixtures. If realistic data is required, stop and request an approved sanitized fixture.
- Do not modify migrations, deployment, authentication, authorization, destructive data operations, or public contracts without explicit human approval.
- Do not commit, push, publish, or alter CI/release controls unless explicitly authorized.

## Required Workflow

1. Read repository instructions, the relevant specification, tests, and Git history.
2. State the intended behavior, preserved invariants, blast radius, allowed files, and stop conditions.
3. Reproduce the baseline or record why it cannot be reproduced.
4. Add or identify a test that can fail for the reported behavior.
5. Make the smallest coherent change; preserve unrelated working-tree edits.
6. Run formatting/static analysis when configured, then build, focused tests, and the non-live regression suite.
7. Review the diff for scope, accidental secrets, debug code, disabled checks, and weak assertions.
8. Update the specification and traceability for behavior changes; add an ADR for architectural decisions.
9. Report exact commands, passed/failed/skipped counts, exclusions, limitations, and residual risk.

## .NET Conventions

- Follow `.editorconfig`; do not introduce a competing style.
- Keep nullable reference types and analyzers enabled. Do not suppress warnings broadly.
- Use async APIs end-to-end; pass `CancellationToken` through I/O paths.
- Preserve idempotency, correlation IDs, retry boundaries, and transaction semantics.
- Never log secrets or complete payloads. Prefer structured event names and sanitized identifiers.
- Unit tests: `Method_Scenario_ExpectedResult`. Integration tests must carry the repository's integration category/trait.
- Avoid changing generated files manually.

## Verification Contract

Run from the repository root:

```bash
bash scripts/verify-agent-change.sh
```

Do not state “all tests passed” when a filter excluded tests. Report, for example: `non-live suite passed; live integration tests not executed`.

## Mandatory Stops

Stop and return to the human when requirements conflict, a test requires real data, baseline tests fail for an unrelated reason, the change crosses an unapproved boundary, or the intended domain behavior cannot be reconstructed from evidence.
