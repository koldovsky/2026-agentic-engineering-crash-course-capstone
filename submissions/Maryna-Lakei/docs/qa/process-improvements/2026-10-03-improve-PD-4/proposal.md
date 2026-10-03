# Improvement Proposal: improve-PD-4

> Drafted by the process-auditor. A human approves. This audit does not edit `scripts/ledger-report.mjs`.

- **Defect:** PD-4 (`docs/qa/process-defects.json`) — the process-health digest prints PASS while acceptance-artifacts, qa-verify, and gate-status are still red
- **Class / severity:** check-too-weak / P1
- **Status:** not adopted

## Scope

One change in the digest classifier. If any check is still red, or `unmetContracts` is greater than 0, the digest result is FAIL and the process exits 1.

It deliberately does not:

- Waive NFR-2 or invent a deploy artifact. After this change the current tree's digest stays FAIL until PD-1 is actually met and the still-red checks go green.
- Add `quality/visual-parity.config.json`. Visual fidelity stays NOT-EARNED.
- Edit `factory-lock.json`. `scripts/ledger-report.mjs` is not an entry in the lock map today.
- Treat a warning line as a pass.

## Target file

`scripts/ledger-report.mjs`

## Exact diff

```diff
--- a/scripts/ledger-report.mjs
+++ b/scripts/ledger-report.mjs
@@
     if (metrics.claimDivergence.total) warnings.push(`claim divergence: ${metrics.claimDivergence.total} (declared methods without artifacts / divergence events)`);
-    result = "PASS";
-    exitCode = 0;
+    const stillRedChecks = Object.entries(metrics.redToGreenLatency.perCheck)
+      .filter(([, latency]) => latency.stillRed)
+      .map(([name]) => name);
+    if (stillRedChecks.length) warnings.push(`${stillRedChecks.length} check(s) still red: ${stillRedChecks.join(", ")}`);
+    if (stillRedChecks.length || metrics.claimDivergence.unmetContracts > 0) {
+      result = "FAIL";
+      exitCode = 1;
+    } else {
+      result = "PASS";
+      exitCode = 0;
+    }
```

## Expected metric movement

- **Metric:** `result` in `docs/qa/process-health.md` / `trace/process-health.json`
- **Current:** `PASS` while `acceptance-artifacts`, `qa-verify`, and `gate-status` are `stillRed: true` and `unmetContracts` is 1
- **Expected after fix:** `PASS -> FAIL` on the current ledger. It may return to PASS only after those checks are green and `unmetContracts` is 0.
- **Verified by:** the next retro. A digest that still says PASS beside Still red **yes** means revert.

## EXECUTED red→green proof

Red is the digest already generated at 2026-10-03T09:10:50.117Z. This audit did not re-run `node scripts/ledger-report.mjs`, because that script rewrites `docs/qa/process-health.md` and the deterministic `docs/qa/process-defects.json`. Green is not executed. Approval waits until the fixtures below have been run and their output pasted over this section.

```text
Result: PASS, 1 warning(s)
| acceptance-artifacts | 2 | 2 | 1 | - | yes |
| qa-verify | 2 | 2 | 1 | - | yes |
| gate-status | 2 | 2 | 1 | - | yes |
Declared-but-unmet acceptance contracts: NFR-2 (deploy-gated)
```

- **Red fixture:** `tests/fixtures/ledger/red-still-red/` — a ledger with one check still red, or one unmet deploy-gated contract, and product code present. `node scripts/ledger-report.mjs` must print `Result: FAIL` and exit 1.
- **Green fixture:** `tests/fixtures/ledger/green/` — no still-red check and `unmetContracts` 0. The same command must print `Result: PASS` and exit 0.
- **Test:** `node tests/ledger-report.test.mjs`

```text
NOT EXECUTED — do not approve until this block is a real run.
```

## Rollback (one revert)

- **Single commit:** yes. Rollback is `git revert <sha>`.
- **State to clean up on revert:** a process-health digest written by the new classifier. Re-run the reverted script if the working tree should show the old headline.
- **Ladder position:** experimental. The check already exists; this tightens its result label. Promote only after two truthful runs with no false FAIL on a ledger that has no still-red check and no unmet contract.

## Approval & trailer convention

- Human approver: Maryna Lakei · Date: 2026-10-03
- Decision: not adopted. `scripts/ledger-report.mjs` was not changed. No implementation diff exists, and there is no `Refs: PD-4` commit. This folder is archived so a declined proposal is not an active change.
