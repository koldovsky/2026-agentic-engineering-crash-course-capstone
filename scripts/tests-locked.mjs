#!/usr/bin/env node
// Red → green guard for OpenSpec changes. For every active change in openspec/changes/ (not archive/):
//   1. find its red commits: `test(<change>): ...` (Conventional Commits scope = change name)
//   2. lock every test file those commits added or modified (*.test.ts(x), e2e/**)
//   3. fail if any locked file differs from the latest red commit (committed, staged or unstaged)
// New test files are allowed. A change with no red commit yet is skipped. Archiving the change releases the lock.
// To change a locked test on purpose: update the spec (/opsx:update), then make a new `test(<change>):` commit.
// Usage: pnpm tests:locked
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const git = (...args) => {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr.trim()}`);
  return r.stdout.split("\n").filter(Boolean);
};
const isTest = (file) => /\.test\.tsx?$/.test(file) || file.startsWith("e2e/");

const changesDir = join(root, "openspec", "changes");
const changes = existsSync(changesDir)
  ? readdirSync(changesDir).filter((n) => n !== "archive" && statSync(join(changesDir, n)).isDirectory())
  : [];

let violations = 0;
for (const change of changes) {
  const escaped = change.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const reds = git("log", "--format=%H", "-E", `--grep=^test\\(${escaped}\\)!?: `, "HEAD");
  if (reds.length === 0) {
    console.log(`skip    ${change}: no red commit yet`);
    continue;
  }
  const locked = [
    ...new Set(reds.flatMap((sha) => git("show", "--format=", "--name-only", "--diff-filter=AM", sha)).filter(isTest)),
  ];
  const latest = reds[0];
  const changed = locked.length ? git("diff", "--name-only", latest, "--", ...locked) : [];
  for (const file of changed) console.error(`LOCKED  ${change}: ${file} changed since red commit ${latest.slice(0, 7)}`);
  violations += changed.length;
  if (!changed.length) console.log(`ok      ${change}: ${locked.length} locked test file(s) unchanged since ${latest.slice(0, 7)}`);
}

if (violations) {
  console.error(`\n${violations} locked test file(s) modified. Revert them, or update the spec and make a new test(<change>): commit.`);
  process.exit(1);
}
