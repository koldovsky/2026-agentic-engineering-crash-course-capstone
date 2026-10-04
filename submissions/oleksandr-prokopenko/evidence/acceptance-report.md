# Acceptance report

Prepared 2026-10-01 (Europe/Kyiv) for the owner, Oleksandr Prokopenko; updated the same day, 18:39, after his seven release-gate decisions
("approve the recommended"), on branch `worktree-agent-a564c3b75b20b899e`, not pushed. This report states what is proven, what is not,
and what only the owner can do. It carries no overall pass: three gates (G4, G6, G7) are FAIL, for two reasons that section 1 names.

Index of the pack: [README.md](README.md). Matrix: [requirements-traceability-matrix.md](requirements-traceability-matrix.md) (generated from
the same data as [traceability-report.md](traceability-report.md)). Quality bar: [eval-report.md](eval-report.md), 50 cases, all pass.

## 1. Gate status

The computed result of `node scripts/gate-status.mjs` on 2026-10-01 is in section 9, raw. The frontier is **G3**: a gate counts only when
every gate below it is PASS.

| Gate | Status | What decides it | Evidence | Why it is not green, and what it needs |
|---|---|---|---|---|
| G0 | PASS | scaffold and loop installed | `scripts/check-traceability.mjs`, `.githooks/` | none |
| G1 | PASS | the owner's `docs/qa/signoffs/G1.json` for `docs/requirements.md` | signed at f67db3c | none |
| G2 | PASS | `openspec validate --all --strict` and traceability | section 9 | none |
| G3 | PASS | the owner's `G3.json` for `docs/mvp-capability-plan.md`, plus `acceptance-methods --mode=existence` | signed at f67db3c; existence PASS over 192 tagged requirements | none |
| G4 | FAIL | validate, traceability, trajectory, acceptance (artifact), process ratchet, integrity | validate PASS, traceability PASS, trajectory PASS (51 folders), process ratchet PASS (baseline earned, decision 7) | acceptance (artifact) FAIL: 103 e2e contracts (reason A below). Integrity FAIL: three sealed scripts changed by PD-49 (reason B below). |
| G5 | PASS | coverage ratchet | `coverage/coverage-summary.json` (local, gitignored): lines 96.03, statements 96.86, functions 97.3, branches 91.28; baseline ratcheted in `c68ee48` | Local evidence only: a fresh clone prints NOT-EARNED until `npm run test:coverage` (about 25 minutes) runs again. |
| G6 | FAIL | recordings, evals, acceptance (artifact), visual fidelity, process ratchet, integrity | recordings PASS (79 clips, 7 manifests), evals PASS (50 cases, error-clarity 91.9, translation-quality 82.6), visual fidelity PASS (1 waiver, decision 5), process ratchet PASS | acceptance (artifact) FAIL (reason A) and integrity FAIL (reason B). |
| G7 | FAIL | strict release traceability, release trajectory, recordings, acceptance (artifact), integrity | traceability `--release --strict-tests --strict-recordings` PASS (0 failures, 105 waived warnings, decision 3); trajectory `--release --check-fresh` PASS over 51 folders (decision 4); recordings PASS | acceptance (artifact) FAIL (reason A) and integrity FAIL (reason B). |
| G8 | PASS | a recorded UAT round in `docs/qa/uat/` | [uat/round-1-2026-10-01.md](uat/round-1-2026-10-01.md): the owner's own live use, zero bugs reported (decision 6) | none for the gate. The round is the owner's free use, without a per-case result; the photographer's run is still to come (section 5). |

**Reason A, 103 e2e contracts read as missing.** `check-acceptance-methods` joins each `e2e` requirement to `docs/qa/e2e-report.json`.
That file is gitignored. It was written by the full three-engine run of 16:33 to 16:52 (960 passed, 4 skipped), and a later run
replaced it. Its `config.argv` today is `playwright test tests/e2e/home.spec.ts --project=chromium --no-deps`, `stats` is one expected test,
started 2026-10-01T15:12:47Z (18:12 Kyiv). The 103 failing lines all read `holds no result of a spec that carries "@trace <id>"`; no
failing line comes from a test that failed. Repeating `npm run test:e2e` (about 19 minutes) on the main checkout, with nothing else using
the local stack, writes the full report again. That run was not started in this pass.

