#!/usr/bin/env node
// Self-test for the Claude Code hooks in .claude/hooks/ — no agent needed.
// Pipes realistic hook payloads through both scripts against a TEMP project dir and checks:
//   1. protect-env.mjs blocks Read/Edit/Write of .env, .env.local, .env.production (exit 2) and allows .env.example + normal files
//   2. log-action.mjs appends one JSON line per event (PreToolUse = proposed, Post* = executed) with repo-relative paths
//   3. a PreToolUse line without a Post line for the same id is reported as "proposed but not executed"
//   4. guard-scope.mjs blocks writes outside .agents/scope.json (exit 2), incl. ../ and symlink escapes; checks the real config too
// Usage: pnpm hooks:selftest
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const here = process.cwd();
const tmp = mkdtempSync(join(tmpdir(), "hooks-selftest-"));
const env = { ...process.env, CLAUDE_PROJECT_DIR: tmp };
const run = (script, payload) =>
  spawnSync(process.execPath, [join(here, ".claude", "hooks", script)], { input: JSON.stringify(payload), env, encoding: "utf8" });

let failed = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`);
  if (!ok) failed++;
};

const base = { session_id: "selftest-0001", cwd: tmp, permission_mode: "default" };

// 1. guard
for (const [tool, file, expect] of [
  ["Edit", join(tmp, ".env"), 2],
  ["Write", join(tmp, ".env.local"), 2],
  ["Read", tmp + "\\.env.production", 2],
  ["Edit", join(tmp, ".env.example"), 0],
  ["Read", join(tmp, "lib", "env.ts"), 0],
]) {
  const r = run("protect-env.mjs", { ...base, hook_event_name: "PreToolUse", tool_name: tool, tool_input: { file_path: file } });
  check(`protect-env ${tool} ${file.split(/[\\/]/).pop()} -> exit ${expect}`, r.status === expect, r.status === 2 ? r.stderr.trim() : "");
}

// 2. logger: a proposed+executed Bash, a proposed+executed Edit, a proposed+failed Bash, a proposed-only Edit (blocked)
const events = [
  { ...base, hook_event_name: "PreToolUse", tool_use_id: "t1", tool_name: "Bash", tool_input: { command: "pnpm check" } },
  { ...base, hook_event_name: "PostToolUse", tool_use_id: "t1", tool_name: "Bash", tool_input: { command: "pnpm check" }, tool_response: { stdout: "ok" }, duration_ms: 4200 },
  { ...base, hook_event_name: "PreToolUse", tool_use_id: "t2", tool_name: "Edit", tool_input: { file_path: join(tmp, "app", "page.tsx") } },
  { ...base, hook_event_name: "PostToolUse", tool_use_id: "t2", tool_name: "Edit", tool_input: { file_path: join(tmp, "app", "page.tsx") }, duration_ms: 15 },
  { ...base, hook_event_name: "PreToolUse", tool_use_id: "t3", tool_name: "Bash", tool_input: { command: "pnpm typecheck" } },
  { ...base, hook_event_name: "PostToolUseFailure", tool_use_id: "t3", tool_name: "Bash", tool_input: { command: "pnpm typecheck" }, error: "Exit code 2\nerror TS2339", duration_ms: 900 },
  { ...base, hook_event_name: "PreToolUse", tool_use_id: "t4", tool_name: "Edit", tool_input: { file_path: join(tmp, ".env") } },
];
for (const e of events) {
  const r = run("log-action.mjs", e);
  check(`log-action ${e.hook_event_name} ${e.tool_name} exits 0 silently`, r.status === 0 && r.stdout === "");
}
const lines = readFileSync(join(tmp, ".agent-log", "actions.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
check("log has 7 lines", lines.length === 7);
check("PreToolUse line has no exit field", lines[0].event === "PreToolUse" && !("exit" in lines[0]) && lines[0].id === "t1");
check("PostToolUse Bash keeps cmd and exit 0", lines[1].cmd === "pnpm check" && lines[1].exit === 0 && lines[1].ms === 4200);
check("Edit line stores repo-relative path", lines[3].path === "app/page.tsx", lines[3].path);
check("failure line carries exit code 2", lines[5].exit === 2);

// 3. summary pairs Pre/Post by id
const executedIds = new Set(lines.filter((l) => l.event !== "PreToolUse").map((l) => l.id));
const proposedOnly = lines.filter((l) => l.event === "PreToolUse" && !executedIds.has(l.id));
check("exactly one proposed-but-not-executed action (.env edit)", proposedOnly.length === 1 && proposedOnly[0].path === ".env");
const summary = spawnSync(process.execPath, [join(here, "scripts", "agent-log-summary.mjs"), join(tmp, ".agent-log", "actions.jsonl")], { encoding: "utf8" });
check("agent-log-summary reports 1 proposed but not executed", summary.status === 0 && /1 proposed but not executed/.test(summary.stdout));

// 4. guard-scope: generic write-scope guard (config: <project>/.agents/scope.json)
const guard = (payload, projectDir = tmp) =>
  spawnSync(process.execPath, [join(here, ".claude", "hooks", "guard-scope.mjs")], {
    input: JSON.stringify(payload),
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    encoding: "utf8",
  });
const write = (file, cwd = tmp) => ({ ...base, cwd, hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: file } });
const outside = mkdtempSync(join(tmpdir(), "hooks-selftest-outside-"));
symlinkSync(outside, join(tmp, "escape-link"));
// 4a. no config -> the project dir is the scope
for (const [name, payload, expect] of [
  ["write inside project", write(join(tmp, "docs", "new", "a.md")), 0],
  ["relative path inside project", write("app/page.tsx"), 0],
  ["write outside project (absolute)", write(join(outside, "x.md")), 2],
  ["write outside via ../", write(join(tmp, "..", "README.md")), 2],
  ["relative ../../README.md", write("../../README.md"), 2],
  ["write through a symlink that points outside", write(join(tmp, "escape-link", "x.md")), 2],
  ["NotebookEdit outside", { ...base, hook_event_name: "PreToolUse", tool_name: "NotebookEdit", tool_input: { notebook_path: join(outside, "n.ipynb") } }, 2],
  ["tool without a path (Bash) is ignored", { ...base, hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "ls" } }, 0],
]) {
  const r = guard(payload);
  check(`guard-scope ${name} -> exit ${expect}`, r.status === expect, r.status === 2 ? r.stderr.trim() : "");
}
// 4b. config with allow + deny
mkdirSync(join(tmp, ".agents"), { recursive: true });
writeFileSync(join(tmp, ".agents", "scope.json"), JSON.stringify({ allow: ["app", "docs"], deny: [{ path: "docs/private", reason: "human only" }] }));
for (const [name, file, expect] of [
  ["allow list: app/ ok", join(tmp, "app", "x.tsx"), 0],
  ["allow list: lib/ not allowed", join(tmp, "lib", "x.ts"), 2],
  ["deny wins inside allow", join(tmp, "docs", "private", "x.md"), 2],
]) {
  const r = guard(write(file));
  check(`guard-scope ${name} -> exit ${expect}`, r.status === expect, r.status === 2 ? r.stderr.trim() : "");
}
// 4c. broken config fails closed
writeFileSync(join(tmp, ".agents", "scope.json"), "{ not json");
check("guard-scope broken config -> exit 2 (fail closed)", guard(write(join(tmp, "app", "x.tsx"))).status === 2);
// 4d. the REAL config of this project
for (const [name, rel, expect] of [
  ["real config: app/page.tsx", "app/page.tsx", 0],
  ["real config: docs/PRD.md", "docs/PRD.md", 0],
  ["real config: ../../README.md (course root)", "../../README.md", 2],
  ["real config: ../../.github/x.md", "../../.github/x.md", 2],
  ["real config: .claude/hooks (generated copy)", ".claude/hooks/guard-scope.mjs", 2],
  ["real config: .agents/scope.json (human only)", ".agents/scope.json", 2],
  ["real config: .agents/hooks (source of truth)", ".agents/hooks/new-hook.mjs", 0],
]) {
  const r = guard(write(join(here, rel), here), here);
  check(`guard-scope ${name} -> exit ${expect}`, r.status === expect, r.status === 2 ? r.stderr.trim() : "");
}
rmSync(outside, { recursive: true, force: true });

rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n${failed} check(s) failed` : "\nall hook checks passed");
process.exit(failed ? 1 : 0);
