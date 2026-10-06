# Checker review: capstone conditions evidence

- Reviewed source: untracked `docs/capstone-conditions-evidence.md` (91 lines, first version sha256 ebf3c008…79a01) and `docs/runs/2026-10-06-conditions-*.txt` at HEAD 5dfa1e1ee561548941d96117d5766e03232ea14b, branch `mykhailo-zanizdra`.
- Maker: Claude Code, Sonnet 5.5, session `bd80afe6-9ef9-4882-9227-a4b868e5866b`. Checker: `reviewer` subagent, Opus (`claude-opus-5-5`, self-reported; invocation id aa710e29f961d2016). Read-only; ran no builds or tests.
- Saved by the Maker; findings abridged, resolutions added.

## Findings and resolutions

1. **[P1] Cited `docs/video-script.md`, which did not exist yet.** *Resolution:* the file is written after the review and the sentence now says so.
2. **[P2] Wrong red-run count** (9 failing). *Resolution:* "3 unit and 10 E2E, 5 per width".
3. **[P2] Flaky-test figures inconsistent** ("1 in 8", "3 of 4"). *Resolution:* restated as 1 failure in 3 `pnpm check` runs, 0 in 5 unsaved `pnpm test:e2e` runs.
4. **[P2] "Agent test defect" overclaimed** while the cause is unknown; may be test timing or a real intermittent spec violation. *Resolution:* heading and text now say intermittent, cause unknown, both possibilities.
5. **[P3] AGENTS.md origin wrong** (scaffold 4666845 vs rules in 61b2981). *Resolution:* corrected.
6. **[P3] Verdict legend incomplete.** *Resolution:* UNKNOWN and qualifiers explained.
7. **[P3] Missing `2026-10-04-precommit-review.md`** (Codex Maker, Claude Checker, 1 P2 + 3 P3). *Resolution:* added.
8. **[P3] PR template field "Проєкт / Де код" missing; this report path did not exist.** *Resolution:* field added; this file saved.

Checker confirmed: commit hashes and timestamps, review counts, test and log numbers, course files untouched, `.gitignore` line, no placeholder filled with a claim. The fixes were not re-reviewed.
