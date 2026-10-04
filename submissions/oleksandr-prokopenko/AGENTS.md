# example-app — Agent Rules

# This may NOT be the Next.js / Spring Boot you know

The installed versions (Next.js 16.3.6, Spring Boot 4.1.1, Java 25) may differ from training data.
Read the relevant guide in `frontend/node_modules/next/dist/docs/` before writing frontend code,
and the Spring Boot 4.1 reference before writing backend code. Heed deprecation notices.

Use `docs/requirements.md` to understand the requirements for the project.

## Project Factory (works in any tool)

This project is delivered with **Project Factory**, a spec-driven multi-agent
framework that runs under any AI coding tool:

- **Claude Code:** the `project-factory` skill vendored in `.claude/skills/project-factory/`
  (no plugin; installed into this repo only).
- **Cursor:** the `project-factory` plugin / `.cursor/rules/` — same commands.
- **GitHub Copilot:** `.github/copilot-instructions.md` + the
  `/project-factory-init` / `-onboard` prompts.
- **Codex / others:** this `AGENTS.md` (read natively) + `.codex/prompts/`.

The deterministic loop — `scripts/check-*` (traceability, coverage, eval,
trajectory), git hooks, CI, OpenSpec specs, and the gates — is **identical in
every tool** (pure Node + git). Only orchestration differs: Claude Code fans out
subagents in parallel; elsewhere run review / eval / spec passes sequentially
with fresh context (maker ≠ checker). See `docs/portability.md`.

## Project Handoff Protocol

Before planning or implementing any substantive change, read:

1. `docs/current-state.md` for the latest persistent handoff and next-step guidance.
2. `docs/mvp-capability-plan.md` for the change sequence and capability scope.
3. `openspec/project.md` and the relevant files under `openspec/specs/`.
4. `docs/adr/` for accepted architecture decisions.

Keep `docs/current-state.md` current when a meaningful milestone happens:
an OpenSpec change is created/implemented/validated/archived; a capability
moves from planned to implemented; setup or validation expectations change;
an ADR is accepted. Write last update date/time (timezone: Europe/Kyiv) and
the current phase. `docs/current-state.md` is a handoff aid, not the source
of truth — if it conflicts with code/specs/tests, verify and update it.

## Context architecture (static vs dynamic)

This file is **static context** — paid for on every agent turn — so keep it to
durable cross-cutting rules. Per-domain detail, procedures, and large references
are **dynamic**: loaded on demand from the code, the spec, an on-demand skill, or
the framework's bundled docs. See `docs/context-architecture.md` for the split,
the token budget, and what to demote when this file grows past it.

## Module conventions

- Backend: layer packages under `backend/src/main/java/com/example/app/`: `controller/`, `service/`,
  `repository/` (Spring Data JPA), `model/entity/` (JPA entities), `model/dto/` (records), `model/enums/`,
  `config/`, `exception/` (one `@RestControllerAdvice`), `image/` (the vips adapter), `seed/`. Persistence is
  JPA entities + Spring Data repositories; Flyway owns the schema (`ddl-auto=validate`). Tests mirror the
  packages; unit tests `*Test.java`, DB tests `*IT.java`.
- Settings: untracked `deploy/.env` (local) and `deploy/.env.prod` (the server's copy, sent with
  `deploy/scripts/push-env.sh`); no secret defaults in `compose.yml` or `application.properties`.
- Schema: Flyway migrations in `backend/src/main/resources/db/migration`; never edit an applied one.
- Frontend: `frontend/src/app/` pages are thin server components that call the backend REST API
  through `frontend/src/lib/`; client components only when needed; colocated `*.test.ts`.
- ONE admin shell + ONE navigation source for the admin page.

## Correctness rules (learned from production bugs)

- No user input may produce a generic 500: Spring validates and returns field
  errors; the frontend shows them inline. Translate FK/unique violations to human
  messages; hide driver internals.
- Numeric parsers accept trailing zeros and decimal commas.
- Uncontrolled filter/edit forms are keyed by the server state they display.
- Status/state selects offer only reachable transitions; server re-validates.
- External calls (email, exports, APIs) never fail silently: surface to the
  user or log with cause; degrade honestly (e.g. show fallback link).
