---
description: Start a step branch from an up-to-date, fully-merged oleksandr-sorokin, do the described work, commit with an explanation the PR will show.
---

The human's message after this command is: `<branch-suffix> — <task description>`.
Example: `/step 06-etf-data implement the EtfRepository and the seed generator per openspec/changes/01-etf-data/`

Do exactly these steps, in order, and stop immediately (report why) if any check fails:

1. Read and follow `.agents/skills/step-preflight/SKILL.md` to check preconditions and create
   `feat/<branch-suffix>`.
2. Do the task exactly as described. Follow this project's AGENTS.md — scope rule, trust levels,
   Definition of Done. If the task is ambiguous, ask before writing code, not after.
3. Run `pnpm check` (and `pnpm verify` if the task touched app behaviour, not just docs/config).
   If it is red, do not commit — fix it first or report back what is blocking you.
4. Before committing, look back over THIS session's actual messages (not the diff, the conversation)
   for a moment where the human made a real call: approved or rejected something you proposed, chose
   between options you offered, corrected or redid something, set a boundary, or told you to stop/change
   direction. From that, write the single best-fit "Human decided" line — a fact about what they did,
   not a guess dressed up as one. Do not invent a decision that did not happen; if the session had no
   back-and-forth (they just said "go" and never intervened), the honest line is something like
   "reviewed the diff before it was committed, no changes requested" — write that, don't manufacture one.
5. Commit ONE commit (use `git commit --amend` while iterating, don't leave a pile of WIP commits) with:
   - a Conventional Commits summary line (`feat:`, `test:`, `spec:`, `fix:`, `docs:`, `chore:`, `review:`);
   - a body of 3-6 lines: what changed, and why — this becomes the PR description when the human runs
     `gh pr create --fill`, so write it for a reviewer who has not seen this conversation;
   - end the body with three lines, filled honestly (an empty or "none" third line is fine and expected
     sometimes — do not force one if nothing actually went wrong, but do not omit the line either):
     ```
     Agent did: <one line>
     Human decided: <your best-fit line from step 4, already filled in — not a placeholder>
     What went wrong: <one line, or "none this step">
     ```
6. Do NOT push and do NOT open a PR. Stop here, show `git log -1 --stat`, then print two alternate
   phrasings for the "Human decided" line (drawn from the same session, not invented) so the human can
   `git commit --amend` if your first pick framed it wrong. Tell them the branch name so they can
   review the diff and push themselves.
