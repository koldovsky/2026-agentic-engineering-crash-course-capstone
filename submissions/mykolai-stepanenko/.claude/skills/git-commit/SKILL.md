---
name: git-commit
description: Commit all current changes of this project. Stages everything with `git add .`, reviews the staged diff, generates a short commit message from it and commits. Use when the user runs /git-commit or asks to commit the current work; the git-committer subagent also runs it after a completed /opsx:apply.
allowed-tools: Bash(git:*)
---

Commit the current work of this project. Never edit files.

## Steps

Run every git command from the project directory (the one holding `AGENTS.md` and `openspec/`); the git repo root is a parent directory, so `git add .` there stages only this project.

1. `git rev-parse HEAD` — remember it as `PREVIOUS_HEAD`.
2. `git add .`
3. `git diff --cached --stat` and `git diff --cached` (skim; for large diffs `--stat` plus `git diff --cached -- <key files>` is enough).
   - Nothing staged → stop and report `NOTHING_TO_COMMIT`. Do not create an empty commit.
   - A staged file looks like a secret (`.env`, `*.key`, `auth.json`, credentials/tokens in the diff) → run `git restore --staged .`, stop and report which files. Never commit secrets.
4. Generate the message:
   - One line, imperative mood, English, ≤ 72 chars, no trailing period (e.g. `Add Vue 3 home page with BTC price widget`).
   - Describe the user-visible change, not the file list; mention the OpenSpec change name only if it adds clarity.
5. Commit (message via heredoc so quoting is safe), ending with the attribution trailer:
   ```sh
   git commit -F - <<'MSG'
   <generated_commit_message>

   Co-Authored-By: Claude Opus 5.5 <Nikolaua36@gmail.com>
   MSG
   ```
   This is the `git commit -m "<generated_commit_message>"` step, with the trailer the project requires.
   Never use `--no-verify`, `--amend`, `push`, `reset`, or `rebase`. If a git hook fails, report its output — do not bypass it.
6. `git rev-parse HEAD` — `NEW_HEAD`.

## Report

```
status: COMMITTED | NOTHING_TO_COMMIT | ABORTED
previous_head: <sha>
new_head: <sha or ->
message: <commit subject>
files: <count> (<short --stat summary>)
```
