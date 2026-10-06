# Checker review: OpenSpec change polish-waitlist-and-faq (spec stage)

- Maker: Claude Code, Sonnet 5.5 (session ID unknown)
- Checker: Claude Code `reviewer` subagent, claude-opus-5-5 (invocation ID unknown); read-only
- Reviewed: untracked `openspec/changes/polish-waitlist-and-faq/` at HEAD 9f9b095605b2298ca4a5b2df2df0410d4e5c2108; no code changes
- File hashes (SHA-256, truncated): proposal 0e0181ba, design 4874e3bc, tasks 91c47c44, landing-page spec f3a447fe, waitlist-signup spec 2be03707
- Not run by Checker (read-only): `openspec validate`

## Findings (Checker's wording condensed) and Maker resolutions

1. P2, landing-page spec: "short" and "MUST NOT delay access" contradicted the height animation and had no duration. **Fixed:** maximum 250 ms, and a scenario that the answer is rendered and exposed to assistive technology when the open transition starts.
2. P2, landing-page spec/tasks: "No animation beyond the FAQ" had no test task and named the wrong targets. **Fixed:** permitted targets are the FAQ answer area and the FAQ marker; task 3.1 now includes an E2E check over all other elements and pseudo-elements.
3. P3, design: `getComputedStyle(details, '::details-content')` may be unreliable. **Fixed:** design names `document.getAnimations()` as the fallback assertion method, to be confirmed in the red run.
4. P3, waitlist spec: edge cases undefined (editing after success, cleared error returning). **Fixed:** two new scenarios and E2E cases in task 3.1/2.1 wording.
5. P3, design: a glyph chevron would pollute the accessible name. **Fixed:** chevron drawn with borders and `content: ""`.
6. P3, design/spec: "unsupported browsers satisfy the spec" was wrong. **Fixed:** requirement scoped to supporting browsers, Chromium as verified target.

Checker notes with no finding: `role="alert"` stays quiet because React leaves the DOM unchanged when the message does not change; MODIFIED blocks match main spec headers; no conflicts with AGENTS.md, PRODUCT_BRIEF.md, TECH_STACK.md.
