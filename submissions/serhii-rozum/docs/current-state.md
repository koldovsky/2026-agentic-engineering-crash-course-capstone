# Current state — agent handoff

> **Read this file at the start of every agent session.**  
> **Update it at the end of a session or when stopping mid-task.**

Last updated: 2026-10-03 PM EEST (capstone PR opened)

## G6 QA proof — first real run, NOT-EARNED (2026-10-03 PM)

Mechanisms now exist and produced real artifacts; the verdicts are red, honestly:

| Check | Result | Evidence |
| --- | --- | --- |
| recordings | 8 clips, 7 asserted; 02b FAIL (preview overflows at 360px, FR-SHELL-02) | `docs/qa/demo-recordings/manifest.json` |
| vision-verify | **0/8 met** | `docs/qa/vision-report.md` |
| eval-suite | **3/10 pass** (error-clarity 68.3 · empty-state 50 · copy-uk 22 · document 39.5) | `docs/qa/eval-report.md`; no baseline minted |
| a11y (axe, light=dark) | FAIL — contrast on 5/6 routes (brand red `#f53b38` + white = 3.61:1; badges 3.35–4.1) | `docs/qa/a11y-report.json` |
| new @trace tests | FR-SHELL-03, NFR-SEC-01, NFR-OBS-01 (246 tests green) | `npx vitest run` |

Merged: agent B (`be13b24`, `e587138`), agent A (`497f07d` a11y form-error
association fix, `5c8d372` harness); results `cd18b9b`, `407f2ee`.

### Findings needing a human decision
- **Rubric vs template conflict:** both document-render evals fail on a
  CRITICAL "every label bilingual" criterion, but `docs/invoice-template.html`
  itself has English-only `Beneficiary:` / `SWIFT code:` / `TERMS AND
  CONDITIONS` (marked FIXED). Either the rubric over-reaches or BC-I18N-01
  needs template work — not resolved by editing the rubric unilaterally.
- **Brand red fails AA** for white text — design-token decision.
- **NFR-I18N-01** genuine gap (nav/headings English); **NFR-DX-01** better as a CI artifact.
- **Gate defect (for process-auditor):** `check-acceptance-methods` recording
  mode is method-level — any manifest makes FR-EXPORT-04/05, FR-CLIENT-04
  (proposed, unimplemented) render non-FAIL. Unearned.
- Two mod-97-valid IBANs in test fixtures (`UA2132…6001`, `UA9032…6020`) — confirm not real accounts.
- Parallel worktrees exist: `qa/g6-recordings` (locked), `feat/add-invoice-edit`, `chore/evals-trace-housekeeping` — possible overlap with this G6 work.

### Next
Fix cycle: preview scale-to-fit; harness (`fill`, prod build w/o dev badge,
per-step stills); Ukrainian copy (client dialog errors, page headings,
`/invoices` empty state, "manual" label) → re-produce → re-run
`vision-verify` + `eval-suite` → mint `quality/eval-baseline.json` only when cases pass.
Agent worktrees `agent-ae4f…`, `agent-abb6…` merged but not removed (sandbox).

## S6 invoice-edit — ARCHIVED, second EARNED slice (2026-10-03, session 4e)

`2026-10-03-add-invoice-edit` is archived and merged to main (`20ab728`,
capability-map `invoice-edit: shipped`). Evidence: `check-trajectory --release`
"12 archived (10 RETROFITTED, 2 earned)"; review-gate round 2 **clean-minor**
(`openspec/changes/archive/2026-10-03-add-invoice-edit/review-findings.json`;
round-2 minors fixed after review, no re-review — stated in tasks.md 5.1).
Battery on merged main: typecheck 0 · lint 0 errors · Vitest 335 + toolchain 3
passed · traceability 0 failures.

Ticket-16 model as shipped: drafts edited at `/invoices/[id]/edit` by record
id; `sent`/`paid`/`cancelled` read-only (register throws
`InvoiceImmutableError`); correction = cancel original + duplicate into an
unnumbered draft, number minted at issue; `cancelled` terminal. User decisions
2026-10-03: **Q1** paid invoices are not correctable (duplicate only); **Q4**
`paid → sent` stays allowed.

