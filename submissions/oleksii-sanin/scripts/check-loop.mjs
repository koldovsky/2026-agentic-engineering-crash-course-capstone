#!/usr/bin/env node
// Repeat `pnpm check` until it exits 0, or until the retry cap. After each red check, the agent
// gets the failure output and one turn to fix it, and the next iteration checks its work.
//
// The agent runs headless (`claude -p`) and its edits are accepted with no human prompt, so the
// locks below are the guard. It may not edit a test file, so it cannot turn a test green by a
// change to the test. It may not edit `app/api/**`, which AGENTS.md keeps behind plan mode.
// The deny list and the hooks in `.claude/settings.json` apply to it too, and the hooks log
// every action it takes to `.agent-log/actions.jsonl`.
//
// Usage: pnpm check:loop [cap]     (the cap defaults to 5)
// Exit:  0 = green, 1 = the cap was reached, 2 = the loop could not run pnpm or claude at all.
import { spawnSync } from "node:child_process";

const cap = Number.parseInt(process.argv[2] ?? "5", 10);
if (!Number.isInteger(cap) || cap < 1) {
  console.error(`The cap must be a whole number of 1 or more. It was "${process.argv[2]}".`);
  process.exit(2);
}

/** The end of the check output holds the failed assertions, which is what the agent needs. */
const TAIL = 4000;

// An Edit(...) rule covers every file-editing tool. The CLI rejects Write(...) path rules as no-ops.
const LOCKS = ["Edit(**/*.test.ts)", "Edit(app/api/**)"];

const prompt = (failure) => `\`pnpm check\` failed. Make it pass.

Rules:
- Change code in lib/ only. Do not edit a test file. Do not edit app/api/.
- Change only what the failing check needs.
- Do not commit. The human commits.
- Run \`pnpm check\` when you are done, and say in one line what you changed.

The end of the check output:

${failure.slice(-TAIL)}`;

const started = Date.now();
let iteration = 0;
let agentTurns = 0;
let status = null;

while (iteration < cap) {
  iteration += 1;
  console.log(`\n=== iteration ${iteration} of ${cap} — pnpm check ===`);

  const run = spawnSync("pnpm", ["check"], { encoding: "utf8" });
  if (run.error) {
    console.error(`The loop could not start pnpm: ${run.error.message}`);
    process.exit(2);
  }
  const output = `${run.stdout}${run.stderr}`;
  process.stdout.write(output);

  status = run.status;
  console.log(`=== iteration ${iteration} exit ${status} ===`);
  if (status === 0 || iteration === cap) break;

  console.log(`\n=== iteration ${iteration} — claude -p, fix the failure ===`);
  const agent = spawnSync(
    "claude",
    ["-p", prompt(output), "--permission-mode", "acceptEdits", "--disallowedTools", ...LOCKS],
    { stdio: ["ignore", "inherit", "inherit"] },
  );
  if (agent.error) {
    console.error(`The loop could not start claude: ${agent.error.message}`);
    process.exit(2);
  }
  agentTurns += 1;
  console.log(`=== agent exit ${agent.status} ===`);
}

const seconds = ((Date.now() - started) / 1000).toFixed(1);
const reason = status === 0 ? "green: pnpm check exited 0" : `the retry cap of ${cap} was reached`;

console.log(`\niterations: ${iteration}`);
console.log(`agent turns: ${agentTurns}`);
console.log(`stop reason: ${reason}`);
console.log(`last exit code: ${status}`);
console.log(`seconds: ${seconds}`);

process.exit(status === 0 ? 0 : 1);
