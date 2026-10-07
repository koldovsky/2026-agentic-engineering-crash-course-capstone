# Quality Gates

## G1 — Structure

All required documents, mockup sources, screenshots, skill instructions, and automation files exist and are non-empty.

Recording exports, audio, obsolete presentation generators and narration scripts are excluded. The submission contains only an external video link.

## G2 — Confidentiality

No prohibited domain marker, secret, private path, proprietary source/schema, raw production log or real record is present. Public synthetic fixture code and diagnostic schemas are explicitly allowed; filename denial runs before content scanning.

## G3 — Evidence Integrity

Generated screenshots match `evidence/manifest.sha256`. Any intentional regeneration requires visual review and a manifest update.

## G4 — Traceability

Every product claim maps to a requirement, evidence item, verification method, and risk control.

## G5 — Submission Completeness

Participant name, project summary, practice links, limitations, and public video URL are present. No `TODO`, `TBD`, or `FIXME` remains.

## G6 — Independent Review

A fresh checker reviews the package without access to the private implementation. It must distinguish public proof from historical private evidence.

## G7 — Factory Integrity

The lights-on factory declares its autonomy mode, separates maker and checker authority, defines append-only ledger handling, exposes open corrections, and prevents a process auditor from changing hard gates. `scripts/check-factory.sh` enforces structural controls; Git review is required to detect rewritten ledger history.

## Gate Self-Test

`scripts/self-test-gates.sh` must demonstrate that missing required content, a prohibited domain marker, evidence tampering, and removal of the independent checker contract are all rejected.

It also rejects environment files, media binaries and missing FR-08 traceability. `scripts/test-policy-controls.py` exercises filename-first deny/scope rules and nonempty TRX requirements; executable diagnostic evals validate actual output, not just expected-answer consistency.

## Outcomes

- **PASS** — all gates satisfied.
- **REVISE** — evidence or wording is incomplete but no disclosure occurred.
- **STOP** — potential disclosure, secret, or unexplained evidence mismatch; do not publish.
