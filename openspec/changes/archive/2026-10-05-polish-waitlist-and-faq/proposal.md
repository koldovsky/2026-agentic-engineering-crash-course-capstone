## Why

Mykhailo reviewed the finished page and found two defects. In the waitlist form, the validation error stays on screen after the visitor corrects the field to a valid address; it only goes away on resubmit. In the FAQ, the native disclosure blocks snap open and closed and the marker switches between two glyphs, which feels abrupt.

## What Changes

- The waitlist error is re-evaluated while the visitor edits the field: it disappears as soon as the value is valid, and its text follows the current value while it is still invalid. No error appears before the first submit.
- FAQ items open and close with a short, plain-CSS animation, and the marker rotates smoothly instead of swapping glyphs. Reduced-motion preferences disable the motion.
- The "Simple styling" requirement is relaxed from "no complex animations" to allow this single, simple, motion-safe transition.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `waitlist-signup`: "Correction and resubmission" gains live error clearing and re-evaluation while an error is shown.
- `landing-page`: "Static informational sections" gains the animated FAQ disclosure behavior, and "Simple styling" permits it.

## Impact

- `components/WaitlistForm.tsx`, `lib/waitlist.ts` (small pure helper), `components/Faq.tsx`, `app/globals.css`.
- Tests: `lib/waitlist.test.ts`, `tests/e2e/waitlist.spec.ts`, `tests/e2e/landing.spec.ts`.
- No new dependencies, no config changes, no JavaScript for the FAQ animation, still one page with no network use.
