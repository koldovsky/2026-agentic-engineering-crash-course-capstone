# Independent review: AgentFlow OpenSpec change `agentflow-landing`

Date: 2026-10-05.

## Identities

- Source reviewed: untracked `openspec/changes/agentflow-landing/` (6 files, 276 full-file lines) on HEAD `24886a027573f17c8e32313b17b66178cb6b6126`, branch `mykhailo-zanizdra`. Content hash of the reviewed version was not recorded by the Checker beyond per-file sha256 prefixes (`proposal.md` 7558f08d, `design.md` 3393619a, `tasks.md` 157e2a13, `specs/landing-page/spec.md` ab2230de, `specs/waitlist-signup/spec.md` 408e5911).
- Author of the change: Claude Code on Sonnet 5.5 (`claude-sonnet-5-5`), created through `/opsx:propose`; session ID unknown.
- Maker (applies fixes): same Sonnet 5.5 session.
- Checker: Claude Code `reviewer` subagent invoked from the Maker session; self-identified as Opus 5.5 (`claude-opus-5-5`). The runtime UI did not confirm the model, so this is self-reported. Invocation ID: unknown.
- Stage: specification only; no application code exists yet.

## Checker report (verbatim, paths shortened)

[P2] `tasks.md:18` — Correctness: task 3.2 says it is verified when the "exactly one form" and "CTA reach" E2E tests pass. The form is only built in task 4.1 (line 23). At 3.2 the page has no form, so the test for `landing-page/spec.md:58-60` ("exactly one form exists, inside the Waitlist CTA section") cannot pass, and the CTA scenarios at spec lines 33-35 and 51-53 ("scrolls to the waitlist form") can only check the section anchor. This finding is from reading the plan; nothing was run. Fix: move the one-form and CTA-reaches-form checks to task 4.1, or have 3.2 build a placeholder Waitlist section with a form.

[P3] `tasks.md:28` — Spec drift: task 5.1 saves the `pnpm check` output before the review in 5.3. Task 5.3 (line 30) reruns `pnpm check` after fixes but does not save that output with the final SHA. PRODUCT_BRIEF.md:62 requires the order "independent review → fixes → `pnpm check` → final evidence", and AGENTS.md Definition of Done requires that "`pnpm check` passes and actual verification output is saved". Also, the only reviewer step is the final one, although AGENTS.md says "Before commits that add or change behavior and at final review, use `.claude/agents/reviewer.md`". Fix: add a final step that saves the rerun output with the reviewed or fixed commit SHA, and note that the reviewer runs before each behavior commit.

[P3] `landing-page/spec.md:74` — Spec drift (internal contradiction): this scenario says visible copy is Ukrainian "apart from the brand name". But the required messages at `waitlist-signup/spec.md:21`, `:25`, `:32` ("Введіть email.", "Введіть коректну email-адресу.") contain the Latin word "email", so the spec's own copy breaks this scenario and the scenario cannot be tested as written. Fix: either allow the term "email" as an exception in line 70/74, or reword the messages to use Ukrainian only.

[P3] `waitlist-signup/spec.md:12` — Missing test: the requirement at line 10 says validation and success feedback MUST be exposed to assistive technology. The only scenario (lines 12-14) covers Tab, typing, Enter and the label, so no acceptance scenario checks that errors or success are linked to the input or announced. Fix: add a scenario saying that after an invalid submit the error is programmatically associated with the input (aria-describedby) or announced through an alert or status region, and map it to an E2E check in task 4.1 or 4.2.

[P3] `tasks.md:12` — Missing test: task 2.1 lists the input cases but does not require checking the specified messages. `waitlist-signup/spec.md:79` has the same gap. TECH_STACK.md:63 says "Test the configured product rules and error messages". Fix: state that the unit tests check the exact required and invalid-format messages exported from `lib/waitlist.ts`.

Coverage (Checker): the six change files above; base and HEAD 24886a0, tracked diff 0 lines, untracked 276 full-file lines. Evidence inspected: PRODUCT_BRIEF.md, TECH_STACK.md, AGENTS.md, openspec/config.yaml, OpenSpec 1.14.0 spec template, package.json, `docs/runs/2026-10-05-openspec-setup.json`, `docs/reviews/2026-10-05-workflow-update-review.md`. All brief requirements were found covered. Not run: `openspec validate`, `pnpm check`, any other command.

## Maker resolutions (not re-reviewed)

- P2 fixed: `tasks.md` 3.2 now verifies only anchors, navigation and absence of payment controls; the one-form and CTA-scrolls-to-form checks moved to 4.1.
- P3 fixed: task group 5 now runs the reviewer before each behavior commit and finally, then runs `pnpm check`/`pnpm build` after fixes and saves that output with the tested SHA, then records the visual inspection.
- P3 fixed: the validation messages are now Ukrainian-only ("Введіть електронну пошту.", "Введіть коректну адресу електронної пошти."), removing the contradiction with the language requirement.
- P3 fixed: added the "Feedback is exposed to assistive technology" scenario; task 4.2 covers it.
- P3 fixed: unit-test requirement and task 2.1 now include the exact messages.
- After the fixes the Maker ran `pnpm exec openspec validate agentflow-landing --strict` (valid). The fixed version (content hash `dd64d4a8b9128bb793c7c507f015bfb453f9d55b73c47ef33f5a76e860114dd2`, sha256 over per-file sha256 of the sorted change files) was not re-reviewed by the Checker.
- Maker decisions on small spec details (not in the brief): input trimmed before validation; message texts fixed in the spec; success message states the demo; two capabilities (`landing-page`, `waitlist-signup`).

This is not a final capstone approval. `pnpm check` is not configured yet.
