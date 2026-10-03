# Closed improvement proposals

These folders are the closed PD-1 through PD-5 proposals. They are not capability slices.

`openspec/changes/archive/` is scanned by `check-trajectory --release`. Every directory there must have `design.md`, `tasks.md`, a clean `review-findings.json`, and a `Slice:` commit. These proposals do not have those artifacts. Inventing them would be false slice evidence, so the folders are kept here instead.

- PD-1 was applied. Commit `4780057` ends with `Refs: PD-1`. The live deploy file is `docs/qa/deploy-verification.json`.
- PD-2 was applied. Commit `10269e4` ends with `Refs: PD-2`. That commit was not amended.
- PD-3, PD-4, and PD-5 were not adopted. Their scripts were not changed, and there is no implementation diff.
