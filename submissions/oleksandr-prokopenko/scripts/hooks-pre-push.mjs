// Git pre-push hook: runs the fast checks of CI's verify job on a clean checkout of each pushed commit.
// CI checks only pushes tagged [deploy], and the pre-commit hook sees the working tree, so nothing else checks the pushed tree.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NO_CODE, SUITES, readStamps } from "./hooks-battery-stamp.mjs";

const root = process.cwd();
const started = Date.now();
const openspecCli = join(root, "node_modules", "@fission-ai", "openspec", "bin", "openspec.js");
const CHECKS = [
  ["traceability report is fresh", process.execPath, ["scripts/check-traceability.mjs", "--check-fresh"]],
  ["trajectory report is fresh", process.execPath, ["scripts/check-trajectory.mjs", "--check-fresh", "--warn-only"]],
  ["factory integrity lock", process.execPath, ["scripts/check-factory-integrity.mjs"]],
  ["openspec validate --all --strict", process.execPath, [openspecCli, "validate", "--all", "--strict"]],
  ["factory script tests", "npm", ["run", "--silent", "test:scripts"]],
  ["deploy config tests", "npm", ["run", "--silent", "test:deploy"]],
];
// Git exports GIT_DIR and GIT_INDEX_FILE to hooks; left in place they would point the checks back at this working tree.
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^GIT_(DIR|INDEX_FILE|WORK_TREE|PREFIX)$/.test(name)));

// A [deploy] push needs a passing run of the slow suites on code equal to the pushed commit's.
function stampProblem(sha) {
  const message = execFileSync("git", ["log", "-1", "--format=%B", sha], { env, encoding: "utf8" });
  if (!message.includes("[deploy]")) return null;
  const tree = execFileSync("git", ["rev-parse", `${sha}^{tree}`], { env, encoding: "utf8" }).trim();
  const names = SUITES.map(([name]) => name);
  for (const stamp of readStamps(root).reverse()) {
    if (!names.every((name) => stamp.suites?.[name]?.exit === 0)) continue;
    const diff = spawnSync("git", ["diff", "--name-only", stamp.tree, tree], { env, encoding: "utf8" });
    if (diff.status === 0 && diff.stdout.split("\n").filter(Boolean).every((path) => NO_CODE.test(path))) return null;
  }
  return `no passing run of ${names.join(", ")} matches the code of this [deploy] commit; run \`node scripts/hooks-battery-stamp.mjs\` on it, then push again`;
}

const failures = [];
process.on("exit", (code) => {
  if (!existsSync("scripts/ledger.mjs")) return;
  const event = { event: "hook-run", check: "pre-push", exitCode: code ?? 0, meta: { ms: Date.now() - started, failures } };
  spawnSync(process.execPath, ["scripts/ledger.mjs", "emit", JSON.stringify(event)], { stdio: "ignore" });
});

const pushed = readFileSync(0, "utf8")
  .split("\n")
  .map((line) => line.trim().split(/\s+/))
  .filter(([, sha]) => sha && !/^0+$/.test(sha));

for (const [ref, sha] of pushed) {
  const stamp = stampProblem(sha);
  if (stamp) {
    failures.push(`${sha.slice(0, 12)}: slow suites`);
    console.error(`pre-push: ${ref} ${sha.slice(0, 12)}: ${stamp}`);
  }
  const dir = mkdtempSync(join(tmpdir(), "pre-push-"));
  try {
    execFileSync("git", ["worktree", "add", "--detach", "--quiet", dir, sha], { env });
    if (existsSync(join(root, "node_modules"))) symlinkSync(join(root, "node_modules"), join(dir, "node_modules"));
    for (const [name, command, args] of CHECKS) {
      const run = spawnSync(command, args, { cwd: dir, env, encoding: "utf8" });
      if (run.status === 0) continue;
      failures.push(`${sha.slice(0, 12)}: ${name}`);
      const tail = `${run.stdout ?? ""}${run.stderr ?? ""}`.trim().split("\n").slice(-20).join("\n");
      console.error(`pre-push: ${ref} ${sha.slice(0, 12)}: ${name} failed (exit ${run.status ?? run.error?.code})\n${tail}`);
    }
  } finally {
    spawnSync("git", ["worktree", "remove", "--force", dir], { env });
    rmSync(dir, { recursive: true, force: true });
  }
}

const seconds = Math.round((Date.now() - started) / 1000);
console.log(`pre-push: ${failures.length ? `${failures.length} check(s) failed` : "every check passed"} on ${pushed.length} pushed commit(s) in ${seconds} s`);
process.exit(failures.length ? 1 : 0);
