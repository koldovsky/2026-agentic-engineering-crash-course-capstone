#!/usr/bin/env node
// Claude Code PreToolUse hook (matcher: Write|Edit|MultiEdit|NotebookEdit) — generic write-scope guard.
//
// The agent may WRITE only inside the "allow" paths and never inside the "deny" paths of
// <project>/.agents/scope.json. Paths in the config are relative to the project dir
// (CLAUDE_PROJECT_DIR = the folder where `claude` was started). Reads are not limited.
// No config file -> allow = ["."] (the project dir), deny = [].
//
// Exit 2 = the tool call is BLOCKED and stderr goes back to the agent as the reason.
// PreToolUse hooks run in every permission mode (even bypassPermissions): the rule in AGENTS.md
// explains, this hook enforces. Symlinks and "../" are resolved before the check.
// Limits: Bash commands are not parsed (a shell redirect can still write anywhere) — pair with
// permissions.deny rules if you need that.
//
// Canonical copy: .agents/hooks/guard-scope.mjs -> synced to .claude/hooks/ by scripts/agents-sync.mjs.
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

let raw = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) raw += chunk;

let ev;
try {
  ev = JSON.parse(raw || "{}");
} catch {
  process.exit(0); // not a hook payload we understand: never break the session
}

const ti = ev.tool_input ?? {};
const target = ti.file_path ?? ti.notebook_path;
if (typeof target !== "string" || target === "") process.exit(0);

const block = (msg) => {
  process.stderr.write(`Blocked by scope guard: ${msg}\n`);
  process.exit(2);
};

// Real path of p, even when p does not exist yet: resolve symlinks of the nearest existing ancestor.
const real = (p) => {
  let cur = resolve(p);
  const tail = [];
  while (!existsSync(cur)) {
    const up = dirname(cur);
    if (up === cur) return resolve(p);
    tail.unshift(basename(cur));
    cur = up;
  }
  return join(realpathSync(cur), ...tail);
};
const within = (abs, base) => {
  const r = relative(base, abs);
  return r === "" || (r !== ".." && !r.startsWith(".." + sep) && !isAbsolute(r));
};

const root = real(process.env.CLAUDE_PROJECT_DIR || ev.cwd || process.cwd());
const cfgPath = join(root, ".agents", "scope.json");
let cfg = { allow: ["."], deny: [] };
if (existsSync(cfgPath)) {
  try {
    cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
  } catch (e) {
    block(`${cfgPath} is not valid JSON (${e.message}). Ask the human to fix it.`); // fail closed
  }
}
const entries = (list) =>
  (Array.isArray(list) ? list : []).map((e) => (typeof e === "string" ? { path: e } : e)).filter((e) => e && e.path);
const allow = entries(cfg.allow ?? ["."]).map((e) => ({ ...e, abs: real(resolve(root, e.path)) }));
const deny = entries(cfg.deny).map((e) => ({ ...e, abs: real(resolve(root, e.path)) }));

const abs = real(isAbsolute(target) ? target : resolve(ev.cwd || root, target));
const shown = within(abs, root) ? relative(root, abs).split(sep).join("/") || "." : abs;

if (!allow.some((e) => within(abs, e.abs))) {
  block(
    `${shown} is outside the write scope (${allow.map((e) => e.path).join(", ")} of ${root}). ` +
      `The scope is set in .agents/scope.json. Do not work around this; ask the human if the file really must change.`,
  );
}
const hit = deny.find((e) => within(abs, e.abs));
if (hit) block(`${shown} is protected (${hit.path}). ${hit.reason ?? "Ask the human."}`);
process.exit(0);
