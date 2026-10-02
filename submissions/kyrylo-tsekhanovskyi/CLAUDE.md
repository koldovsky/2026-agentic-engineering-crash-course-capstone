@AGENTS.md

## Claude Code only

- OpenSpec proposals (`/opsx:propose`, `/opsx:update`) and orchestration: use plan mode and high effort.
- Implementation goes through the `be-maker` / `fe-maker` subagents (`.claude/agents/`). For
  contract-first parallel work, dispatch both in the background, then run `npm run check`,
  `npm run review:be` and `npm run review:fe` at the sync point. If `frontend/` changed, also do the
  visual review (AGENTS.md, definition of done, step 4): run `npm run screens` and read every PNG at
  all three widths (phone 390, desktop 1280, wide 2048 px). A green test run is not proof that the UI looks right.
- If a maker stops at its attempt limit: check that the stop is in `docs/logs/retry-stops.md`, then
  retry that task once at high effort and record the level change in `docs/autonomy-log.md`.
- Running the app: start `npm run start` with the Bash tool's background mode, and always finish with
  `npm run stop`. Stopping only the background task leaves Aspire's `dcp` processes holding the ports.
- The SubagentStop hook runs `check --fast` on the maker's own side and hands failures back to it, for
  at most 3 re-entries per subagent. The maker is identified from `agent_type` or from
  `subagents/agent-<id>.meta.json`; unidentified subagents are not checked. The main session's Stop is not checked, because it would race the makers'
  builds (locked DLLs). The orchestrator runs `npm run check` itself at each sync point.