Same session also merged Track C (`9a3140e`): registry archive tasks 5.2/5.3
ticked (traceability FAIL cleared → G2/G8 PASS), `invoice-registry: shipped`,
NFR-DX-01 test (`src/__tests__/toolchain.test.ts` — runs lint/typecheck/build;
needs network + port, so it fails inside the sandbox), process-ratchet baseline
minted. Track B (`qa/g6-recordings`) was superseded by the G6 run above and NOT
merged.

### Follow-ups from S6 (not done)
- **FR-CALC-01 acceptance FAIL is a real product gap**: the spec says
  per-supplier counter; the register mints from one store-wide counter. Either
  implement per-supplier numbering (then add an anchored `@trace FR-CALC-01`
  register test) or amend the spec. Do not trace `numbering.test.ts`.
- No UI creates drafts yet (`/invoices/new` has no "save draft"; `/invoices`
  list is a stub) — edit route reachable by URL only (design Q2).
- Known limitations in the archived `design.md`: create path still accepts
  `sent`/`paid` with a caller-supplied number; cross-tab overwrite;
  `deleteInvoice` can free an issued number.
- FR-EDIT-01/02 recording clips — the G6 session offered to add them.

## G5 coverage mechanism — EARNED (2026-10-03)

`gate-status` deterministic row: **G5 PASS** (`coverage PASS, Scope: 4`).
Installed `@vitest/coverage-v8@4.1.10` (version-matched to vitest), wired
`test:coverage` (`vitest run --coverage`) with `json-summary` reporter in
`vitest.config.ts`, minted `quality/coverage-baseline.json` via
`check-coverage-ratchet --update`.

Baseline (the floor is today's honest reality — UI components are 0%, domain
libs 82–100%): `lines 58.95 · statements 58.78 · functions 47.42 · branches
55.05`. The ratchet is tighten-only from here; a coverage drop fails CI.

G5 checklist judgment items, stack-driven N/A for this browser-first MVP:
auth/RBAC e2e and DB seed helper (no auth, no DB — same reason CI omits them).
Cross-slice flow covered at unit level by `form-to-render.test.ts` +
`invoice-calc/__tests__/smoke.test.ts`. Browser e2e belongs to G6 (recordings).

### Deferred follow-ups from G5 (require the improvement protocol)
- **ci.yml coverage step** — the G0 note says "re-add each step in the commit
  that lands its mechanism", but `ci.yml` is gate-bearing in `factory-lock.json`:
  adding the step without a `Refs: PD-x` commit reds `check-integrity`. Needs
  an `improve-PD-x` proposal (human-approved) that adds
  `npm run test:coverage && node scripts/check-coverage-ratchet.mjs` to CI and
  reseals the lock (the reseal also absorbs `quality/coverage-baseline.json`,
  which today renders a WARN "not in lock").
- **PD-11** still open (lock over-captures non-gate workflows).

### Next
- **G6** — recordings (`@playwright/test` browser binaries) + `vision-verify` +
  eval suite + baselines. Largest remaining red: 4 NOT-EARNED battery members.