**Reason B, three sealed scripts wait for the owner.** Decisions 3, 4 and 5 had no supported waiver in `check-traceability`,
`check-trajectory` and `check-visual-fidelity`. PD-49 adds one (`openspec/changes/archive/2026-10-01-improve-PD-49/proposal.md`, applied in
`0e31ebd` with `Refs: PD-49`, red 7 of 15 tests fail, green 15 of 15). `check-factory-integrity` fails on those three files until the owner
records his approval; the command is in section 7.

## 2. What changed in the evidence on 2026-10-01

| Item | Before | After | Evidence |
|---|---|---|---|
| Waivers without a correction record | 4 (`NFR-18-session-page-lcp`, `backup-deploy-probes`, `loosen-eval-error-clarity-2026-10-01`, `slice6-red-e2e`) | all four recorded as COR-2 to COR-5, disposition `waived`, by the owner, with his words quoted | `retro/corrections/002` to `005` |
| Accessibility report | none; 6 a11y contracts red | [a11y-report.md](a11y-report.md): `check:a11y` on 12 public routes in light and dark, 0 serious or critical; the axe specs in three engines | the run of 16:33 to 16:52 |
| Recording artifact | none; 5 recording contracts red | [demo-recordings/manifest.json](demo-recordings/manifest.json), an index of the real clips of the six manifests | NFR-31 is gate-blind, section 4 |
| E2E report | NFR-28 and NFR-30 had no result | both had a traced spec that passed in Chromium, WebKit and Firefox in the run of 16:33 to 16:52; the report was replaced at 18:12 by a one-test run (reason A) | commit `7aaf1ec`; `docs/qa/e2e-report.json` is gitignored |
| Coverage | NOT-EARNED, scope 0 | PASS, scope 4 | `quality/coverage-baseline.json` |
| `docs/current-state.md` header | two DIVERGENCE hard fails | none | section 9 |
| Release-gate decisions (18:11 to 18:39) | G3 and G1 re-signed at f67db3c; seven decisions open | recorded as waivers, a UAT round, a process baseline and PD-49 | section 7 |

## 3. Test evidence of this run (2026-10-01)

| Layer | Result | Where the raw output is |
|---|---|---|
| Frontend unit (Vitest) | 95 files, 1007 passed | `npm --prefix frontend run test:coverage`, run 16:53 |
| Backend unit (JUnit) | 1058 passed, 0 failed | `backend/target/surefire-reports`, same run |
| Backend integration (Testcontainers, `*IT.java`, with `PhotoQualityIT` on the committed photo set) | 562 run, 0 failures, 0 errors, 13 skipped | `backend/target/failsafe-reports`. **Run twice**: the first `mvnw verify` lost its Postgres container to a read timeout and 142 tests in 15 classes errored (`AboutAdminIT`, `AdminPublishIT`, `AdminPreviewApiIT` and twelve more); those 15 classes were run again alone and passed. The JaCoCo data of both runs is merged. |
| Factory scripts | 183 passed in this tree (the run of 16:53 counted 163; the PD-49 tests are 15 of the difference) | `npm run test:scripts`; the PD-49 tests: `openspec/changes/archive/2026-10-01-improve-PD-49/proof/tests-red.txt`, `tests-green.txt` |
| Deploy config | 498 passed | `npm run test:deploy` |
| E2E, Chromium, WebKit, Firefox (`npx playwright test`, 19.1 min) | 960 passed, 4 skipped, 0 failed, 0 flaky | `docs/qa/e2e-report.json` held it from 16:52 to 18:12, when it was replaced (reason A); `docs/qa/final-run-2026-10-01.md` has raw tails of the earlier full run |
| Axe, public routes, light and dark | 12 routes, 0 serious or critical | [a11y-report.md](a11y-report.md) |
| Evals | 50 cases pass; error-clarity 91.9, translation-quality 82.6 | [eval-report.md](eval-report.md) |
| Recordings | 79 clips checked, all asserted, vision verdicts met | [recordings-report.md](recordings-report.md), [vision-report.md](vision-report.md) |

