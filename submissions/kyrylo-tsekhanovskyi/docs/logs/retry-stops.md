# Retry-limit stop ledger

Append-only. One row each time an agent hits a retry limit and stops, written **before any further action**
by `node scripts/log-retry-stop.mjs` (the Stop hook calls it itself). Each row is also mirrored as a
"Зниження" / "Підвищення" line in the [autonomy log](../autonomy-log.md).

Limits: maker (5 failed attempts at the scoped check) · Stop hook (3 re-entries) · checker run (fails twice).

The `_none yet_` row means that no stop has happened so far.

| Date | Agent | Model / effort | Task | Limit reached | Last failure | What happened next |
|---|---|---|---|---|---|---|
| 2026-10-01 | unidentified subagent (be-maker or fe-maker; the hook could not tell) | Opus 5.5 / low | - | Stop hook: 3 re-entries | `=== summary === ⏎ ok                           fe: API types match the contract ⏎ ok                           fe: lint ⏎ FAILED                       fe: unit tests` | handed back to human. Investigated by the orchestrator on 2026-10-01: a **false stop**. The SubagentStop input had no usable `agent_type`, so the hook checked both sides and shared one counter with the main session; a finishing maker was blocked by the other maker's deliberately red, in-progress specs. Fixed test-first (`docs/evidence/phase-4-stop-hook-agent-identity-red.txt`): the maker is resolved from `agent_type` or `subagents/agent-<id>.meta.json`, only identified makers are checked (own side), and there is one counter per subagent. No code was lost; both makers' gates were green afterwards |
