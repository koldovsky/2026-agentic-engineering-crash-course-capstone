# Checker review: filled PR template (`docs/pr-description-filled.md`)

- Reviewed source: untracked `docs/pr-description-filled.md` (first version sha256 2ecc4b6c…332b4d, 81 lines), local HEAD 4880302, origin/mykhailo-zanizdra at 5dfa1e1.
- Maker: Claude Code, Sonnet 5.5, session `bd80afe6-9ef9-4882-9227-a4b868e5866b`. Checker: `reviewer` subagent, Opus (`claude-opus-5-5`, self-reported; invocation id a8910e7d0c0933a00). Read-only; ran no builds or tests.
- Saved by the Maker; findings abridged, resolutions added. Not committed.

## Findings and resolutions (3 P2, 8 P3)

1. **P2** The environment-files ban was attributed to 61b2981; it first appears in c5695a6. *Fixed* in the PR draft and in `docs/capstone-conditions-evidence.md` (same error).
2. **P2** Mapping of the four «go» to named streams was not backed by the chat quotes and conflicts with commit times. *Fixed:* only the four times are stated.
3. **P2** Origin of the second change (own page review) was stated as fact. *Fixed:* moved to `TODO(Mykhailo)`; only «далі» is stated.
4. **P3** The review did not quote AGENTS.md. *Fixed:* wording says the Checker flagged a rule violation.
5. **P3** The live log is not date-filtered. *Fixed:* "станом на".
6. **P3** MCP omission (`mcp__hearthbot__*` in the log). *Fixed:* named as the project chat channel.
7. **P3** 24886a0 attributed wholly to Codex, "за першим брифом" unsourced. *Fixed:* diff authored by Codex per the workflow-update review; phrase dropped.
8. **P3** A quote had an added comma. *Fixed:* verbatim.
9. **P3** Gender-marked past forms about Mykhailo. *Fixed:* neutral wording.
10. **P3** "Four commits within three seconds" imprecise. *Fixed:* commits named.
11. **P3** Report count may be stale after push; the "Інше" label dropped "— доказ:". *Fixed:* "станом на 5dfa1e1"; label restored.

Confirmed correct: template headings and order, all links point at origin files and commits that exist at origin/mykhailo-zanizdra, test and finding counts, no placeholder filled with invented content. Fixes not re-reviewed.

Note: the protect-env hook blocked both the Maker's and the Checker's shell commands whose text mentioned the protected pattern, a live blocked action not yet confirmed in `.agent-log`.