- **S6** — `export-share` pdf (blocked by wayfinder ticket 05, Type-3 glyphs)
  and `invoice-edit` (consumes the registry's update-by-id/delete primitives).
- Open low-priority defects: PD-11, PD-13.

## S5 invoice-registry — ARCHIVED, first EARNED slice (2026-07-11)

`2026-07-11-add-invoice-registry` is archived. It is the **first slice with
earned evidence** — full G4 loop: tests-first red→green (240 tests), real
`review-gate` output (`generatedBy: review-gate`), `Slice:`/`Refs:` trailers on
commits touching `src/lib`. `check-trajectory --release` now **PASSES**:
"11 archived (10 RETROFITTED, 1 earned)". `trajectoryRelease` left NOT-EARNED.

The slice took **8 review rounds** (~15M tokens). Rounds 1–2 caught 3 real major
bugs in the storage code + my own false "traceability green" tick; later rounds
only surfaced minor/doc items and the review-gate's own tooling nits. That cost
drove five review-gate improvements:

| PD | Fix |
| --- | --- |
| PD-14 | agent-type names (bare → `project-factory:`); broke the first review |
| PD-15 | dependency audit scoped to slice-changed deps (not whole tree) |
| PD-16 | positive `Clean —`/`Verified —`/`Coverage` notes excluded from the defect count (separator-guarded so real defects are kept) |
| PD-17 | reviewers ignore the gate's own `review-findings.json` artifact |
| PD-18 | **severity-aware archive bar**: a review with only MINOR confirmed findings is earned (`clean-minor`); major/critical still blocks. "Zero confirmed" was unreachable for a thorough asymptotic review |

**Lesson for future slices (budget):** do not chase `clean:true` through endless
rounds. One review; fix majors; document/fix minors; PD-18 earns it. The
`args.thorough` flag exists for the rare slice that needs both verifier lenses.

### Next (new session — paused here to conserve budget)
Superseded 2026-10-03 — G5 done (see top section); next is G6 / S6.

## Snapshot

| Field | Value |
| --- | --- |
| **Branch** | `main` — gate chain made honest; G3 acceptance contract declared |
| **Active capability** | Gate hardening done; **next: S5 `invoice-registry` (first EARNED slice)** |
| **Active OpenSpec changes** | none |
| **Slice / gate** | G0–G3 green/earned · S5 slice earned · **G5 PASS** (coverage) · G6+ NOT-EARNED |
| **Gate check** | `node scripts/gate-status.mjs` — Result FAIL (honest: retrofit + no artifacts) |

## Session summary — gate honesty + G3 (2026-07-10 PM)

Project Factory installed (G0). A parallel session had laundered the trajectory
gate; a fresh `process-auditor` confirmed it. Six process fixes landed, each
with an EXECUTED red→green proof and a `Refs: PD-x` trailer:

| Commit | Fix |
| --- | --- |
| `3d5efd1` | PD-3/4/5 — retrofit slices render RETROFITTED, not PASS; 10 forged `review-findings.json` deleted (one contradicted its own review doc) |
| `ce7d62d` | PD-9 — `@trace` regex now matches categorized ids |
| `f829e01` | PD-7 — CI runs `gate-status` + the red→green proofs |
| `988ce25` | PD-12 — `@trace` anchored to comment start (a disclaimer had become evidence) |
| `2bc736c` | PD-1 — both checkers treat `dropped` as non-MVP |
| `13518f0` | 20 MVP FRs annotated; **5 of 24 claims refuted** by fresh agents; 14 gaps in `docs/qa/trace-gaps.md` |
| `1ff3b28` | FR-CLIENT-01..04 numbered (capability was outside the trace chain); improvements moved to `retro/improvements/` (PD-13) |
| `069793c` | G3: 43 acceptance-method tags; `@playwright/test` installed; deploy-gated PERF waived |
| `5cb2967` | waiver recorded as correction COR-1 (OPEN) |

**Traceability:** 23/38 MVP FRs honestly traced. `docs/qa/trace-gaps.md` lists
the 14 gaps (4 not-implemented, 2 dropped, 8 needing recording/e2e).

### Evidence contract hardened before S5 (2026-07-10, second session)
Both forgeable trajectory-gate predicates are now closed, so the FIRST earned
slice (S5) inherits an honest contract:
- **PD-10 fixed** (`df5d135`) — a `Slice:` trailer counts only if the commit
  carries a real trailer AND touched `src|app|lib|db|components|tests/`. The
  docs-only forgery is dead. red→green 1/2→2/2.
- **PD-8 fixed** (`1aad54e`) — a `clean:true` review stamp is trusted only from
  a real review-gate output (`generatedBy:"review-gate"` + populated
  `dimensions`). A hand-written stamp is `unverified-stamp`, fails `--release`.
  red→green 3/6→6/6.
- **COR-1 dispositioned** `waived` (`5cb2967`) — deploy-gated PERF, pending live
  measurement. `correct.mjs --check` PASS.

Six gate self-tests now run in CI (`check-{trajectory-retrofit, review-evidence,
slice-trailer, traceability-trace-ids, traceability-anchor, dropped-status}`).

### Still true for the human
- **CI on `main` is RED and that is correct** — `check-trajectory --release`
  exits 1 because all 10 archived slices are RETROFITTED, none earned red-first.
  It goes green when S5 is earned, or via a waiver. Do NOT drop `--release`.

### Open, unfixed process defects (not approved to fix)
- **PD-11** — `factory-lock` over-captures non-gate workflows (`sync-homework-pr.yml`);
  a comment-only edit reads as tampering and pressures a reseal.
- **PD-13** — the upstream factory template puts improvements in `openspec/changes/`,
  which breaks `openspec validate --all --strict`. Worked around: improvements
  live in `retro/improvements/`.

## Capability backlog

Source: `openspec/capability-map.yaml` · order: [capability.md](capability.md)

| Slice | Capability | Owner | Status | Notes |
| --- | --- | --- | --- | --- |
| S0 | `shell` | ui | **shipped** | PR #3 |
| S1 | `nace-catalog`, `invoice-calc` | domain | **shipped** | archived 2026-07-10 |
| S2 | `supplier-profile` | ui | **shipped** | PR #5; archived |
| S2 | `client-directory` | ui | **shipped** | PR #4; archived |
| S2 | `banking` | domain | **shipped** | PR #7; archived 2026-07-10 |
| S3 | `document-render` | domain | **shipped** | archived 2026-07-10 |
| S4 | `form-input` | ui | **shipped** | M4 demo — `/invoices/new` live preview; archived 2026-07-10 |
| S4b | `export-share` preview | ui | **shipped** | HTML download + print on `/invoices/new`; 2026-07-10 |

## Completed recently

| Date | Commit / work | Outcome |
| --- | --- | --- |
| 2026-07-10 | `/opsx:apply add-export-share-preview` | HTML download + print; 219 tests; preview gate shipped |
| 2026-07-10 | `/opsx:propose add-export-share-preview` | OpenSpec artifacts for S4b preview gate |
| 2026-07-10 | Loop close-out `add-form-input` | Gates green; archived `2026-07-10-add-form-input`; [loop log](qa/loop-add-form-input.md) |
| 2026-07-10 | `/opsx:apply add-form-input` | Form + Zod + live preview; 211 tests; specs synced |
| 2026-07-10 | `/opsx:propose add-form-input` | OpenSpec artifacts created |

## Stopped at

S4b `export-share` preview archived (`2026-07-10-add-export-share-preview`).
Manual QA passed: HTML download, browser print/PDF, live preview.

**Next:** choose S5 `invoice-registry` (persist invoices) or S6 `export-share` pdf
(server PDF — wayfinder 05 for Type 3 glyphs).

## Blockers & open decisions

| Ticket | Topic | Blocks capability |
| --- | --- | --- |
| 05 | PDF fidelity — Chromium embeds glyphs as `Type 3` | export-share pdf |
| 16 | Edit after send (immutability) | invoice-edit |
| 11 | Design system reconciliation | form-input polish |
| PD-1 | `check-traceability.mjs` has no concept of `dropped` status: it counts `FR-NACE-06` + `FR-INPUT-03` among the 34 MVP FRs and demands tests/recordings for two deliberately dropped **negative** requirements | 69 of the 69 warnings; arming the git hooks |
| PD-2 | 10 archived slices carry no review evidence. **Documented, not resolved** — `.project-factory/retrofit.json` declares them RETROFITTED; retrofit records an absence, it does not supply the missing review | `check-trajectory --release` renders `NOT-EARNED` until a slice is earned red-first |
| PD-3 | `check-trajectory` was blind to retrofit and read 10 back-stamped `clean:true` files as real review evidence | **Fixed** — `improve-PD-3`, forged stamps deleted |
| PD-4 | the `add-form-input` stamp claimed `confirmed:0/clean:true` while its real review (`docs/qa/loop-add-form-input.md:39`) recorded PASS WITH NOTES + C1–C7 | **Fixed** — stamp deleted with `improve-PD-3` |
| PD-5 | retrofit doctrine sanctions `retrofit.json` only; the 10 `review-findings.json` were beyond mandate | **Fixed** — deleted with `improve-PD-3` |
| PD-7 | `gate-status.mjs` — the only aggregator carrying the RETROFIT banner and NOT-EARNED semantics — is absent from CI | CI can render green while `gate-status` is red |
| PD-8 | `check-trajectory` accepts any `{clean:true}` as review proof; ignores `confirmed`, `baseRef`, `dimensions` | future slices can be stamped, not reviewed |
| PD-9 | `check-traceability.mjs:148` parses `@trace` with `[A-Z]+-\d+`, which can never match categorized ids like `FR-CALC-01` that line 158 demands | 34 unclearable warnings; `--strict-tests` unsatisfiable |
| PD-10 | one docs commit (`5bcbfe9`) carries 10 `Slice:` trailers; `check-trajectory` greps the whole message and never checks the commit touched the slice's files | trailer evidence forgeable |

## Next up (priority order)

1. **Choose next slice:** S5 `invoice-registry` **or** S6 `export-share` pdf (`/opsx:propose add-invoice-registry` / `add-export-share-pdf`)
2. Wayfinder 05: `Type 3` glyph embedding (blocks pdf fidelity)
3. **Adversarial review** — form-input (separate checker chat; `docs/qa/loop-add-form-input.md`)
4. Land `improve-PD-9` (`@trace` regex) and `improve-PD-7` (`gate-status` in CI) — approved, same red→green + `Refs: PD-x` protocol as `improve-PD-3`
5. Tag MVP requirements with acceptance-method verification tags — `check-acceptance-methods --mode=existence` is red at `Scope: 0`, which gates G3
6. Arm hooks when ready: `git config core.hooksPath .githooks`
7. Triage PD-8 and PD-10 (forgeable review/trailer predicates) before the first *earned* slice archives, or S5 inherits the same weak evidence contract

## Repository sync

| Remote | Branch | Role |
| --- | --- | --- |
| `origin` | `main` | Primary |
| `origin` | `fwdays-submission` | Mentor PR #50 |
| `upstream` | `main` | Course template |

## Session log

| Date (UTC) | Session | Action | Outcome |
| --- | --- | --- | --- |
| 2026-10-03 | Factory 4e | Tracks A+C: S6 add-invoice-edit archived (earned) + housekeeping merged | main `20ab728`; trajectory --release 2 earned; acceptanceArtifact 17→1 FAIL (FR-CALC-01, real gap) |
| 2026-10-03 | Capstone | Public capstone PR #17, branch `serhii-rozum` | Evidence subset only (rules, specs, QA logs, factory agents). Product source and this repo URL are not in the PR. |
| 2026-10-03 | G6 fix agent | Product defects from G6 run (preview scale-to-fit, AA tokens, UA copy, /invoices empty state, nav/link semantics, supplier guidance) | axe 6 routes × 2 schemes clean (`docs/qa/a11y-report.json`, status passed); 287 Vitest tests; NFR-I18N-01 trace test added. Recordings/vision/evals NOT re-run; `scripts/record-demos.mjs` still targets old English nav labels / "Open navigation" and must be updated before re-recording |
| 2026-10-03 | Factory | G5 coverage mechanism | `@vitest/coverage-v8` + `test:coverage`; baseline minted (58.95 lines); `gate-status` G5 PASS; ci.yml step deferred to improve-PD-x |
| 2026-07-10 | Factory | `/project-factory:init` (G0) | Loop installed (`--tools=claude`); `factory-lock.json` = 25 files + 8 adaptations; git hooks copied but **dormant** (`core.hooksPath` unset) |
| 2026-07-10 | Archive | `add-export-share-preview` | → `2026-07-10-add-export-share-preview`; 220 tests |
| 2026-07-10 | SDD | `/opsx:apply add-export-share-preview` | S4b preview gate; print fix (preview iframe) |
| 2026-07-10 | OpenSpec | `/opsx:propose add-export-share-preview` | proposal, design, specs delta, tasks |
| 2026-07-10 | Loop | Close-out `add-form-input` | 4 ticks; archive; loop log |
| 2026-07-10 | SDD loop | `/opsx:apply add-form-input` | S4 form-input shipped; 211 Vitest tests |
| 2026-07-10 | OpenSpec | `/opsx:propose add-form-input` | proposal, design, specs delta, tasks |
