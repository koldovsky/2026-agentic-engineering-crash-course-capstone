# Improvement Proposal: improve-PD-5

> Drafted by the process-auditor. A human approves. This audit does not edit `scripts/qa-verify.mjs`.

- **Defect:** PD-5 (`docs/qa/process-defects.json`) — qa-verify stops at the first FAIL, so the latest bundle never records later members
- **Class / severity:** check-too-weak / P1
- **Status:** not adopted

## Scope

Stop breaking the battery loop on the first FAIL. Later members still run and are written into `docs/qa/automated-verification-latest.md`. If any member failed, the overall line stays `Fail`.

It deliberately does not:

- Turn visual-fidelity into PASS. When that member runs it may print NOT-EARNED because `quality/visual-parity.config.json` is absent. Leave that row NOT-EARNED. Do not add the config. Pixel parity is not an approved requirement.
- Waive NFR-2 or skip acceptance-artifacts.
- Hide factory-integrity. After this change a current run should show the PD-2 lock FAIL in the bundle until PD-2 is resealed.
- Land in the same commit as PD-2. PD-2 edits `factory-lock.json` first. This commit then updates only the `scripts/qa-verify.mjs` hash to the sha256 of the landed bytes.

## Target file

`scripts/qa-verify.mjs`

`factory-lock.json` must update the existing `scripts/qa-verify.mjs` entry in the same commit, because that file is locked (`fdcd0b3d4db03837702fc81e94ab27a1ce16aa235e4fb32413b563478243c2c0` today). The new hash is computed from the landed bytes. It is not invented here. No other lock entry moves in this commit.

## Exact diff

```diff
--- a/scripts/qa-verify.mjs
+++ b/scripts/qa-verify.mjs
@@
   emitLedger({
     event: "check-run",
     check: entry.name,
     exitCode: result.exitCode,
     scope_n: scopeN,
     durationMs: Date.now() - startedMs,
     meta: { status, productCode, notEarned: status === "NOT-EARNED" },
   });
   if (status === "FAIL") {
     console.error(`Command failed: ${entry.name}`);
-    break;
   }
 }
```

The overall classifier already prefers a FAIL member over a NOT-EARNED member (`if (failMember) overall = "Fail"`). Do not reorder that. A visual-fidelity NOT-EARNED row must not become `Overall result: Pass`, and it must not erase the NFR-2 Fail.

## Expected metric movement

- **Metric:** `qaVerify.membersRecorded` (rows in `docs/qa/automated-verification-latest.md`)
- **Current:** the table ends at `acceptance-artifacts` FAIL. `factory-integrity` is absent. README states the battery stopped.
- **Expected after fix:** every member in the `commands` list is recorded. Overall remains `Fail` while NFR-2 fails.
- **Verified by:** the next retro reads the check table. A table that still ends at the first FAIL means revert.

## EXECUTED red→green proof

Red is the current bundle, generated 2026-10-02T17:53:53.763Z. Green is not executed. Approval waits until the fixture test output replaces the block below.

```text
| acceptance-artifacts | `node scripts/check-acceptance-methods.mjs --mode=artifact` | FAIL | 1 |

Acceptance artifacts then failed on the missing NFR-2 deploy report, so the battery stopped.
```

- **Red fixture:** a battery whose first member exits 1 and whose later member would fail or print NOT-EARNED. The report must contain the later member. Overall must be `Fail`.
- **Green fixture:** every member exits 0 with a non-empty earned scope. Overall must be `Pass`. A missing visual-parity config on a product tree is not this green fixture; that member stays NOT-EARNED and must not be turned into Pass by adding a config.
- **Test:** `node tests/qa-verify.test.mjs`

```text
NOT EXECUTED — do not approve until this block is a real run.
```

## Rollback (one revert)

- **Single commit:** yes, including the one lock-hash update for `scripts/qa-verify.mjs`. Rollback is `git revert <sha>`.
- **State to clean up on revert:** `docs/qa/automated-verification-latest.md` if the new battery rewrote it. Re-run the reverted script or restore that report in the revert.
- **Ladder position:** experimental. Promote only after two truthful runs where a later real failure is visible and a fully green battery still prints Pass.

## Approval & trailer convention

- Human approver: Maryna Lakei · Date: 2026-10-03
- Decision: not adopted. `scripts/qa-verify.mjs` was not changed. No implementation diff exists, and there is no `Refs: PD-5` commit. This folder is archived so a declined proposal is not an active change.
