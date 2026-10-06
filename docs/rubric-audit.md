# RUBRIC.md audit — AgentFlow capstone

Audited by the Maker (Claude Code, Sonnet 5.5, session id unknown) on branch `mykhailo-zanizdra`, HEAD `3c05168`, 2026-10-05. Independent verification: `docs/reviews/2026-10-05-rubric-audit-review.md` (11 findings, all resolved). Nothing is pushed yet.

Fresh runs: `pnpm check` exit 0 (12 unit tests, 38 Playwright tests in both Chromium projects), `pnpm build` exit 0 and `pnpm exec openspec validate agentflow-landing --strict` exit 0; output in `docs/runs/2026-10-05-audit-check.txt`.

After this audit the change was archived (`pnpm exec openspec archive agentflow-landing -y`): it now lives in `openspec/changes/archive/2026-10-05-agentflow-landing/` and its two specs were synced to `openspec/specs/landing-page/` and `openspec/specs/waitlist-signup/` (`openspec validate --all --strict`: 2 passed). Earlier references to `openspec/changes/agentflow-landing/` mean that archived directory.

## 1. Working project, full cycle

| Evidence | Where |
|---|---|
| Eight ordered sections at `/`, Ukrainian copy, demo waitlist form | `app/page.tsx`, `components/*`; commits f86752a, d3eb114 |
| Spec → tests → code → check → review → fixes → evidence | `openspec/changes/agentflow-landing/` (all tasks ticked); commits 18baac5 → b921515 → f86752a → d3eb114 → ebf7fa3 → 3c05168 |
| Visual inspection at 375 px and 1440 px | `docs/runs/2026-10-05-visual-inspection.md`, `docs/runs/screenshots/` (agent-viewed only; no human inspection yet) |

## 2. Practices and evidence

| Practice | Evidence | Gap |
|---|---|---|
| Context engineering (static) | `AGENTS.md`/`CLAUDE.md` rules (spec before code, scope limits, `pnpm check`, protected environment files); `PRODUCT_BRIEF.md`, `TECH_STACK.md`, `openspec/config.yaml` | The rubric prefers a rule that visibly changed agent behaviour. Closest evidence: Checker findings citing AGENTS.md rules that were then fixed — `docs/reviews/2026-10-05-pnpm-check-setup-review.md` (tasks ticked without a saved run) and `…-waitlist-validation-review.md` (run header lacked a content hash). |
| Context engineering (dynamic / hooks) | `.claude/hooks/log-action.mjs`, `.claude/hooks/protect-env.mjs`, `scripts/agent-log-summary.mjs`; synthetic evidence `docs/runs/2026-10-04-protect-env.json`, `…-logging-*.json`; Codex-run reviews `docs/reviews/2026-10-04-logging-hooks-*.md`; recorded live activation: `docs/reviews/2026-10-05-workflow-update-review.md` ("Logging check", session 7cec865c-31ac-4cb1-ac6c-ee9f5e9995ab) | The live activation is a recorded statement; the raw `.agent-log/actions.jsonl` is git-ignored and not committed. Saved JSON runs are synthetic self-tests. No saved example of a live blocked action. |
| Loops | None claimed. Only manual verification reruns exist (see "what went wrong"). | No automated loop. PRODUCT_BRIEF makes it optional and discourages extra infrastructure; the PR must not claim loop engineering. |
| Verification | `pnpm check` (typecheck → lint → Vitest → Playwright at 375 and 1440 px); `lib/waitlist.test.ts`; `tests/e2e/*.spec.ts`; final runs `docs/runs/2026-10-05-final-check.txt`, `…-final-build.txt`, `…-audit-check.txt`. Red runs: `…-waitlist-unit-red.txt` (module-not-found before `lib/waitlist.ts` existed) → `…-unit-green.txt`; `…-waitlist-e2e-red.txt` (truncated, no exit line) → `…-waitlist-form-check-pass.txt` | The red→green pairs are not clean proof: the E2E file was edited after review (keyboard test rewritten, locators scoped) and the unit red header was edited after the run. No CI (out of scope). |
| Maker ≠ checker | `.claude/agents/reviewer.md` (Opus, read-only); reports in `docs/reviews/`: spec review (1 P2, 4 P3), four slice reviews (7 findings), one workflow-update review (1 P3), final review (1 P3), this audit's review; each with a recorded resolution. Earlier (2026-10-04) Codex was Checker of the logging hooks ("changes required"); Codex also wrote the 24886a0 workflow diff | Known Checker invocation ids: a5a078d9b7303c4a6 (validation), ae8831240d562d2d0 (landing structure), ab900b3628f4b4350 (waitlist form), a044303f2670f379e (final), a037de524271a96ed (this audit). Unknown: spec, pnpm-check-setup, workflow-update. Maker session id known only for the workflow-update review (7cec865c…). Current workflow is Claude Code for both roles, not a two-tool review. |
| Spec first (SDD) | OpenSpec change in 18baac5, before any feature code (b921515 onward) | `specs/`, `proposal.md`, `design.md` are unchanged since 18baac5 and `tasks.md` changed only in checkboxes. The post-review fixes were applied before the first commit and were not re-reviewed, so "spec changed because reality differed" is shown only by the review text, not by history. |
| Autonomy log | Not kept (optional; `templates/autonomy-log.md` untouched). | A log written now would be retroactive. Not claimed. |
| Project Factory | Not used. Not claimed. | None. |

## 3. What went wrong (agent mistakes, from the saved evidence)

- Tasks 1.1–1.4 ticked with no saved run (`docs/reviews/2026-10-05-pnpm-check-setup-review.md`).
- A test regex typo (tail of `docs/runs/2026-10-05-landing-structure-check-fail.txt`) and a strict-mode `alert` locator clash with the Next.js route announcer (tail of `…-waitlist-form-check-fail.txt`); both were test bugs fixed by the Maker.
- Live regions mounted together with their text, so some screen readers might not announce them (`docs/reviews/2026-10-05-waitlist-form-review.md`, P2, fixed, not verified with a real screen reader).
- 2026-10-04 hooks work: Codex Checker returned "changes required" (`docs/reviews/2026-10-04-logging-hooks-review.md`, fixes in `…-logging-hooks-fixes.md`).
- Git history looks batch-committed: 18baac5 and 93d408e share a timestamp (16:45:02), and the implementation commits span 16:52–17:06. Mykhailo should explain the commit timing in the PR.

## 4. Human vs agent decisions (required in the PR)

Recorded in the repository: the product brief, stack, scope limits and the 2026-10-05 workflow update (Claude Code for both roles) were approved by the product owner (`PRODUCT_BRIEF.md`, `docs/reviews/2026-10-05-workflow-update-review.md`). The agent wrote the specification, tests, code and evidence; Checkers only reported. What Mykhailo personally decided, stopped or rolled back is not recorded in the repository; he must write it in the PR (`docs/pr-description-draft.md`). It is not invented here.

## 5. Remaining items for Mykhailo

1. Human visual check of the page at 375 px and 1440 px.
2. Fill the personal fields of the PR draft: name, video link, your decisions, the commit-timing explanation.
3. Record the 1–2 minute video: product plus how it was built agentically.
4. Push the branch and open the PR from `docs/pr-description-draft.md`.

## 6. Known limitations carried forward

- Live-region announcements not verified with a real screen reader.
- Geist font loads Latin only; body text uses Arial (visual inspection note, not a spec defect).
