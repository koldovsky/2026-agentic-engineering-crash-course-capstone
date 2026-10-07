# Handoff

## Current State

The public package contains runnable synthetic demonstrations and verified local controls. A Google Drive link exists; no video or audio binary belongs in Git. Historical private test results remain explicitly classified.

## Remaining Human Actions

1. Replace the file behind the existing Drive URL with the approved export.
2. Watch it end to end while signed out; confirm privacy and narration/visual alignment.
3. Obtain a fresh checker verdict and append the outcome to the ledger.
4. Run `bash scripts/verify-package.sh` without overrides before declaring release approval.
5. Confirm any course-duration exception with the course reviewer.

## Maintenance

Run the Node suites, Python policy tests, package checks and mutation gates after changes. Regenerate browser policy with `ruby scripts/export-diagnostic-policy.rb` after approved YAML changes; the gate rejects stale projections. Rebuild the sandbox image after verification-script changes.

Do not publish private implementation, raw recordings, production data or credentials. Git branch maintenance does not authorize editing the existing PR or uploading media.
