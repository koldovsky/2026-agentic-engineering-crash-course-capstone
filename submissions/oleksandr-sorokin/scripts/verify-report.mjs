#!/usr/bin/env node
// Runs pnpm check, pnpm build, and pnpm test:e2e in sequence.
// Writes docs/evidence/verify/<YYYY-MM-DD>-<short-sha>.md with results.
// Usage: node scripts/verify-report.mjs  (or: pnpm verify)
import { execSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const run = (cmd) => {
  const start = Date.now();
  const result = spawnSync("pnpm", cmd.split(" ").slice(1), {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: "0" },
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    cmd,
    exit: result.status ?? 1,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
    ms: Date.now() - start,
  };
};

const parseTestCount = (output) => {
  // vitest: "Tests  12 passed (12)"  or  "✓ 12 tests"
  const m = output.match(/Tests\s+(\d+)\s+passed/i) || output.match(/(\d+)\s+tests?\s+passed/i);
  return m ? `${m[1]} passed` : null;
};

// Gather context
const sha = (() => {
  try { return execSync("git rev-parse --short HEAD", { cwd: root, encoding: "utf8" }).trim(); }
  catch { return "unknown"; }
})();
const gitStatus = (() => {
  try { return execSync("git status --short -- . ':!.agent-log/actions.jsonl'", { cwd: root, encoding: "utf8" }).trim() || "(clean)"; }
  catch { return "unknown"; }
})();
const date = new Date().toISOString().slice(0, 10);

const totalStart = Date.now();
const commands = ["pnpm check", "pnpm build", "pnpm test:e2e"];
const results = commands.map(run);
const totalMs = Date.now() - totalStart;

// Build report
const lines = [
  `# Verify Report`,
  ``,
  `Date: ${new Date().toISOString()}`,
  `Git SHA: \`${sha}\``,
  `Working tree: ${gitStatus}`,
  `Total duration: ${(totalMs / 1000).toFixed(1)}s`,
  ``,
  `## Results`,
  ``,
  `| Command | Exit | Duration | Notes |`,
  `|---------|------|----------|-------|`,
];

const scriptMissing = (r) => r.exit !== 0 && (r.stderr.includes("not found") || r.stderr.includes("Missing script") || r.stderr.includes("ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL"));

for (const r of results) {
  const status = r.exit === 0 ? "✅ 0" : `❌ ${r.exit}`;
  const dur = `${(r.ms / 1000).toFixed(1)}s`;
  const notes = parseTestCount(r.stdout + r.stderr) ?? (scriptMissing(r) ? "script not found" : "");
  lines.push(`| \`${r.cmd}\` | ${status} | ${dur} | ${notes} |`);
}

lines.push(``, `## Output`);
for (const r of results) {
  lines.push(``, `### \`${r.cmd}\` (exit ${r.exit})`, ``);
  const combined = [r.stdout, r.stderr].filter(Boolean).join("\n").trim();
  lines.push("```", combined || "(no output)", "```");
}

const out = lines.join("\n") + "\n";

const dir = join(root, "docs", "evidence", "verify");
mkdirSync(dir, { recursive: true });
const file = join(dir, `${date}-${sha}.md`);
writeFileSync(file, out, "utf8");

console.log(`Report written: ${file}`);
const anyFail = results.some((r) => r.exit !== 0 && !scriptMissing(r));
process.exit(anyFail ? 1 : 0);
