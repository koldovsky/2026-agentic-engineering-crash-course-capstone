# Acceptance and Evidence Matrix

| ID | Acceptance criterion | Test level | Evidence and observed result | Risk control | Status |
|---|---|---|---|---|---|
| FR-01 | A complete custom range triggers one refresh | Focused UI template test | Handler and both inputs verified; synthetic after-state shows applied range | R-03 | Verified historically |
| FR-02 | An incomplete range sends no request | Focused UI template test | Guard requires both boundaries before refresh | R-03 | Verified historically |
| FR-03 | Applying a range resets page and selected record | Focused UI template test | State reset asserted; after-state callout documents the result | R-03 | Verified historically |
| FR-04 | Applying a custom range clears the conflicting quick filter | Focused UI template test and visual review | Before/after synthetic comparison shows the control transition | R-03 | Verified historically |
| FR-05 | Active actionable alerts remain visible outside the normal range | Service behavior analysis and regression suite | Existing exception traced and retained as an operational invariant | R-04 | Verified historically |
| FR-06 | Change records expose structured keys, descriptions, and old/new values | Focused and service tests | Sanitized description; implementation evidence remains private | R-05 | Verified with private evidence |
| FR-07 | Both tabs use one applied range and reset both navigation states | Public Node model tests and manual browser walkthrough | `scripts/test-dashboard.mjs`, `evidence/dashboard-tabs-*.jpg`; synthetic demo only, no private application claim | R-03, R-04, R-13 | Verified locally; independent review pending |
| NFR-01 | No private identifiers, credentials, endpoints, or production records are published | Automated scans and manual media review | Package scan passed; screenshots use generated data | R-01, R-02 | Automated part verified |
| NFR-02 | Existing non-live behavior remains stable | Full non-live solution suite | 1,285 passed; 10 live integration tests skipped; 0 failed | R-06 | Verified historically |
| FR-08 | Diagnostics execute approved policy and validate actual output | Nine public eval/negative tests | Shared `business-diagnostics.mjs`, YAML projection drift check and schema validation; synthetic reference only | R-12, R-14 | Verified locally; independent review pending |
| SUB-01 | Reviewer can inspect the externally hosted demonstration | Manual signed-out playback | Drive URL exists; replacement and human approval remain pending; media is excluded from Git | R-07 | Pending human evidence |

## Evidence Strength

- **Reproducible:** package structure, privacy scans, evidence hashes, and gate mutation tests can run publicly.
- **Historical:** application tests were run in the private repository and are represented by sanitized records.
- **Private:** proprietary implementation and diffs are intentionally unavailable to public reviewers.
- **Synthetic:** screenshots demonstrate behavior and information structure, not production pixel fidelity.

## Traceability Rule

A claim is ready only when its criterion, test level, evidence class, observed result, and limitation are explicit. Historical or private evidence must never be presented as independently reproducible by a public reviewer.
