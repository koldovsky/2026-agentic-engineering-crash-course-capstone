// Git pre-commit hook (deterministic inner loop) — install per hooks/README.md.
// Fast, staged-scope checks only; the full battery runs at gates and in CI.
//
//   1. block committing real env files / obvious secrets
//   2. ESLint on staged frontend files
//   3. frontend typecheck / backend compile, when staged
//   4. traceability validator (fast, pure file parsing)
import { execFileSync, execSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

// Fail-open process-health telemetry (reflection design, mechanism 1): append
// a hook-run event with the final exit code to trace/ledger.jsonl. Ledger
// errors are swallowed — telemetry must NEVER block a commit.
// A check that lets the commit through while printing NOT-EARNED is named in meta, so the digest counts it.
const notEarned = [];
process.on("exit", (code) => {
  try {
    if (!existsSync("scripts/ledger.mjs")) return;
    const event = { event: "hook-run", check: "pre-commit", exitCode: code ?? 0 };
    if (notEarned.length) event.meta = { notEarned: true, checks: notEarned };
    spawnSync(
      process.execPath,
      ["scripts/ledger.mjs", "emit", JSON.stringify(event)],
      { stdio: "ignore" },
    );
  } catch {
    /* fail-open */
  }
});

const run = (cmd, opts = {}) => execSync(cmd, { stdio: "inherit", ...opts });
const capture = (cmd) => execSync(cmd, { encoding: "utf8" }).trim();

const staged = capture("git diff --cached --name-only --diff-filter=ACM")
  .split("\n")
  .filter(Boolean);

// 1 — secret hygiene
const envViolations = staged.filter((f) => /(^|\/)\.env(\.|$)/.test(f) && !f.endsWith(".example"));
if (envViolations.length) {
  console.error(`pre-commit: refusing to commit env file(s): ${envViolations.join(", ")}`);
  process.exit(1);
}
const SECRET_PATTERNS = [
  /-----BEGIN (RSA |EC )?PRIVATE KEY-----/,
  /\b(sk|rk|re|ghp|gho|xox[bap])_[A-Za-z0-9]{16,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /postgres(ql)?:\/\/[^\s'"]+:[^\s'"]+@/,
];
for (const file of staged) {
  if (/\.(png|webm|jpg|jpeg|gif|pdf|ico|woff2?)$/.test(file)) continue;
  let content = "";
  try {
    content = capture(`git show :"${file}"`);
  } catch {
    continue;
  }
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      console.error(`pre-commit: possible secret in ${file} (pattern ${pattern}). Use env vars; bypass only with an explicit allowlist edit to this hook.`);
      process.exit(1);
    }
  }
}

// 2 — lint staged frontend sources from inside frontend/, where the ESLint config lives
const lintable = staged
  .filter((f) => f.startsWith("frontend/") && /\.(ts|tsx|js|jsx|mjs)$/.test(f))
  .map((f) => f.slice("frontend/".length));
if (lintable.length) {
  run(`npx eslint ${lintable.map((f) => `"${f}"`).join(" ")}`, { cwd: "frontend" });
}

// 3 — typecheck the frontend and compile the backend when their files are staged
if (staged.some((f) => f.startsWith("frontend/"))) run("npm run typecheck", { cwd: "frontend" });
if (staged.some((f) => f.startsWith("backend/"))) run("sh scripts/mvnw.sh -q compile");

// 4 — traceability (fails on broken FR chain / archived-but-unchecked tasks).
// Steps 4 and 5 read a copy of the staged tree, so unstaged work beside the commit never
// shapes the committed reports, and CI --check-fresh sees the same inputs.
const snapshot = mkdtempSync(join(tmpdir(), "pre-commit-index-"));
process.on("exit", () => rmSync(snapshot, { recursive: true, force: true }));
execFileSync("git", ["checkout-index", "--all", `--prefix=${snapshot}/`]);
const gitEnv = {
  ...process.env,
  GIT_DIR: capture("git rev-parse --absolute-git-dir"),
  GIT_INDEX_FILE: resolve(process.env.GIT_INDEX_FILE ?? capture("git rev-parse --git-path index")),
};
const inSnapshot = (script, args, stdio) =>
  spawnSync(process.execPath, [resolve(script), ...args], { cwd: snapshot, encoding: "utf8", stdio, env: gitEnv });
const stageFromSnapshot = (...files) => {
  for (const file of files) {
    mkdirSync(dirname(file), { recursive: true });
    copyFileSync(join(snapshot, file), file);
  }
  run(`git add ${files.join(" ")}`);
};

const traceability = inSnapshot("scripts/check-traceability.mjs", [], "inherit");
if (traceability.status !== 0) process.exit(traceability.status ?? 1);
stageFromSnapshot("docs/qa/traceability-report.md", "trace/trace.json");

// 5 — trajectory (process audit: review evidence, Slice: trailers, scope).
// --warn-only keeps a NOT-EARNED result (no archived slice yet) from blocking a
// commit; gate-status still sees it. Regenerates + stages its report so CI
// --check-fresh stays green.
const trajectory = inSnapshot("scripts/check-trajectory.mjs", ["--warn-only"], ["ignore", "pipe", "inherit"]);
writeSync(1, trajectory.stdout ?? "");
if (trajectory.status !== 0) process.exit(trajectory.status ?? 1);
if (/^Result: NOT-EARNED\b/m.test(trajectory.stdout ?? "")) notEarned.push("trajectory");
stageFromSnapshot("docs/qa/trajectory-report.md", "trace/trajectory.json");

console.log(
  notEarned.length
    ? `pre-commit: checks passed; NOT-EARNED (commit allowed): ${notEarned.join(", ")}`
    : "pre-commit: all deterministic checks passed",
);