Not run in this pass: lint, typecheck, the production build, `PhotoQualityIT` on the photographer's 36 private photos (Mac only; the run of
`final-run-2026-10-01.md` included them), the full e2e suite again, and any live probe (`check:deploy` last ran at 15:56,
`deploy-verification.json`).

## 4. Acceptance criteria per capability

Each capability is accepted when every requirement it owns has evidence of the method it declares. The numbers come from
`trace/acceptance-contracts.json` (the output of `check-acceptance-methods --mode=artifact`) as generated with the full e2e report of 16:52;
the capability is the baseline spec that names a requirement most often. "Waived" lists the requirements whose deploy-gated line a
written owner decision releases, so the gate reads them as waived. The e2e entries read ok against that report and read missing against
today's one-test report (reason A).

| Capability (spec) | MVP requirements named most often in it | Declared methods all ok | Waived | Not ok |
|---|---|---|---|---|
| public-site | 36 FR, 8 NFR | 41 | NFR-18, NFR-19, NFR-20 | - |
| photo-pipeline | 14 FR, 3 NFR | 16 | NFR-21 | - |
| admin-access | 9 FR, 4 NFR | 13 | - | - |
| portfolio-admin | 38 FR, 5 NFR | 43 | - | - |
| booking-requests | 29 FR, 4 NFR | 32 | NFR-22 | - |
| error-alerts | 9 FR, 2 NFR | 11 | - | - |
| ai-translate | 6 FR, 2 NFR | 8 | - | - |
| operations | 14 FR, 9 NFR | 9 | FR-136, FR-137, FR-138, FR-141, NFR-26, FR-146, FR-147, FR-148, FR-149, FR-150, NFR-7, NFR-11, NFR-23, NFR-24 | - |

What each capability owes the owner, in plain words, and what stands behind it:

| Capability | The owner can expect | Evidence | Open | Sign-off |
|---|---|---|---|---|
| public-site (Overview, Sessions, session page, About, Privacy, 404, header, footer, UA/EN, viewer, link previews) | the pages and behaviour of FR-1 to FR-36 and FR-10, FR-11 | e2e in three engines (`public-*.spec.ts`), 79 clips with vision verdicts met, axe, evals of the 404 and error texts | NFR-18 is waived for all three page types (the speed numbers are in the deploy-gated table below); manual plan run only in part (round 1); Edge, iOS Safari and Android Chrome not covered (NFR-28) | ____ |
| photo-pipeline | copies in five widths and three formats, no metadata, originals never public, a seed command | `PhotoQualityIT` (SSIM, colour profile, no GPS), JUnit, e2e media specs | NFR-21 (24 megapixels in 60 s on the live server) is waived: no live probe; the live run of 2026-09-29 took 40.9 s for a 27 MP photo | ____ |
| admin-access | Google-only sign-in, allowlist, sign-out, access-denied, guard on every admin address | e2e `admin-*`, 6 clips, axe | none open; the allowlist and cookie checks are automated only | ____ |
| portfolio-admin | the photographer creates, uploads, orders, previews, publishes, unpublishes, deletes, edits the Overview and About | e2e `admin-*` and `about-serial`, clips `30-owner-flow` and `40-about-admin`, axe, evals; the owner's own use on 2026-10-01 (UAT round 1) | NFR-31 (the photographer alone): no person other than the owner has run it, MT-40 | ____ |
| booking-requests | the Order form, the thank-you within a minute, the admin list with statuses, Telegram notices | e2e `booking-*`, clips `20` to `23`, evals of the form errors | NFR-22 (notice within 10 s) is waived: 1.275 s measured live at the slice archive (`openspec/changes/archive/2026-10-01-add-booking-requests/proof/live-request.txt`), no probe in the gate | ____ |
| error-alerts | every server error reaches the errors group once, with the secret values masked | JUnit, `error-alerts-*` e2e, one real Telegram test, a real alert from the forced backup failure | none open | ____ |
| ai-translate | the translate button fills the English field and leaves it editable | JUnit, `admin-translate` e2e, eval translation-quality 82.6; the owner used it live on 2026-10-01 | the live OpenAI call is a paid external service (R-21) | ____ |
| operations (deploy, HTTPS, Caddy routing, backups, restore) | live HTTPS, `[deploy]`-tagged releases, nightly backups, a rehearsed restore | `caddy-*` e2e, 498 deploy tests, `restore-rehearsal.md` (ten steps, PASS), live proofs under `openspec/changes/archive/2026-10-01-add-backups/proof/` | fourteen deploy-gated requirements are waived and most have no live probe (the deploy-gated table below); NFR-24 has the weakest evidence | ____ |

