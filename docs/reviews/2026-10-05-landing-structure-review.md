# Review: landing page structure (OpenSpec change `agentflow-landing`, task group 3)

- Reviewed source: staged changes against HEAD b921515; `git diff --cached` sha256 1dbdb15bb8a1b23a8539236727cb759041156a4a52b5655c2b102d50c1a2edac (pre-fix).
- Maker: Claude Code, Sonnet 5.5 (session id unknown). Checker: `reviewer` subagent, Opus (`claude-opus-5-5` as reported; invocation id ae8831240d562d2d0). The Checker edited nothing and ran no commands.
- Saved by the Maker; findings abridged, resolutions added.

## Findings

1. **[P3] Missing test:** the plan-link loop in `tests/e2e/landing.spec.ts` passes vacuously if a plan has no link. *Resolution:* added an assertion that the number of plan links equals the number of plans.
2. **[P3] Rule violation (evidence identity):** run headers had no content hash. *Resolution:* both headers record the sha256 of the concatenated tested sources; `pnpm check` was rerun after the test change and the pass output replaced.

Limitations noted by the Checker (not findings): the form is implemented in group 4; visual inspection is task 5.4. The test regex correction after the failing run was judged legitimate and is documented in the fail file.
