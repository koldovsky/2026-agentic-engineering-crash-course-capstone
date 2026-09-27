---
name: step-preflight
description: Shared preflight checklist used by /branch and /step before forking any feat/* branch — confirms oleksandr-sorokin is clean, up to date with origin, and has no unmerged feat/* branch left over from a previous step. Read this whenever a command needs to create a new branch off oleksandr-sorokin.
license: MIT
---

# Step preflight checklist

Run from the repo root (two levels up from this submission folder). Stop and report at the first
check that fails — do not silently work around any of them, do not decide for the human.

1. `git branch --show-current` must print `oleksandr-sorokin`. If not, STOP: branches must fork from
   `oleksandr-sorokin`, not from another feature branch. Tell the human to switch back
   (`git switch oleksandr-sorokin`) — do not run that for them if it might discard anything; check
   status first.
2. `git status --short -- . ':!.agent-log/actions.jsonl'` must be empty (this excludes ONLY the
   audit log — `.agent-log/actions.jsonl` is rewritten by the hooks on every tool call, including the
   ones this very preflight check just ran, so it is expected to show as changed and must never block
   a branch switch on its own). Anything else in the output means STOP and list what is uncommitted —
   do not stash or discard anything yourself. If `.agent-log/actions.jsonl` is the only change, leave
   it as-is: it carries over onto the new branch uncommitted and gets folded into that branch's own
   first commit, which is correct — its new lines belong to the work that produced them, not to
   whatever came before.
3. `git fetch origin`, then compare local `oleksandr-sorokin` to `origin/oleksandr-sorokin`:
   `git rev-list --left-right --count oleksandr-sorokin...origin/oleksandr-sorokin`.
   - behind only → fast-forward: `git merge --ff-only origin/oleksandr-sorokin`.
   - ahead (unpushed commits) → STOP, tell the human to `git push origin oleksandr-sorokin` first.
   - diverged → STOP, tell the human; do not merge or rebase it yourself.
4. `git branch --list 'feat/*' --no-merged oleksandr-sorokin`. If it lists anything, STOP and report
   it — that step's PR is not merged into `oleksandr-sorokin` yet. Ask the human whether to continue
   anyway (they may be working two steps in parallel on purpose) or merge that PR first; do not decide
   this yourself.

Only once all four pass, create and switch to the requested branch: `git switch -c feat/<suffix>`,
then report the short SHA it branched from.
