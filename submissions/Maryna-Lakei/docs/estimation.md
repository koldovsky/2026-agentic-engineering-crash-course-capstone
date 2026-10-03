# Effort

Git records commit timestamps. It does not record hours worked. This page does not turn clock gaps into labor. Author time and committer time are the same on every commit below (`%aI` equals `%cI` in `git log` on `capstone-project`).

Source: `git log --format='%H %aI %cI %an %s'` on branch `capstone-project`, read 2026-10-03. The git root is the parent of `submissions/Maryna-Lakei`.

## What the log can support

| Fact | Value |
| --- | --- |
| Commits on the branch | 11 |
| Merge-base with `main` | `cbee9be57cf6afbe3ddd919f4488a0d15f75245d` |
| Commits after that merge-base | 8, all author Maryna Lakei |
| Commits at or before the merge-base | 3, all author Vyacheslav Koldovskyy, the course template |
| Product-commit calendar span | 2026-10-02 15:06:20 +03:00 through 2026-10-03 13:21:12 +03:00 |
| Elapsed clock from the first product commit to the last | 22h 14m 52s, including the overnight gap |
| Uncommitted work | Not in this log. The release pages in this pass are uncommitted |

The 22h 14m 52s figure is the distance between two timestamps. It is not a timesheet.

## Course template commits

These are on the branch and are not product delivery. Times are already Europe/Kyiv (`+03:00`).

| Commit | Author time (Europe/Kyiv) | Subject |
| --- | --- | --- |
| `1084341669fbe5923e93bd45a721dc672fc007a3` | 2026-09-09 18:28:32 +03:00 | Course capstone template |
| `c9af6b12c760dd4c200a940c0148154c830f9ede` | 2026-09-10 18:20:26 +03:00 | Course template rewrite |
| `cbee9be57cf6afbe3ddd919f4488a0d15f75245d` | 2026-09-11 12:25:13 +03:00 | Course template, merge-base with `main` |

## Product commits

Git stored these author times as `+01:00`. The Europe/Kyiv column is that instant plus two hours (`EEST`, UTC+3), matching `TZ=Europe/Kyiv`. The clock gap is the elapsed time since the previous product commit. It is not hours worked.

| Commit | Author time (git, +01:00) | Europe/Kyiv | Clock gap since previous | Subject |
| --- | --- | --- | --- | --- |
| `5733b56989a75f0f8a1b3d36ae989f754e66b3f2` | 2026-10-02 13:06:20 | 2026-10-02 15:06:20 | — | Slice 1, request intake. `Refs: FR-1, FR-2, FR-7, FR-13` |
| `e986fcf3b1087ab34b99f39fa1b4702e3d5945c2` | 2026-10-02 15:01:09 | 2026-10-02 17:01:09 | 1h 54m 49s | Slice 2, generation. `Refs: FR-3, FR-4, FR-5, FR-9, FR-10, FR-11, NFR-4` |
| `cd6567dcd2b67aea44e0ea3ebcf0b7b7a2e19764` | 2026-10-02 16:03:14 | 2026-10-02 18:03:14 | 1h 2m 5s | Slice 3, result review. `Refs: FR-6, FR-12, NFR-1` |
| `e53db6c68dbaeb8dfe77f361c4e274e40d63d202` | 2026-10-02 17:53:47 | 2026-10-02 19:53:47 | 1h 50m 33s | Slice 4, generation failure. `Refs: FR-8, NFR-3, NFR-4` |
| `dd07d6c93dc7be89b9759c5f0ab2e0b7f0d54391` | 2026-10-02 18:42:20 | 2026-10-02 20:42:20 | 48m 33s | Phase 5 coverage and cross-slice checks |
| `975a6d215fa2b97094c1e765087a7543159c628c` | 2026-10-02 19:25:40 | 2026-10-02 21:25:40 | 43m 20s | Phase 6 QA proof |
| `10269e4839fe4b42c05e88ef340b702ad332d012` | 2026-10-03 10:28:48 | 2026-10-03 12:28:48 | 15h 3m 8s | PD-2 lock reseal. `Refs: PD-2` |
| `47800573915f20c69a4df89ae4218d606d919f14` | 2026-10-03 11:21:12 | 2026-10-03 13:21:12 | 52m 24s | Production deploy evidence. `Refs: PD-1` |

Each of those eight commit messages includes `Co-authored-by: Cursor <cursoragent@cursor.com>`. The trailer does not say how long anyone worked.

The overnight gap (15h 3m 8s) sits between the Phase 6 commit and the PD-2 commit. Nothing in git says whether anyone worked during it.

## What this page refuses to state

No hour total. No cost. No split between the owner and the agent. Sessions that never became a commit are invisible, including this documentation pass. A fresh `git fetch` was not run, so this page does not claim the remote is missing `4780057`. The stored upstream ref was one commit behind `HEAD` when this file was written. See [operations](technical/operations.md).