### The deploy-gated entries

`docs/qa/deploy-verification.json` has `status: "failed"`, and the artifact check reads that one file-level status for every
`deploy-gated` requirement. NFR-18 fails in it, so every deploy-gated requirement without an open waiver fails with it, even where its own
probe passed. Since 2026-10-01 every deploy-gated requirement has an open waiver. What the file says about each (probe run 15:56):

| Requirement | Probe result in the file | Waiver |
|---|---|---|
| NFR-18 | failed: p75 LCP over 5 mobile runs: `/` 3121 ms, `/sessions` 2872 ms, a session page 2571 ms; budget 2500 ms | `docs/qa/waivers/NFR-18-session-page-lcp.md`, extended to `/sessions` by decision 1 |
| NFR-19, NFR-20 | passed (first byte 81 ms; Lighthouse 94, 95, 97) | covered by the same waiver file because it names them |
| FR-146 | passed (HTTPS 200, Let's Encrypt, 87 days left) | `deploy-gated-server-side.md` (decision 2) |
| NFR-11 | passed (HTTP answers 308 to HTTPS) | decision 2 |
| FR-147, FR-148, FR-149, FR-150 | uncovered: the probe needs a GitHub token (or SSH) | decision 2 |
| NFR-7 | partial: ports 3000, 5432, 8080 refuse; SSH keys-only and automatic updates are not probed | decision 2 |
| NFR-21, NFR-22 | uncovered: no probe | decision 2 |
| NFR-23 | uncovered: needs SSH to the server | decision 2 |
| NFR-24 | partial: one answer in 69 ms; the monthly 99% needs the outside monitor's history (first report from 2026-11-01) | decision 2 |
| FR-136, FR-137, FR-138, FR-141, NFR-26 | uncovered: no R2 probe by design | `backup-deploy-probes.md` (owner, 2026-10-01, "i read it, i have no questions here. so approved as is") |

A fix that raises the priority of the first Sessions photos was deployed at 18:11 (921582d). The numbers above predate it and were not
repeated.

### Gate-blind spots the owner should know

- **NFR-31 has no clip that lists it.** The artifact check for `recording` asks only that a manifest holds at least one clip, so the index in
  `demo-recordings/manifest.json` makes it read `ok` for NFR-31, FR-25, FR-81, FR-111 and NFR-30 alike. The index names NFR-31 under
  `requirementsWithNoClip`. The clip `session-admin/30-owner-flow.webm` shows the whole flow but its manifest entry claims FR-60 to FR-83, not
  NFR-31; adding the claim needs a new recording and a fresh vision verdict.
- **`public-sessions/10-viewer-fills-window.webm` changes the window size mid-clip** (1000 x 575, then 1440 x 900), which the recording rule
  forbids; its two stills are valid and the 1440 x 900 still was looked at. The video is not evidence for the second size (R-12).
- **A recording index entry proves a requirement only through the clip's own assertions.** 105 MVP FRs have no clip at all; decision 3 accepts
  tests and evals for them (R-02).
- **The e2e, a11y-by-e2e and coverage evidence is local.** `docs/qa/e2e-report.json` and `coverage/` are gitignored and expire after 168
  hours (the check's freshness window); CI runs Chromium only.
- **The waivers of decisions 3 and 4 turn red lines into warnings.** `check-traceability` prints 105 warnings that name the waiver, and
  `check-trajectory` prints 120 findings of the 40 process folders (the 39 filed earlier and PD-49) as warnings that name theirs. They stay visible in
  `traceability-report.md` and `trajectory-report.md`.

## 5. Failures and limits, stated plainly

1. G4, G6 and G7 are FAIL: 103 e2e contracts read missing (reason A) and the integrity check waits for the owner (reason B).
2. NFR-18 is not met on any of the three page types. The owner accepted all three, `/sessions` last (decision 1). The `/sessions` number is from before the fix of 18:11.
3. The manual test plan has not been run case by case. UAT round 1 is the owner's free use of 2026-10-01 and records his words; the plan's Result column is empty, and the photographer has not run the demo script or MT-40.
4. Visual fidelity has no pixel measure, and none was invented. The vision pass (a fresh agent looking at each settled still, 79 clips, all met) is the only look-based evidence; the owner accepted it (decision 5). The check passes only while `docs/qa/vision-report.json` says `"met": true`.
5. The first backend integration run broke when a Postgres container timed out; no product test failed. The rerun of the 15 affected classes passed. The two runs are not one uninterrupted run.
6. 105 FRs have no clip and 40 process folders have no review evidence; the owner waived both (decisions 3 and 4). Nothing was invented to make those checks pass.
7. The process baseline records acceptance coverage of 132 of 235 contracts, a low floor caused by reason A. It tightens after a full e2e run (R-23).
8. The deploy-gated waivers rest on tests and proofs older than today for NFR-7 (2026-09-28), NFR-21 (2026-09-29) and NFR-23 (2026-09-30); NFR-11 has no test, only today's probe; NFR-24 has one answer and no monthly figure.
9. The lock `factory-lock.json` is not resealed for PD-49. After the owner's `--approve` the integrity check passes with a warning that names the drift (`tests/scripts/integrity-reseal.test.mjs`, "an edit committed after the reseal with its own Refs trailer is covered", pins that case; the real approval was not run); a later `--init-lock` reseals it.

## 6. Waivers and the owner's approvals on record

| Correction | Waiver | Owner's words (quoted) | Date |
|---|---|---|---|
| COR-1 | R2 lifecycle rule, resolved | "PD-48; PD-31; closing COR-1 — i approve these, do it." | 2026-10-01 |
| COR-2 | `NFR-18-session-page-lcp.md` | "3088 is fine. leave as is"; "Yes, extend the waiver (Recommended)"; "approve the recommended" (item 1, `/sessions`) | 2026-09-30, extended 2026-10-01 |
| COR-3 | `backup-deploy-probes.md` | "i read it, i have no questions here. so approved as is" | 2026-10-01 |
| COR-4 | `loosen-eval-error-clarity-2026-10-01.json` | "i read it, i have no questions here. so approved as is" | 2026-10-01 |
| COR-5 | `slice6-red-e2e.md` | "i read it, i have no questions here. so approved as is" | 2026-10-01 |
| COR-6 | `deploy-gated-server-side.md` | "approve the recommended" (item 2) | 2026-10-01 |
| COR-7 | `no-clips-non-visual-requirements.json` | "approve the recommended" (item 3) | 2026-10-01 |
| COR-8 | `process-proposals-trajectory.json` | "approve the recommended" (item 4) | 2026-10-01 |
| COR-9 | `visual-fidelity-vision-verify.json` | "approve the recommended" (item 5) | 2026-10-01 |

The words of COR-3 to COR-5 were relayed to the author of the earlier version of this report by the agent that started the work, quoting
the owner; the source the waiver files name is `docs/local/handoff/owner-questions-2026-10-01.md` (local only). The words of COR-2
(item 1) and COR-6 to COR-9 reached the author of this update in the task that ordered it, which quotes the owner's answer in chat of
2026-10-01: "approve the recommended". The owner's list of seven that he answered is quoted in each waiver file and in `docs/qa/uat/round-1-2026-10-01.md`.
The note of COR-2 still says the Sessions page is not covered; decision 1 supersedes it, and the correction file was left as written.

## 7. Decisions of 2026-10-01 and what is left for the owner

The owner answered "approve the recommended" in chat to this list of seven. What was recorded for each, and where:

| # | Decision (the owner's list) | What was recorded | Where | Gate effect |
|---|---|---|---|---|
| 1 | NFR-18 on the Sessions page: extend the speed waiver (as for the session page and the Overview) | The existing waiver now covers all three page types; it quotes the item and the raw probe (`/sessions` 2872 ms over 2500 ms at 15:56) and says no probe ran after the 18:11 fix | `docs/qa/waivers/NFR-18-session-page-lcp.md` (COR-2) | NFR-18 reads waived in `check-acceptance-methods` (it already did) |
| 2 | The eleven server-side requirements with no automatic live check: waive in writing | A new waiver naming the eleven, with the probe result per requirement (raw JSON), the deploy tests and the live proof per requirement, and the gap that remains for each | `docs/qa/waivers/deploy-gated-server-side.md` (COR-6) | the 11 deploy-gated failures read waived; no deploy-gated line fails |
| 3 | Clips for the ~105 non-visual requirements: tests and evals are enough | No supported mechanism existed. PD-49 makes `check-traceability` read a JSON waiver; the waiver lists the 105 ids, none of which declares `recording` or `vision-verify`. A `.md` waiver would also have hidden their e2e failures, so it is JSON | `docs/qa/waivers/no-clips-non-visual-requirements.json` (COR-7), `scripts/check-traceability.mjs` | `traceability --release --strict-tests --strict-recordings`: 0 failures, 105 warnings that name the waiver |
| 4 | The archived process proposals: waive the release trajectory check | No supported mechanism existed. PD-49 makes `check-trajectory` read a JSON waiver naming each archive folder (40, with `improve-PD-49`); `improve-PD-9` does not release `improve-PD-90`; the report is the same with and without `--release` | `docs/qa/waivers/process-proposals-trajectory.json` (COR-8), `scripts/check-trajectory.mjs` | `trajectory --release --check-fresh`: PASS over 51 folders, 133 warnings |
| 5 | Look versus design: accept the vision-verify verdicts as the evidence | No supported mechanism existed. PD-49 makes `check-visual-fidelity` read a JSON waiver; it passes with `Scope: 1 waiver(s)` only while `docs/qa/vision-report.json` says `"met": true`, and runs the pixel diff if a config exists | `docs/qa/waivers/visual-fidelity-vision-verify.json` (COR-9), `scripts/check-visual-fidelity.mjs` | visual fidelity PASS, 1 warning |
| 6 | User test round: the owner's own live use on 2026-10-01 counts as round 1; the photographer runs the demo script later | A UAT round with his words, zero bugs reported, the closest plan cases (marked as the author's reading), what it does not cover, and what is still open | `docs/qa/uat/round-1-2026-10-01.md` | G8 PASS |
| 7 | Process baseline: accept today's numbers as the floor | `check-process-ratchet --update` on the refreshed digest: acceptance coverage 132 of 235, vacuous passes 0, the budgets of `quality/telemetry.config.json` | `quality/process-baseline.json`, `trace/process-health.json`, commit `260d09c` | process ratchet PASS over 4 guards; the floor is low (reason A, R-23) |

PD-49 (items 3, 4 and 5): `openspec/changes/archive/2026-10-01-improve-PD-49/proposal.md`, the diff in `proof/sealed-scripts.diff`, red in
`proof/tests-red.txt` (8 of 15 pass, 7 fail) and green in `proof/tests-green.txt` (15 of 15). The proposal is marked as approved by the owner
on 2026-10-01 ("approve the recommended"). Commit `0e31ebd`, trailer `Refs: PD-49`.

What only the owner (or the next agent on the main checkout) can do now:

1. **Approve PD-49.** Agents are denied this command. Run it in the repository root, review the diff first, then commit `docs/qa/approvals/PD-49.json`:

   ```
   node scripts/check-factory-integrity.mjs --approve PD-49 --by "Oleksandr Prokopenko" --quote "approve the recommended" --files scripts/check-traceability.mjs,scripts/check-trajectory.mjs,scripts/check-visual-fidelity.mjs
   ```

   Until then `check-factory-integrity` is FAIL and so are G4, G6 and G7.
2. **Repeat the full e2e run** on the main checkout, with nothing else using the stack: `npm run test:e2e` (about 19 minutes). Then
   `node scripts/check-acceptance-methods.mjs --mode=artifact`, `node scripts/ledger-report.mjs`, `node scripts/check-process-ratchet.mjs --update`.
3. **the photographer runs the demo script and MT-40** ([demo-script.md](demo-script.md), [manual-test-plan.md](manual-test-plan.md)): the evidence for NFR-31.
4. **Probe `/sessions` live** after the 18:11 fix (`node scripts/check-deploy.mjs`, about 3 minutes). If it passes, close the `/sessions` part of the NFR-18 waiver.
5. **Sign G7** only when it is PASS. It is not yet.

## 8. Scope NOT delivered

- `docs/technical/` (architecture, data model, operations pages) and a customer delivery report with an effort log.
- A per-case result of the manual test plan, and the photographer's run of the demo script.
- A new recording for NFR-31, and a split of the clip with the mid-clip resize.
- The refresh of `docs/qa/deploy-verification.json` (no live probe in this pass).
- A full e2e rerun, lint, typecheck, build and `PhotoQualityIT` on the private photos in this pass.
- The reseal of `factory-lock.json` for PD-49, and the owner's approval of PD-49.

## 9. Raw output

Run in this tree at 2026-10-01T18:39:00+03:00 (Europe/Kyiv). Each block names its command and exit code.

`node scripts/gate-status.mjs` (exit code 1):

```
Gate status (three-valued deterministic checks — judgment criteria sit on top, verify those by hand):

  G0  PASS           scaffold + loop installed
  G1  PASS           requirements signed off
  G2  PASS           baseline specs  [openspec validate --all --strict · traceability]
  G3  PASS           capability plan + acceptance methods exist  [acceptance-methods --mode=existence]
  G4  FAIL           per-slice  [openspec validate --all --strict · traceability · trajectory · acceptance-methods --mode=artifact · process-ratchet · factory-integrity]
  G5  PASS           hardening (coverage)  [coverage-ratchet]
  G6  FAIL           QA proof  [recordings · eval-ratchet · acceptance-methods --mode=artifact · visual-fidelity · process-ratchet · factory-integrity]
  G7  FAIL           release  [traceability --release --strict-tests --strict-recordings · trajectory --release --check-fresh · recordings · acceptance-methods --mode=artifact · factory-integrity]
  G8  PASS           UAT (trace regressions)  [traceability]

Deterministic checks (ladder rung from RULES-CHANGELOG.md; unlisted = experimental):
  traceability         PASS           [experimental]
  trajectory           PASS           [experimental]  Scope: 51
  recordings           PASS           [experimental]  Scope: 79
  coverage             PASS           [experimental]  Scope: 4
  evals                PASS           [experimental]  Scope: 50
  acceptanceExistence  PASS           [experimental]  Scope: 192
  acceptanceArtifact   FAIL           [experimental]  Scope: 192
  visual               PASS           [experimental]  Scope: 1
  processRatchet       PASS           [experimental]  Scope: 4
  integrity            FAIL           [experimental]  Scope: 37
  openspecValidate     PASS           [experimental]
  traceabilityRelease  PASS           [experimental]
  trajectoryRelease    PASS           [experimental]  Scope: 51

(Reviews, sign-offs, and vision-verify are judgment gates — confirm them in docs/qa + the gate checklist.)

Scope: 9 gate(s)
Result: FAIL
```

`node scripts/correct.mjs --check` (exit code 0):

```
Scope: 17 correction signal(s)
Result: PASS
```

`node scripts/check-factory-integrity.mjs` (exit code 1); the three FAIL lines are the files PD-49 changed, which wait for the owner's `--approve`:

```

Scope: 37 locked file(s)
Result: FAIL, 3 warning(s)
WARN  [quality/coverage-baseline.json] quality-tier drift (hash drift) vs factory-lock.json — a ratchet baseline/config changed since the lock. Legitimate if a tighten-only --update wrote it (reseal at the next --init-lock); a hand-edit or deletion that lowers the floor is laundering. Recorded as a ledger event.
WARN  [quality/process-baseline.json] quality-tier drift (hash drift) vs factory-lock.json — a ratchet baseline/config changed since the lock. Legitimate if a tighten-only --update wrote it (reseal at the next --init-lock); a hand-edit or deletion that lowers the floor is laundering. Recorded as a ledger event.
WARN  [hooks] gap: core.hooksPath is "<local path>" — .githooks/ exists but git will never run it; run `git config core.hooksPath .githooks`.
FAIL  [scripts/check-traceability.mjs] gate-bearing file drift (hash drift) vs factory-lock.json without both a commit after the lock commit whose message contains "Refs: PD-<n>" and an owner approval in docs/qa/approvals/ that names this content. Gate scripts may only change through an approved improvement (executed red-to-green proof + human approval). Restore the locked file, or have the owner run --approve and land the "Refs: PD-<n>" commit.
FAIL  [scripts/check-trajectory.mjs] gate-bearing file drift (hash drift) vs factory-lock.json without both a commit after the lock commit whose message contains "Refs: PD-<n>" and an owner approval in docs/qa/approvals/ that names this content. Gate scripts may only change through an approved improvement (executed red-to-green proof + human approval). Restore the locked file, or have the owner run --approve and land the "Refs: PD-<n>" commit.
FAIL  [scripts/check-visual-fidelity.mjs] gate-bearing file drift (hash drift) vs factory-lock.json without both a commit after the lock commit whose message contains "Refs: PD-<n>" and an owner approval in docs/qa/approvals/ that names this content. Gate scripts may only change through an approved improvement (executed red-to-green proof + human approval). Restore the locked file, or have the owner run --approve and land the "Refs: PD-<n>" commit.
```

`node scripts/check-traceability.mjs --check-fresh` (exit code 0) and `node scripts/check-trajectory.mjs --check-fresh` (exit code 0), the result lines (the waived warnings before them are listed in `traceability-report.md` and `trajectory-report.md`):

```
traceability: 155 MVP FRs checked — 0 failure(s), 105 warning(s)
Scope: 51 archived slice(s)
Result: PASS, 133 warning(s)
```

`npx openspec validate --all --strict` (exit code 0), the totals line (the rest is INFO lines about long requirement text):

```
Totals: 8 passed, 0 failed (8 items)
```


## 10. Final gate run (2026-10-01, after the owner's PD-49 approval and a full e2e run)

The full e2e suite ran in three engines on main: 960 passed, 4 skipped (Chromium-only), 0 failed, 17.6 min (`docs/qa/e2e-report.json`, started 2026-10-01T15:42:20Z). `check-acceptance-methods --mode=artifact`: 235 contracts across 192 requirements, 0 failures. `check-process-ratchet --update` tightened the floor to 100% acceptance coverage, 0 vacuous passes. Raw `node scripts/gate-status.mjs`:

```
Gate status (three-valued deterministic checks — judgment criteria sit on top, verify those by hand):

  G0  PASS           scaffold + loop installed
  G1  PASS           requirements signed off
  G2  PASS           baseline specs  [openspec validate --all --strict · traceability]
  G3  PASS           capability plan + acceptance methods exist  [acceptance-methods --mode=existence]
  G4  PASS           per-slice  [openspec validate --all --strict · traceability · trajectory · acceptance-methods --mode=artifact · process-ratchet · factory-integrity]
  G5  PASS           hardening (coverage)  [coverage-ratchet]
  G6  PASS           QA proof  [recordings · eval-ratchet · acceptance-methods --mode=artifact · visual-fidelity · process-ratchet · factory-integrity]
  G7  PASS           release  [traceability --release --strict-tests --strict-recordings · trajectory --release --check-fresh · recordings · acceptance-methods --mode=artifact · factory-integrity]
  G8  PASS           UAT (trace regressions)  [traceability]

Deterministic checks (ladder rung from RULES-CHANGELOG.md; unlisted = experimental):
  traceability         PASS           [experimental]
  trajectory           PASS           [experimental]  Scope: 51
  recordings           PASS           [experimental]  Scope: 79
  coverage             PASS           [experimental]  Scope: 4
  evals                PASS           [experimental]  Scope: 50
  acceptanceExistence  PASS           [experimental]  Scope: 192
  acceptanceArtifact   PASS           [experimental]  Scope: 192
  visual               PASS           [experimental]  Scope: 1
  processRatchet       PASS           [experimental]  Scope: 4
  integrity            PASS           [experimental]  Scope: 37
  openspecValidate     PASS           [experimental]
  traceabilityRelease  PASS           [experimental]
  trajectoryRelease    PASS           [experimental]  Scope: 51

(Reviews, sign-offs, and vision-verify are judgment gates — confirm them in docs/qa + the gate checklist.)

Scope: 9 gate(s)
Result: PASS
```
