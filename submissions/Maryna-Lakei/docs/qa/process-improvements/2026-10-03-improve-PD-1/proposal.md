# Improvement Proposal: improve-PD-1

> Drafted by the process-auditor. A human approves. This audit does not apply the change.

- **Defect:** PD-1 (`docs/qa/process-defects.json`) — NFR-2 deploy-gated evidence was never produced, so release stays blocked
- **Class / severity:** missing-check / P0
- **Status:** approved and applied

## Scope

This proposal produces the missing deploy artifact by a real deploy. It does not change a gate.

It deliberately does not:

- Add a waiver for NFR-2, or any file under `docs/qa/waivers/`.
- Commit a hand-written or placeholder `docs/qa/deploy-verification.json`, `docs/qa/deploy-verification.md`, or `docs/qa/deploy-report.*`.
- Edit `scripts/check-acceptance-methods.mjs` or `scripts/check-deploy.mjs` so the missing artifact can pass.
- Add `quality/visual-parity.config.json`. Visual fidelity stays NOT-EARNED.
- Reseal `factory-lock.json` (that decision is PD-2).

## Target file

`docs/qa/deploy-verification.json`

Written only by the real deploy path. `scripts/check-deploy.mjs` already rejects a file that lacks `status` in `passed`, `pass`, `ok`, or `green`, or that lacks a non-empty `url`. No gate script moves in this commit.

## Exact diff

No gate diff. Do not land the illustration below as a file. A real deploy creates the JSON; the commit adds that generated file and nothing else.

```diff
--- /dev/null
+++ b/docs/qa/deploy-verification.json
@@
+{
+  "status": "<passed|pass|ok|green, from the deploy run>",
+  "url": "<the live URL the deploy just verified>"
+}
```

Forbidden substitute (do not commit):

```diff
--- /dev/null
+++ b/docs/qa/deploy-verification.json
@@
+{ "status": "passed", "url": "https://example.invalid" }
```

## Expected metric movement

- **Metric:** `claimDivergence.unmetContracts` (`trace/process-health.json`)
- **Current:** 1 (NFR-2, method `deploy-gated`)
- **Expected after fix:** `1 -> 0`
- **Verified by:** the next retro. `node scripts/check-acceptance-methods.mjs --mode=artifact` must no longer print the NFR-2 failure. No movement means this proposal did not land a real artifact; revert it.

## EXECUTED red→green proof

Red was executed by `node scripts/qa-verify.mjs` and is recorded in `docs/qa/automated-verification-latest.md` (finished 2026-10-02T17:53:53.763Z). Green has not been executed. This draft cannot be approved until the green run below is replaced with output from the real deploy.

```text
FAIL  [NFR-2] deploy-gated: no deploy-gated artifact found (expected: docs/qa/deploy-verification.json | docs/qa/deploy-verification.md | docs/qa/deploy-report.*) — run the deploy-gated mechanism and commit its report
acceptance (artifact): 30 contract(s) across 18 requirement(s) — 1 failure(s), 0 warning(s), 0 pending
Result: FAIL
```

Green was executed on 2026-10-03 after the production deploy of `marynalakei-png/ai-requirements-assistant`. The artifact is the generated `docs/qa/deploy-verification.json` for `https://ai-requirements-assistant-umber.vercel.app`. No waiver was added.

```text
deploy-gated: https://ai-requirements-assistant-umber.vercel.app
acceptance (artifact): 30 contract(s) across 18 requirement(s) — 0 failure(s), 0 warning(s), 0 pending
Result: PASS
```

## Rollback (one revert)

- **Single commit:** yes — the commit that adds the real deploy report. Rollback is `git revert <sha>`.
- **State to clean up on revert:** the reverted report file. Do not leave a copy under another name.
- **Ladder position:** not a new check. The existing deploy-gated check stays hard.

## Approval & trailer convention

- Human approver: Maryna Lakei · Date: 2026-10-03
- Commit message MUST end with the trailer line: `Refs: PD-1`
- Approval requires the green proof pasted above. A waiver trailer does not satisfy this defect.
