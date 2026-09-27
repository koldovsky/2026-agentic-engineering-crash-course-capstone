#!/usr/bin/env node
// Claude Code Stop hook — runs pnpm check before the agent halts.
// Exit 2 = block the stop and send the failure output back to the agent.
// Checks STOP_HOOK_ACTIVE to avoid infinite loops (pnpm check itself may trigger a stop).
//
// To activate: add to .claude/settings.json hooks.Stop (the human manages settings.json):
//   { "hooks": [{ "type": "command", "command": "node",
//                 "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/check-on-stop.mjs"],
//                 "timeout": 120 }] }
//
// Canonical copy: .agents/hooks/check-on-stop.mjs -> synced to .claude/hooks/ by pnpm agents:sync.
import { spawnSync } from "node:child_process";

if (process.env.STOP_HOOK_ACTIVE === "1") process.exit(0);

let raw = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) raw += chunk;
// We don't need the payload, but consuming stdin is good practice.

const root = (() => {
  try { return JSON.parse(raw || "{}").cwd ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd(); }
  catch { return process.env.CLAUDE_PROJECT_DIR ?? process.cwd(); }
})();

const result = spawnSync("pnpm", ["check"], {
  cwd: root,
  env: { ...process.env, STOP_HOOK_ACTIVE: "1", FORCE_COLOR: "0" },
  encoding: "utf8",
  maxBuffer: 5 * 1024 * 1024,
});

if (result.status !== 0) {
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  process.stderr.write(`pnpm check failed (exit ${result.status}):\n${output}\n`);
  process.exit(2);
}

process.exit(0);
