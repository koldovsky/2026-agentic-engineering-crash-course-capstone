# Review: waitlist form (OpenSpec change `agentflow-landing`, task group 4)

- Reviewed source: staged changes against HEAD f86752a; `git diff --cached` sha256 62a641096ace7d65b4c73579a3e3f3aacc46a39fa87c05fa1ef2f9990ab59416 (pre-fix).
- Maker: Claude Code, Sonnet 5.5 (session id unknown). Checker: `reviewer` subagent, Opus (`claude-opus-5-5` as reported; invocation id ab900b3628f4b4350). The Checker edited nothing and ran no commands.
- Saved by the Maker; findings abridged, resolutions added.

## Findings

1. **[P2] Correctness (static reasoning):** the `role="status"`/`role="alert"` nodes were mounted together with their text, so some screen readers may not announce them; repeated identical results trigger no new announcement. *Resolution:* both live regions are now always rendered and only their text changes (`components/WaitlistForm.tsx`); E2E assertions for "no error" now check the alert region is empty. Not verified with a real screen reader.
2. **[P3] Missing test:** the keyboard test used `input.focus()` instead of Tab. *Resolution:* the test now clicks the waitlist heading, presses Tab, asserts the input is focused, then types and submits with Enter.

`pnpm check` was rerun after both fixes (38 E2E passed, exit 0); output replaced in `docs/runs/2026-10-05-waitlist-form-check-pass.txt`.
