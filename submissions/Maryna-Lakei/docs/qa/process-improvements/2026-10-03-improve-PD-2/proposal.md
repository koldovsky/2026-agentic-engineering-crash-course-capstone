# Improvement Proposal: improve-PD-2

> Drafted by the process-auditor. A human approves. This audit does not apply the change and does not edit `factory-lock.json` or `.githooks/commit-msg`.

- **Defect:** PD-2 (`docs/qa/process-defects.json`) — `.githooks/commit-msg` no longer matches `factory-lock.json`, and two quality baselines are unlocked
- **Class / severity:** process-bypass / P1
- **Status:** approved and applied

## Scope

Reseal the lock onto the hook that is on disk, and add the two unlocked baselines to the lock, in one commit.

The on-disk hook makes the commit-message path absolute before `cd`, because this project lives in a nested folder and Git starts the hook at the outer repository root. Restoring the locked bytes (`17f6801b…`) would break commits. Do not restore them.

It deliberately does not:

- Edit `.githooks/commit-msg` or `.githooks/pre-commit`.
- Run a blind `node scripts/check-factory-integrity.mjs --init-lock` that rewrites every hash or drops `adaptations`.
- Change `git config`, including `core.hooksPath`. The integrity warning that suggests `git config core.hooksPath .githooks` is not part of this fix. The ledger already shows `commit-msg` runs with the nested path.
- Add `quality/visual-parity.config.json`. The adaptation `no visual-parity config: no pixel-fidelity requirement` stays. Visual fidelity stays NOT-EARNED.
- Waive NFR-2 or add a deploy report (PD-1).

Land this commit before any later proposal that also edits `factory-lock.json` (PD-5).

## Target file

`factory-lock.json`

Only the `files` map changes. `createdAt`, `gitHead`, and `adaptations` stay as they are. The baseline files themselves are not rewritten; they are only named in the lock.

## Exact diff

Hashes below were measured on 2026-10-03:

- `.githooks/commit-msg` = `8a2de0399509972051fcd5a93a703be40d51d9058971c9f239921fb5c7ca1d46` (matches the 2026-10-02 risk-register measurement)
- `quality/coverage-baseline.json` = `5c20fc7e5a4d422d140a697c76347987b2a338159fb72f7bb089d222c7c422d0`
- `quality/eval-baseline.json` = `4ae88b30f37685078d3104fc6be957ef49e8038c7bd71707504c9d1e2d1ad9dd`

Recompute them at approval time. If a hash moved, the diff that lands is the recomputed one, not a stale copy.

```diff
--- a/factory-lock.json
+++ b/factory-lock.json
@@ -8,10 +8,12 @@
     ".claude/workflows/uat-triage.js": "bcad8666cf3358fa37ece9c6c5096281520f516470675a9aabd8361cbdf45ad2",
     ".claude/workflows/vision-verify.js": "84c893a066088a158d308a3a21cf7cd3b44fdefb4f503ef9bd85507b7364fc69",
-    ".githooks/commit-msg": "17f6801b1211de2c38eeff1349350fc3aadff2c687138e594b0adb1721038bd6",
+    ".githooks/commit-msg": "8a2de0399509972051fcd5a93a703be40d51d9058971c9f239921fb5c7ca1d46",
     ".githooks/pre-commit": "ac7e56f7230b9388ea9abb25c5c0cde2b1574714362c32653f551000802e88d5",
     ".github/workflows/ci.yml": "c4773bcbeedbbb0f18806876fc4eec67617ee7c63fba22feadc1424befbf5a52",
+    "quality/coverage-baseline.json": "5c20fc7e5a4d422d140a697c76347987b2a338159fb72f7bb089d222c7c422d0",
+    "quality/eval-baseline.json": "4ae88b30f37685078d3104fc6be957ef49e8038c7bd71707504c9d1e2d1ad9dd",
     "quality/process-baseline.json": "c4138cf68d31420931034e59d580cc4db6fdd08550de95347c7396bd9b2923d5",
     "quality/telemetry.config.json": "98276dbbd18f9d694f3378aed7ecc042439d99c8e292bb3caeed7a833005835b",
```

## Expected metric movement

- **Metric:** factory-integrity result for `.githooks/commit-msg` and the two baseline warnings
- **Current:** `Result: FAIL, 3 warning(s)` (executed 2026-10-03)
- **Expected after fix:** `FAIL -> PASS`, and the two `NOT in factory-lock.json` warnings for `quality/coverage-baseline.json` and `quality/eval-baseline.json` disappear
- **Verified by:** the next retro re-runs `node scripts/check-factory-integrity.mjs`. No movement means revert.

## EXECUTED red→green proof

Red was executed on 2026-10-03 with `node scripts/check-factory-integrity.mjs` (exit 1). Green has not been executed, because this audit must not reseal the lock.

```text
WARN  [quality/coverage-baseline.json] gate-bearing file exists but is NOT in factory-lock.json — reseal via --init-lock in an approved "Refs: PD-<n>" commit so it becomes tamper-evident too.
WARN  [quality/eval-baseline.json] gate-bearing file exists but is NOT in factory-lock.json — reseal via --init-lock in an approved "Refs: PD-<n>" commit so it becomes tamper-evident too.
WARN  [hooks] gap: core.hooksPath is "submissions/Maryna-Lakei/.githooks" — .githooks/ exists but git will never run it; run `git config core.hooksPath .githooks`.
FAIL  [.githooks/commit-msg] gate-bearing file drift (hash drift) vs factory-lock.json with NO commit touching it whose message contains "Refs: PD-<n>". Gate scripts may only change through an approved improvement (executed red-to-green proof + human approval). Restore the locked file or land the approved "Refs: PD-<n>" commit.

Scope: 26 locked file(s)
Result: FAIL, 3 warning(s)
```

The hooks warning is recorded and is not fixed by this diff. Do not run the `git config` command it prints.

Green fixture: not executed.

## Rollback (one revert)

- **Single commit:** yes. Rollback is `git revert <sha>`.
- **State to clean up on revert:** none. The hook file is untouched, so a revert only restores the previous lock map.
- **Ladder position:** not a new check. The existing integrity lock stays hard. This commit is the `Refs: PD-2` seal it already requires.

## Approval & trailer convention

- Human approver: Maryna Lakei · Date: 2026-10-03
- Commit message MUST end with the trailer line: `Refs: PD-2`
- The human is deciding to trust the on-disk hook. Until that decision, the lock stays as it is and integrity stays red.
