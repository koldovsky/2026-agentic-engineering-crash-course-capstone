# Verification Record

## Evidence Classification

The commands below were executed in the private repository during implementation. Their results are historical evidence recorded from the agent session; reviewers of this public package cannot rerun them without private source access.

## Verification Ladder

### 1. Read-only diagnosis — verified

The agent traced date parameters from the browser request into backend queries. It established that most datasets obey the selected date range, while stale active runs intentionally bypass it so operational problems cannot disappear from view.

### 2. Focused test — verified

The dashboard UI test project was run after the custom-range change. The focused test passed and checks that:

- a dedicated custom-range handler exists;
- pagination and selection are reset;
- both date inputs trigger that handler.

### 3. Full non-live suite — verified historical evidence

Command used in the private repository:

```text
dotnet test PRIVATE_SOLUTION --configuration Release \
  --filter "Category!=PostgreSqlIntegration" --nologo
```

Observed result:

```text
Passed: 1,285
Skipped: 10 live integration tests
Failed: 0
```

### 4. Diff and scope checks — verified

Before commit, the agent checked whitespace/diff hygiene, staged only the intended dashboard and test files, and reviewed the staged summary. Unrelated untracked database scripts and analysis notes were excluded.

### 5. Commit checkpoints — verified in private repository

- Dashboard metadata/readability improvement: committed separately.
- Automatic custom-range reload and its test: committed separately.

Commit identifiers are intentionally omitted from the public package and should not be shown in the submission video.

## Evidence Still Needed for Submission

- [ ] Replace the externally hosted video and complete signed-out full playback/privacy review.
- [ ] Obtain independent release review; a video URL is already present in `PR_DESCRIPTION.md`.

## Public two-tab demo — separate from historical evidence

Run `node --test scripts/test-dashboard.mjs` (Node 22 or newer). Eight model tests passed locally: both-tab inclusive filtering, hidden-tab state reset, incomplete/invalid guards, tab-switch preservation, quick/custom modes, alert separation, real pagination, and empty results. These exercise the same model imported by the browser; they are not browser E2E tests or private .NET test results.

Use `bash scripts/serve-demo.sh`, then open `http://127.0.0.1:8080/evidence/mockup/demo.html`. Select records and page forward on each tab, apply 9–11 September, switch tabs, then clear one date. Expected: 2 runs and 4 changes, both pages reset, selections cleared, and incomplete input leaves the applied period unchanged. The August alert remains visible separately.

Media files and narration tools are intentionally excluded from Git. The external video still requires replacement and human playback review; no Git artifact is presented as the final export.

Verified manually in the browser: 9–11 September yields 2 runs and 4 changes; both tab navigation states reset; switching tabs preserves the refresh count; empty and reversed ranges leave the applied period unchanged; the August alert stays visible. Captures: `evidence/dashboard-tabs-overview.jpg` and `evidence/dashboard-tabs-changes.jpg`.

## Executable Public Controls

`node --test scripts/test-business-diagnostics.mjs` executes nine eval/negative cases against the same analyzer imported by the UI. It consumes input signals, applies the approved policy, derives evidence coverage and validates actual outputs against the JSON Schema. `ruby scripts/export-diagnostic-policy.rb --check` rejects YAML/browser projection drift. The validator implements the keywords used by this schema, not a general-purpose JSON Schema engine.

`python3 scripts/test-policy-controls.py` runs eleven tests covering untracked/staged denied paths, exact scope, custom deny precedence, rename/symlink handling, sanitized staging, required documentation, public-tree filtering and empty/failed/missing TRX results. Ignored local build/media files are not publication candidates; force-added denied files are still rejected. Package mutation tests additionally reject environment files, media binaries and missing diagnostic traceability. TRX guards are present in both host and offline verifiers; each phase requires at least one passed test, not just a successful command exit.

The submission-scoped CI lives in the repository root. It runs reproducible structural checks with pending media/review explicitly acknowledged; strict release checks still require independent `PASS`.

Verified locally after remediation: reference factory passes; both host and rebuilt offline Docker verifiers execute two focused/four non-live fixture tests and reject an empty focused filter with `STOP: no tests executed`. Browser walkthrough confirms different outputs for identity/cardinality/missing-evidence inputs, including blocked retry and required human review. No private application tests were rerun.

## Known Limits

- The UI test asserts generated page behavior at the template level; it is not a full browser end-to-end test.
- Live database integration tests were intentionally excluded from the broad run.
- A public reviewer cannot independently inspect the proprietary diff.
- The automatic transcript of the course is not evidence for this implementation.
