#!/usr/bin/env node
// Green phase of an OpenSpec change: runs the agent in a loop until the checks are green,
// instead of prompting step by step. Starts only after the change's red commit exists.
//   0. run the checks once to record the starting (red) state
//   1. `claude -p` implements the change's tasks after section 0 (acceptEdits, allow-listed
//      commands, no commit, no deps)
//   2. run the checks (`pnpm check`, `pnpm test:e2e`); green → stop
//   3. red → feed the failing output back into the same session and repeat
// Stops on: green, max iterations, no progress (same failure twice in a row), or agent error.
// Tests cannot be weakened to get green: `pnpm tests:locked` runs inside `pnpm check`.
// Every run is written to .agent-log/loops/<run>-<change>.jsonl as evidence.
// Usage: pnpm agent:loop [--max N] <change> ["extra instructions"]
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const TAIL_LINES = 120;
const TAIL_CHARS = 12_000;

const args = process.argv.slice(2);
let max = 5;
const maxAt = args.indexOf("--max");
if (maxAt !== -1) {
  max = Number(args[maxAt + 1]);
  args.splice(maxAt, 2);
}
const [change, ...extra] = args;
if (!change || !Number.isInteger(max) || max < 1) {
  console.error('Usage: pnpm agent:loop [--max N] <change> ["extra instructions"]   (N ≥ 1, default 5)');
  process.exit(2);
}
const changeDir = join("openspec", "changes", change);
if (!existsSync(join(root, changeDir))) {
  console.error(`No OpenSpec change at ${changeDir}/ — create it first (spec-writer / /opsx:propose).`);
  process.exit(2);
}
const escaped = change.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const red = spawnSync("git", ["log", "--format=%h %s", "-E", `--grep=^test\\(${escaped}\\)!?: `, "HEAD"], {
  cwd: root,
  encoding: "utf8",
});
const redCommit = red.status === 0 ? red.stdout.split("\n")[0] : "";
if (!redCommit) {
  console.error(`No red commit \`test(${change}): ...\` yet. Do section "0. Red tests" first (/opsx:apply), then loop.`);
  process.exit(2);
}
const task = `Implement OpenSpec change "${change}": read ${changeDir}/ (proposal, specs, tasks.md) and do the
implementation tasks after section "0. Red tests", ticking each one off in tasks.md when done.
The red commit is ${redCommit}.${extra.length ? `\nExtra instructions from the human: ${extra.join(" ")}` : ""}`;

const checks = [
  { name: "check", cmd: "pnpm check" },
  { name: "e2e", cmd: "pnpm test:e2e" },
];

const runId = new Date().toISOString().replace(/[:.]/g, "-");
const logDir = join(root, ".agent-log", "loops");
mkdirSync(logDir, { recursive: true });
const logFile = join(logDir, `${runId}-${change}.jsonl`);
const log = (entry) => appendFileSync(logFile, JSON.stringify({ ts: new Date().toISOString(), run: runId, ...entry }) + "\n");

const RULES = `You are running inside an automated loop (scripts/agent-loop.mjs), not an interactive chat.
Goal: make these commands exit 0: ${checks.map((c) => `\`${c.cmd}\``).join(", ")}.
Rules: follow AGENTS.md. Fix the implementation, never the tests — test files from a \`test(<change>):\` commit are locked
(\`pnpm tests:locked\` fails if they change). Do not commit, do not push, do not add dependencies, do not edit .env*,
.claude/ or .agent-log/. If the goal needs a human decision (wrong spec, missing dependency), say so and stop editing.`;

const agentArgs = (prompt, first, sessionId) => [
  "-p",
  prompt,
  ...(first ? ["--session-id", sessionId, "--append-system-prompt", RULES] : ["--resume", sessionId]),
  "--permission-mode",
  "acceptEdits",
  "--allowedTools",
  "Read,Grep,Glob,Edit,Write,Bash(pnpm check),Bash(pnpm test *),Bash(pnpm test:e2e),Bash(pnpm typecheck),Bash(pnpm lint),Bash(git status *),Bash(git diff *),Bash(git log *)",
];

