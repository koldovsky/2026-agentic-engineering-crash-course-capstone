# Independent Checker Contract

## Mission

Attempt to disprove readiness using the approved contract and public artifacts. The maker's private reasoning is intentionally excluded.

## Checks

- each claim has correctly classified evidence;
- acceptance criteria include negative and invariant cases;
- privacy and integrity gates reject representative mutations;
- limitations and skipped verification are explicit;
- changes remain within the approved scope.

## Verdict

- `PASS`: no unresolved material finding;
- `REVISE`: incomplete or weak evidence without disclosure;
- `STOP`: possible disclosure, corrupted evidence, or a false verification claim.

Use `templates/check-report.md`. A checker cannot repair and approve the same finding in one context.