- Seed/test helpers re-pin baseline state; day-bound test assertions use
  LOCAL calendar dates.
- Validate the RENDERED result for UI, not just code/DOM: gate with axe
  (`check-a11y`, light+dark) AND a vision pass (`vision-verify` — a fresh agent
  looks at the settled still); recordings must assert the FRs they show.

## Test-first (per slice)

Write the slice's unit tests + DB smoke flow from the spec FIRST and confirm they
FAIL (red); then implement to green. Never weaken a test to pass it — if a test
contradicts the spec, change it deliberately, not silently.

## Validation cadence

Run before and after substantial changes:

```bash
npm run lint
npm run test:run
npm run test:integration   # once the layer exists
npm run test:e2e           # once the layer exists
npm run build
npx openspec validate --all --strict
node scripts/check-eval-ratchet.mjs   # once evals exist — graded-quality bar
```

Do not archive OpenSpec changes before implementation AND a real-DB smoke
test pass. Keep `.env` private; never commit or print it.

## Process honesty (non-negotiable)

- Absence of evidence is NEVER success. A gate whose evidence is missing while
  product code exists is **NOT-EARNED**, not PASS — and qa-verify will not
  print "Overall result: Pass" over a NOT-EARNED constituent.
- Never stub a battery script (`echo … not yet configured` + exit 0 launders
  a red into a green). A missing capability must FAIL with instructions for
  installing it.
- Every "done"/"verified" claim carries an evidence path (report, diff
  artifact, recording) — in `docs/current-state.md` Claims and in handoffs.
  Unbacked claims are treated as false.
- When a human contradicts a claimed result ("this is not pixel perfect!"),
  record it as a correction: `npm run correct -- "<utterance>"`. Open
  corrections render red at every gate until dispositioned.

## Lean mode (owner, 2026-09-30: "shrink the amount of checks to move faster")

Speed over ceremony. The deterministic gates (CI, pre-push, the deploy stamp, commit hooks) stay; the heavy
optional passes shrink:

- Review: ONE review per slice by a single `code-reviewer` agent (plus `security-reviewer` for auth or upload
  slices), not the multi-round review-gate workflow. Fix critical and major findings; list minors in tasks.md.
- During a slice: run only the tests the change touches, e2e in Chromium only. At the slice end, once: the full
  e2e in three engines and the database tests without `PhotoQualityIT` (run it only when image code changed).
- Vision-verify only the new or changed stills; evals only when error texts change; no separate spec critique;
  no manual smoke test where the e2e covers the same steps; a process retro only when the owner asks.
- Never start a check that takes more than a few minutes on the deploy path; say how long a check will take
  before starting it when the owner is waiting.

## Evals (graded quality, not just correctness)

Tests assert exact results; evals grade *quality* a unit test can't — error
clarity, empty-state usability, copy tone — scored 0-100 against a rubric.

- Cases live in `evals/cases/*.eval.ts` (scenario + `produce()` + rubric +
  `@trace` ids). Group cases by `dimension`; the ratchet guards each dimension.
- The `eval-suite` workflow grades them with a fresh `eval-judge` agent
  (maker≠checker), writing `docs/qa/eval-report.md` + `evals/results/*.json`.
- `node scripts/check-eval-ratchet.mjs` guards the committed score in CI (no
  API key). Quality may ratchet up, never silently drop. Wire `check:eval`.
- **Recordings are kept** — they *illustrate* a case for humans; the eval is
  the *bar* that decides pass/fail. See `evals/README.md`.

## Environment notes

- macOS + zsh locally; the default JDK is 23, so run Maven through `sh scripts/mvnw.sh` (selects JDK 25).
- Database: Postgres 18 in `deploy/compose.yml`; on the Mac it listens on `127.0.0.1:5433` (user `app`, database
  `app`, password from `deploy/.env`), on the server it publishes no port. DB tests use Testcontainers.
- External services (Google sign-in, Telegram, OpenAI, R2) are stubbed locally; their tests are disabled by default.