// Vitest: "Tests  1 failed | 5 passed (6)"; Playwright: "  5 passed (3.2s)" / "  1 failed".
const counts = (out) => {
  const vitest = out.match(/^\s*Tests\s+(.*)$/m)?.[1] ?? "";
  const pw = out.split("\n").filter((l) => /^\s+\d+ (passed|failed|flaky)\b/.test(l)).join(" ");
  const n = (s, word) => Number(s.match(new RegExp(`(\\d+) ${word}`))?.[1] ?? 0);
  const src = vitest || pw;
  return { passed: n(src, "passed"), failed: n(src, "failed") };
};
const tail = (out) => out.split("\n").slice(-TAIL_LINES).join("\n").slice(-TAIL_CHARS);
// Same failure twice in a row = no progress. Strip timings so they do not hide a repeat.
const signature = (results) =>
  results
    .filter((r) => r.exit !== 0)
    .map((r) => `${r.name}:${r.exit}:${tail(r.out).replace(/\d+(\.\d+)?\s?(ms|s)\b/g, "").replace(/\d{2}:\d{2}:\d{2}/g, "")}`)
    .join("\n");

const runChecks = () =>
  checks.map(({ name, cmd }) => {
    const t = Date.now();
    const r = spawnSync(cmd, { cwd: root, shell: true, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
    return { name, cmd, exit: r.status ?? 1, ms: Date.now() - t, out, ...counts(out) };
  });

const report = (iteration, results) => {
  const line = results
    .map((r) => `${r.name} ${r.exit === 0 ? "✔" : "✘"} (exit ${r.exit}, ${r.passed} passed, ${r.failed} failed)`)
    .join(" · ");
  console.log(`[loop] iteration ${iteration}: ${line}`);
  log({ phase: "check", iteration, checks: results.map((r) => ({ ...r, out: undefined })) }); // raw output stays out of the log
};

const sessionId = randomUUID();
log({ phase: "start", change, redCommit, task, max, session: sessionId, checks: checks.map((c) => c.cmd) });
console.log(`[loop] run ${runId}, max ${max} iteration(s), log ${logFile}`);

let results = runChecks();
report(0, results);
let stop = results.every((r) => r.exit === 0) ? "green" : null;
let iteration = 0;
let lastSig = signature(results);

while (!stop) {
  if (iteration >= max) {
    stop = "max-iterations";
    break;
  }
  iteration++;
  const failing = results.filter((r) => r.exit !== 0);
  const prompt =
    iteration === 1
      ? `${task}\n\nCurrent check output (red):\n${failing.map((r) => `$ ${r.cmd}\n${tail(r.out)}`).join("\n\n")}`
      : `The checks are still red after your last attempt. Fix the implementation, not the tests.\n\n${failing
          .map((r) => `$ ${r.cmd}\n${tail(r.out)}`)
          .join("\n\n")}`;

  console.log(`[loop] iteration ${iteration}: agent working…`);
  const t = Date.now();
  const agent = spawnSync("claude", agentArgs(prompt, iteration === 1, sessionId), { cwd: root, stdio: ["ignore", "inherit", "inherit"] });
  log({ phase: "agent", iteration, exit: agent.status, ms: Date.now() - t });
  if (agent.status !== 0) {
    stop = "agent-error";
    break;
  }

  results = runChecks();
  report(iteration, results);
  if (results.every((r) => r.exit === 0)) {
    stop = "green";
    break;
  }
  const sig = signature(results);
  if (sig === lastSig) stop = "no-progress";
  lastSig = sig;
}

log({ phase: "stop", reason: stop, iterations: iteration });
console.log(`[loop] stopped: ${stop} after ${iteration} agent iteration(s). Log: ${logFile}`);
if (stop !== "green") {
  console.log("[loop] not green — review the diff, fix the spec or take over by hand. Nothing was committed.");
  process.exit(1);
}
console.log(`[loop] green. Review the diff, run the reviewer agent, then commit it yourself: feat(${change}): ...`);
