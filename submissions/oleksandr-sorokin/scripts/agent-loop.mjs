#!/usr/bin/env node
// One iteration of the "run to green" loop (trust level 3).
//
// Each call runs the check command once, increments a per-branch counter, and
// writes an evidence file to docs/evidence/loop/. Exit codes tell the calling
// agent what to do next:
//   0  — check passed (green). Stop the loop, you're done.
//   1  — check failed, iterations remaining. Fix the error and call again.
//   2  — check failed, iteration limit reached. Stop and report to the human.
//
// Without a filter: runs `pnpm check` (full suite).
// With a positional filter (e.g. "format-percent"): runs `vitest run` scoped to
//   matching test files (lib/<filter>.test.ts or any path containing <filter>).
//
// State is kept in .agent-log/loop-state.json (auto-reset when the branch changes).
// Usage:
//   pnpm agent:loop                      full check
//   pnpm agent:loop format-percent       vitest scoped to format-percent
//   pnpm agent:loop --max 5              override iteration limit
import { execSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Parse flags and positional argument
const args = process.argv.slice(2);
const maxIdx = args.indexOf("--max");
const MAX = maxIdx !== -1 ? parseInt(args[maxIdx + 1], 10) || 5 : 5;
const filter = args.find((a) => !a.startsWith("--") && (maxIdx === -1 || a !== args[maxIdx + 1]));

const branch = (() => {
  try { return execSync("git branch --show-current", { cwd: root, encoding: "utf8" }).trim(); }
  catch { return "unknown"; }
})();
const sha = (() => {
  try { return execSync("git rev-parse --short HEAD", { cwd: root, encoding: "utf8" }).trim(); }
  catch { return "unknown"; }
})();

const stateDir = join(root, ".agent-log");
const stateFile = join(stateDir, "loop-state.json");
mkdirSync(stateDir, { recursive: true });

let state = { branch: "", filter: "", iterations: 0, startedAt: "" };
if (existsSync(stateFile)) {
  try { state = JSON.parse(readFileSync(stateFile, "utf8")); } catch { /* reset */ }
}
// Reset when branch or filter changes
if (state.branch !== branch || state.filter !== (filter ?? "")) {
  state = { branch, filter: filter ?? "", iterations: 0, startedAt: new Date().toISOString() };
}
state.iterations += 1;
const iteration = state.iterations;
writeFileSync(stateFile, JSON.stringify(state, null, 2));

const scope = filter ? `vitest run lib/${filter}.test.ts` : "pnpm check";
console.log(`\n─── agent:loop  iteration ${iteration}/${MAX}  branch=${branch}  sha=${sha}  cmd=${scope} ───\n`);

const start = Date.now();
const result = filter
  ? spawnSync("pnpm", ["vitest", "run", `lib/${filter}.test.ts`], {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: "0" },
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    })
  : spawnSync("pnpm", ["check"], {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: "0" },
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
const elapsed = ((Date.now() - start) / 1000).toFixed(1);
const combined = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
const green = result.status === 0;

const status = green ? "PASS" : "FAIL";
console.log(combined || "(no output)");
console.log(`\n─── ${status}  ${elapsed}s  iteration ${iteration}/${MAX} ───\n`);

// Write evidence
const evidenceDir = join(root, "docs", "evidence", "loop");
mkdirSync(evidenceDir, { recursive: true });
const date = new Date().toISOString().slice(0, 10);
const safeName = filter ? `-${filter}` : "";
const evidenceFile = join(evidenceDir, `${date}-${sha}${safeName}-iter${iteration}.md`);
const lines = [
  `# Agent Loop Evidence`,
  ``,
  `Date: ${new Date().toISOString()}`,
  `Branch: ${branch}`,
  `SHA: \`${sha}\``,
  `Filter: ${filter ?? "(none — full check)"}`,
  `Iteration: ${iteration}/${MAX}`,
  `Result: ${status}`,
  `Duration: ${elapsed}s`,
  ``,
  `## ${scope} output`,
  ``,
  "```",
  combined || "(no output)",
  "```",
];
writeFileSync(evidenceFile, lines.join("\n") + "\n");
console.log(`Evidence: ${evidenceFile}`);

if (green) {
  state.iterations = 0;
  writeFileSync(stateFile, JSON.stringify(state, null, 2));
  process.exit(0);
}

if (iteration >= MAX) {
  console.error(`\n✗ Iteration limit (${MAX}) reached. Stop and report to the human.\n`);
  process.exit(2);
}

const remaining = MAX - iteration;
console.error(`\n✗ Check failed. ${remaining} iteration(s) remaining — fix the error and call again.\n`);
process.exit(1);
