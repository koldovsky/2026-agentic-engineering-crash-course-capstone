---
name: verify-capstone
description: Audit a sanitized capstone evidence package before publication, including traceability, privacy, evidence integrity, limitations, and submission readiness. Use for final reviews or after claims, media, or test evidence change.
---

# Verify Capstone Package

Use this skill before opening or updating the course pull request. It reviews the public package only; it does not authorize access to or disclosure from the private implementation.

## Procedure

1. Read `docs/quality-gates.md`, `docs/traceability.md`, and `docs/risk-register.md`.
2. Run `bash scripts/verify-package.sh` from the package root. Treat any evidence hash mismatch or disclosure match as `STOP`.
3. Confirm every product claim maps to a requirement, public evidence, verification method, and risk control.
4. Distinguish reproducible public evidence, historical private evidence, and pending human evidence.
5. Inspect every image manually. For video, require a human confirmation that the final export was watched end to end and opened while signed out.
6. Confirm that `PR_DESCRIPTION.md` contains the exact certificate name and a working public video URL.
7. Review limitations beside the claims they qualify; do not allow a broad summary to hide an excluded test category.
8. Report one outcome—`PASS`, `REVISE`, or `STOP`—with exact paths for every finding. Do not silently rewrite evidence or weaken a requirement.

## Completion Criteria

- All seven gates in `docs/quality-gates.md` pass.
- Evidence hashes match and every image is visibly synthetic.
- No unresolved placeholder remains.
- Video is accessible without private access and has completed human review.
- Claims, traceability, risks, evidence, and limitations agree.