<!-- BEGIN-FACTORY-LESSONS -->
<!--
  Managed region: `project-factory:init` / `:onboard` upsert cross-project
  lesson blocks here, each wrapped in its own BEGIN-LESSON:<id> /
  END-LESSON:<id> markers. Manual edits INSIDE a lesson block are preserved
  per-block on upsert; blocks are only replaced when the lesson itself is
  updated upstream. Do not remove the outer FACTORY-LESSONS markers —
  without them, upserts re-append lessons at the end of the file.
-->
<!-- BEGIN-LESSON-vacuous-pass-not-earned -->
### Lesson: a PASS over zero evidence is NOT-EARNED (vacuous-pass-not-earned, v1)

- Never report a gate or check as PASS when its evidence scope is 0 ("Scope: 0
  clip(s)", empty archive, no eval results) while product code exists under
  `app/`, `src/`, `lib/`, `server/`, or `packages/`. Render it **NOT-EARNED**
  and exit non-zero.
- Before product code exists, an empty scope is **SKIP-pending**: print it
  explicitly; it is visible and never counted as PASS.
- Never fold SKIP / 0-scope results into an overall "Pass" summary
  (`qa-verify`, `gate-status`). Field evidence: `worst()` folded SKIP into
  PASS and G4–G8 rendered green over literally nothing
  (2026-07-02-pixel-perfect-forensics.md, RC2).
<!-- END-LESSON-vacuous-pass-not-earned -->
<!-- BEGIN-LESSON-declared-method-needs-mechanism -->
### Lesson: a declared acceptance method needs an executable mechanism (declared-method-needs-mechanism, v1)

- Every FR/NFR that declares a verification method (pixel-diff, e2e,
  recording, a11y, eval, ...) must resolve to a real, executable, non-stub
  mechanism BEFORE the build phase starts: an installed check script, or a
  package.json script whose body does not match
  `/^echo |^true$|not yet configured/i`.
- A spec file that restates the requirement is NOT a mechanism. Field
  evidence: NFR-19 encoded "≥ 99% pixel match" while no pixel-diff tool
  existed anywhere and `test:e2e` was an echo stub exiting 0
  (2026-07-02-pixel-perfect-forensics.md, RC1).
- If a declared method has no mechanism, do not proceed: implement the check,
  or record an explicit human waiver — never let the declaration float
  unverifiable into the build.
<!-- END-LESSON-declared-method-needs-mechanism -->
<!-- BEGIN-LESSON-done-claims-need-evidence -->
### Lesson: done-claims need evidence pointers (done-claims-need-evidence, v1)

- Never write strong completion language ("Convergence reached", "all gates
  pass", "verification-only", "Overall result: Pass", "ready for release /
  sign-off", "done", "complete") into current-state.md, PR bodies, or handoff
  docs unless the same line carries a resolvable evidence pointer — a path
  that exists on disk (e.g. `docs/qa/automated-verification-latest.md`) and
  is fresh — or an explicit "Scope NOT delivered" section.
- The verdict belongs to exit-coded checks, not narrative. Field evidence:
  "Convergence reached … verification-only" was written while the same file
  admitted the formal acceptance was never run
  (2026-07-02-pixel-perfect-forensics.md, RC6).
- When you catch an unbacked claim, treat it as a correction event: file it,
  do not silently rewrite it.
<!-- END-LESSON-done-claims-need-evidence -->
<!-- BEGIN-LESSON-sampling-blindness -->
### Lesson: verified samples are never continuum coverage (sampling-blindness, v1)

- Any check that samples a CONTINUOUS space (viewport width, the element set,
  a single measurement channel) must **declare its sampling dimension** and the
  sample points — and must never report `coverage: continuum` / "100%" / "all
  widths" from a discrete sample set. Coverage from N samples is `sampled`.
- Every sampled check must carry a **stricter-instrument escalation path**: the
  finer instrument that runs before a definition-of-done is claimed or when any
  sample lands near the floor (5-width matrix → fine-step continuum pixel sweep;
  geometry-only channel → pixel channel over the same sweep; fixed element
  matrix → full computed-style diff).
- Field evidence (abstractly, the multi-layer parity campaign): the SAME
  blindness recurred three times — the element matrix, the width matrix, and a
  geometry-only sweep that read 0 divergence bands while 100+ below-floor pixel
  residuals sat between its samples
  (2026-07-02-pixel-perfect-forensics.md + follow-on parity work).
<!-- END-LESSON-sampling-blindness -->
<!-- BEGIN-LESSON-block-conquest-doctrine -->
### Lesson: per-block definition-of-done beats page-average (block-conquest-doctrine, v1)

- Drive visual parity **block by block to a per-block definition-of-done**, not
  by chasing a page-average score. A block is done only when, independently:
  `unpaired = 0`, `geometry = 0`, `paint = 0`, `asset = 0`, and `pixel >= floor`.
  The page is done only when EVERY block is done.
- The full-page pixel scalar is **telemetry, not the gate** — a high average
  launders per-block debt (one block regresses as another improves and the mean
  barely moves). Field evidence: the campaign demoted the full-page scalar
  (~0.9449 desktop) to telemetry and made acceptance per-section overlay
  (2026-07-02-pixel-perfect-forensics.md + follow-on parity work).
- Use the **overlay / onion-skin feedback pattern** to converge each block: a
  difference-blend overlay plus a 50% onion-skin composite of the block on both
  sites, reviewed by eye/vision, localizes the residual so it can be taken to
  zero before conquering the next block.
<!-- END-LESSON-block-conquest-doctrine -->
<!-- BEGIN-LESSON-capture-determinism -->
### Lesson: neutralize the capture before trusting it (capture-determinism, v1)

- A parity capture is trustworthy only after every known non-determinism source
  is neutralized. A same-input re-capture must be byte-stable; an unstable
  capture is a HARNESS defect (file it), never a product parity finding.
- The gotchas ledger — check each before treating a below-floor sample as real:
  1. **Carousel free-run timers** survive `autoplay.stop` — clear the timers,
     not just the flag, or the slide advances mid-shot.
  2. **Sub-pixel clip origin** ghosts the raster — snap clip origin to integer.
  3. **`captureBeyondViewport`** duplicates `position:fixed` chrome down the
     page — disable it when fixed chrome is present.
  4. **Lazy third-party widgets** come back blank under fast capture — settle /
     render-gate them on BOTH sites first.
  5. **In-context persistence probes** (localStorage/cookies/state) leak between
     captures — clear persistence so each shot is context-independent.
- Field evidence (abstractly): a fresh sweep over-counted by 100+ samples plus
  phantom geometry bands purely because a lazy live widget rendered blank under
  the fast path (2026-07-02-pixel-perfect-forensics.md + follow-on parity work).
<!-- END-LESSON-capture-determinism -->
<!-- END-FACTORY-LESSONS -->

## Project rules (example-app)

- Spec: `docs/superpowers/specs/2026-09-27-example-app-design.md`. Stack and layout: ADR-0001.
- Layout: `frontend/` Next.js 16 (App Router, `src/`); `backend/` Spring Boot 4.1, Java 25, Maven; `deploy/` Compose; `tests/e2e/` Playwright; `tests/scripts/` tests for the adapted factory scripts.
- `docs/` is committed (ADR-0003). Local-only notes go in `docs/local/`.
- Run Maven through `sh scripts/mvnw.sh …`; it selects JDK 25 on macOS.
- Schema changes: a new Flyway migration in `backend/src/main/resources/db/migration`. Never edit an applied migration.
- Java tests: `*Test.java` are unit tests (no Docker, no network); `*IT.java` may use Docker via Testcontainers. Tag tests with `// @trace FR-x`.
- External-service tests (Google, Telegram, OpenAI, R2) stay off by default behind an opt-in flag, so CI never runs them.
  Since 2026-09-29 the owner allows and expects agents to run them against the real services with the values in
  `deploy/.env`: posting to the local test Telegram chat, OpenAI calls and R2 writes need no further approval.
- Commit messages carry no `Co-Authored-By` or AI-attribution lines. Feature code under `frontend/src` or `backend/src/main` needs a `Slice:` or `Refs:` trailer.
- Factory scripts are adapted to this layout. Changing a gate-bearing script later needs an approved `Refs: PD-x` commit.
