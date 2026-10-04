// Runs one quick smoke check of the release (PD-46) and records the tree it passed on, for the pre-push check of [deploy] pushes.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

export const STAMP_FILE = "trace/battery-stamps.json";
// Changes under these paths never reach the running app, so they keep a stamp valid; the pre-push fast checks cover them.
export const NO_CODE = /^(docs\/|trace\/|openspec\/|\.github\/|tests\/deploy\/|tests\/scripts\/|factory-lock\.json$)|\.md$/;
// The owner capped this at one small operation (2026-09-30): build and start the stack from this code, then one e2e spec.
export const SUITES = [["smoke", "npm run stack:up && npx playwright test tests/e2e/home.spec.ts --project=chromium --no-deps", {}]];

export function readStamps(root) {
  const path = join(root, STAMP_FILE);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : [];
}

function main() {
  const root = process.cwd();
  const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).replace(/\n$/, "");
  const dirty = git("status", "--porcelain").split("\n").filter(Boolean).map((line) => line.slice(3)).filter((path) => !NO_CODE.test(path));
  if (dirty.length) {
    console.error(`battery-stamp: uncommitted code, so a stamp would describe no commit:\n  ${dirty.join("\n  ")}\nCommit or stash it, then run again.`);
    process.exit(1);
  }
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  console.log(`# tree ${tree} (HEAD ${head}), 0 uncommitted code paths`);
  const suites = {};
  for (const [name, command, extraEnv] of SUITES) {
    const started = Date.now();
    const run = spawnSync("sh", ["-c", command], { stdio: "inherit", env: { ...process.env, ...extraEnv } });
    suites[name] = { exit: run.status ?? 1, ms: Date.now() - started };
    console.log(`battery-stamp: ${name} exit ${suites[name].exit} in ${Math.round(suites[name].ms / 1000)} s`);
    if (suites[name].exit !== 0) break;
  }
  const stamps = [...readStamps(root), { head, tree, at: new Date().toISOString(), suites }].slice(-20);
  mkdirSync(dirname(join(root, STAMP_FILE)), { recursive: true });
  writeFileSync(join(root, STAMP_FILE), `${JSON.stringify(stamps, null, 2)}\n`);
  const failed = Object.keys(suites).find((name) => suites[name].exit !== 0);
  const event = { event: "battery-stamp", check: "battery", exitCode: failed ? 1 : 0, meta: { tree, suites } };
  spawnSync(process.execPath, ["scripts/ledger.mjs", "emit", JSON.stringify(event)], { stdio: "ignore" });
  console.log(failed ? `Result: FAIL (${failed})` : `Result: PASS on tree ${tree.slice(0, 12)}`);
  process.exit(failed ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
