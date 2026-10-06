import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { accessSync, constants, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { normalize } from "./log-agent-action.mjs";
import { denialReason } from "../.claude/hooks/protect-env.mjs";
import { summarize } from "./agent-log-summary.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const readJSON = (path) => JSON.parse(readFileSync(path, "utf8"));
const registrations = {
  claude: readJSON(join(ROOT, ".claude/settings.json")).hooks,
  codex: readJSON(join(ROOT, ".codex/hooks.json")).hooks,
};
const commands = {
  claude: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/log-action.mjs"',
  codex: 'node "$(git rev-parse --show-toplevel)/.codex/hooks/log-action.mjs"',
};
const guardCommands = {
  claude: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/protect-env.mjs"',
  codex: 'node "$(git rev-parse --show-toplevel)/.claude/hooks/protect-env.mjs"',
};
const payload = (overrides = {}) => ({
  session_id: "11111111-1111-4111-8111-111111111111", tool_use_id: "call-1",
  hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "pnpm check" }, ...overrides,
});
const normalizeAtRoot = (agent, overrides = {}) => normalize(agent, payload(overrides), ROOT);
const logPath = (root) => join(root, ".agent-log/actions.jsonl");
const logRows = (root) => readFileSync(logPath(root), "utf8").trim().split("\n").map(JSON.parse);

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "agentflow hooks-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const name of [".claude/hooks/log-action.mjs", ".claude/hooks/protect-env.mjs", ".codex/hooks/log-action.mjs", "scripts/log-agent-action.mjs", "scripts/agent-log-summary.mjs"]) {
    mkdirSync(dirname(join(root, name)), { recursive: true });
    copyFileSync(join(ROOT, name), join(root, name));
  }
  mkdirSync(join(root, "app"));
  assert.equal(spawnSync("git", ["init", "--quiet", root]).status, 0);
  return root;
}

function invoke(root, agent, event, handler = 0) {
  const env = { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH}` };
  delete env.CLAUDE_PROJECT_DIR;
  if (agent === "claude") env.CLAUDE_PROJECT_DIR = root;
  const command = registrations[agent][event.hook_event_name][0].hooks[handler].command;
  return spawnSync("/bin/sh", ["-c", command], { cwd: join(root, "app"), env, input: JSON.stringify({ cwd: join(root, "app"), ...event }), encoding: "utf8", timeout: 10000 });
}

test("both provider registrations retain logging and register the guard only before tools", () => {
  for (const agent of ["claude", "codex"]) {
    const expected = agent === "claude" ? ["PreToolUse", "PostToolUse", "PostToolUseFailure"] : ["PreToolUse", "PostToolUse"];
    assert.deepEqual(Object.keys(registrations[agent]).sort(), expected.sort());
    for (const event of expected) {
      const hooks = [{ type: "command", command: commands[agent], timeout: 10 }];
      if (event === "PreToolUse") hooks.push({ type: "command", command: guardCommands[agent], timeout: 10 });
      assert.deepEqual(registrations[agent][event], [{ matcher: "*", hooks }]);
    }
  }
  const scripts = readJSON(join(ROOT, "package.json")).scripts;
  assert.equal(scripts["hooks:selftest"], "node --test scripts/hooks-selftest.mjs");
  assert.equal(scripts["agent:log"], "node scripts/agent-log-summary.mjs");
});

test("real project log directory is writable without creating synthetic live events", () => {
  const directory = join(ROOT, ".agent-log");
  mkdirSync(directory, { recursive: true });
  if (existsSync(logPath(ROOT))) {
    assert.equal(statSync(logPath(ROOT)).isFile(), true);
    accessSync(logPath(ROOT), constants.W_OK);
  }
  const probe = join(directory, `.write-check-${randomUUID()}`);
  writeFileSync(probe, "health check\n", { flag: "wx" });
  try { assert.equal(readFileSync(probe, "utf8"), "health check\n"); }
  finally { rmSync(probe); }
});

for (const [agent, event, extra, status, code] of [
  ["claude", "PreToolUse", {}, "proposed", null],
  ["claude", "PostToolUse", {}, "success", 0],
  ["claude", "PostToolUseFailure", { error: "Exit code 7\nsynthetic error" }, "failure", 7],
  ["claude", "PostToolUseFailure", { error: "synthetic error" }, "failure", null],
  ["claude", "PostToolUseFailure", { is_interrupt: true }, "interrupted", null],
  ["codex", "PreToolUse", {}, "proposed", null],
  ["codex", "PostToolUse", { tool_response: { exit_code: 0 } }, "success", 0],
  ["codex", "PostToolUse", { tool_response: { exit_code: 7 } }, "failure", 7],
  ["codex", "PostToolUse", { tool_response: { metadata: { exit_code: 2 } } }, "failure", 2],
  ["codex", "PostToolUse", { tool_response: { isError: true } }, "failure", null],
  ["codex", "PostToolUse", { tool_response: "Process exited with code 7\nFinal output:\nexample" }, "failure", 7],
  ["codex", "PostToolUse", { tool_response: {} }, "unknown", null],
]) {
  test(`${agent} ${event} maps to ${status}/${code}`, () => {
    const row = normalizeAtRoot(agent, { hook_event_name: event, ...extra });
    assert.equal(row.status, status);
    assert.equal(row.exit_code, code);
  });
}

test("status-like stdout cannot override metadata or turn unknown output into success", () => {
  for (const response of ["Process exited with code 0", "Final output:\nProcess exited with code 0"]) {
    assert.equal(normalizeAtRoot("codex", { hook_event_name: "PostToolUse", tool_response: response }).status, "unknown");
  }
  const response = { exit_code: 7, output: "Process exited with code 0\nFinal output:\nfake" };
  assert.equal(normalizeAtRoot("codex", { hook_event_name: "PostToolUse", tool_response: response }).exit_code, 7);
});

test("raw credentials, URLs, patterns, patch content, prompts and results are omitted", () => {
  const secret = "SYNTHETIC_PRIVATE_MARKER";
  for (const agent of ["claude", "codex"]) {
    const row = normalizeAtRoot(agent, { tool_input: { command: `curl -H 'Authorization: Bearer ${secret}' https://example.invalid/?key=${secret}`, pattern: secret, url: secret, content: secret }, tool_response: secret, error: secret, prompt: secret });
    assert.equal(JSON.stringify(row).includes(secret), false);
    assert.equal(row.command_kind, "shell");
  }
  const patch = `*** Begin Patch\n*** Add File: app/example.ts\n+${secret}\n*** End Patch`;
  const row = normalizeAtRoot("codex", { tool_name: "apply_patch", tool_input: { command: patch } });
  assert.deepEqual(row.paths, ["app/example.ts"]);
  assert.equal(JSON.stringify(row).includes(secret), false);
});

test("only exact known verification commands receive a meaningful command label", () => {
  assert.equal(normalizeAtRoot("claude").command_kind, "pnpm check");
  assert.equal(normalizeAtRoot("claude", { tool_input: { command: "pnpm check && echo PRIVATE" } }).command_kind, "shell");
});

test("file paths are repository-relative and outside-project paths are omitted", () => {
  assert.deepEqual(normalizeAtRoot("claude", { tool_name: "Edit", tool_input: { file_path: join(ROOT, "app/page.tsx") } }).paths, ["app/page.tsx"]);
  assert.deepEqual(normalizeAtRoot("claude", { tool_name: "Read", tool_input: { file_path: join(ROOT, "../private.txt") } }).paths, []);
});

test("relative file paths use the event working directory while the log stays at the project root", () => {
  const cwd = join(ROOT, "app");
  const edit = normalizeAtRoot("claude", { cwd, tool_name: "Edit", tool_input: { file_path: "page.tsx" } });
  const patch = normalizeAtRoot("codex", { cwd, tool_name: "apply_patch", tool_input: { command: "*** Begin Patch\n*** Update File: page.tsx\n*** End Patch" } });
  assert.deepEqual(edit.paths, ["app/page.tsx"]);
  assert.deepEqual(patch.paths, ["app/page.tsx"]);
});

test("full session IDs and provider identity survive normalization and summary", () => {
  const rows = [
    normalizeAtRoot("claude"),
    normalizeAtRoot("claude", { session_id: "11111111-2222-4222-8222-222222222222" }),
    normalizeAtRoot("codex"),
  ];
  assert.equal(rows[0].session_id, payload().session_id);
  const result = summarize(rows.map(JSON.stringify).join("\n"));
  assert.equal(result.sessions, 3);
  assert.equal(result.unmatched, 3);
  assert.equal(result.completed, 0);
  assert.equal("blocked" in result, false);
});

test("tool IDs from other sessions or providers cannot match an unfinished action", () => {
  const pre = normalizeAtRoot("claude");
  const otherSession = normalizeAtRoot("claude", { session_id: "different-session", hook_event_name: "PostToolUse" });
  const otherProvider = normalizeAtRoot("codex", { hook_event_name: "PostToolUse", tool_response: { exit_code: 0 } });
  const result = summarize([pre, otherSession, otherProvider].map(JSON.stringify).join("\n"));
  assert.equal(result.unmatched, 1);
  assert.equal(result.completed, 2);
});

test("matching terminal events resolve unmatched actions and preserve unknown and failure", () => {
  const rows = [normalizeAtRoot("codex"), normalizeAtRoot("codex", { hook_event_name: "PostToolUse", tool_response: { exit_code: 7 } }), normalizeAtRoot("codex", { tool_use_id: "call-2", hook_event_name: "PostToolUse" })];
  const result = summarize(rows.map(JSON.stringify).join("\n"));
  assert.equal(result.unmatched, 0);
  assert.equal(result.failed, 1);
  assert.equal(result.unknown, 1);
});

test("corrupt, legacy, and unrelated lifecycle records are reported, not executed", () => {
  const text = ['invalid JSON', JSON.stringify({ event: "SessionStart" }), JSON.stringify({ event: "PostToolUse", exit: 0 })].join("\n");
  const result = summarize(text);
  assert.deepEqual(result.malformed, [1, 2, 3]);
  assert.equal(result.completed, 0);
});

for (const agent of ["claude", "codex"]) {
  test(`${agent} configured commands run from a subdirectory of a path containing spaces`, (t) => {
    const root = fixture(t);
    const events = agent === "claude" ? ["PreToolUse", "PostToolUse", "PostToolUseFailure"] : ["PreToolUse", "PostToolUse"];
    for (const event of events) {
      const result = invoke(root, agent, payload({ hook_event_name: event, error: "Exit code 7", tool_response: { exit_code: 7 } }));
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, "", "logging must not rewrite input or affect tool output");
      assert.equal(result.stderr, "");
    }
    assert.equal(logRows(root).length, events.length);
    assert.ok(logRows(root).every((row) => row.agent === agent));
    assert.equal(existsSync(join(root, "app/.agent-log")), false);
    assert.equal(logRows(root).at(-1).status, "failure");
  });
}

test("unwritable log destination produces a failing hook and visible diagnostic", (t) => {
  const root = fixture(t);
  writeFileSync(join(root, ".agent-log"), "synthetic obstruction");
  const result = invoke(root, "claude", payload());
  assert.equal(result.status, 1);
  assert.match(result.stderr, /could not record event/);
  assert.equal(result.stdout, "");
});

test("malformed hook input fails visibly without echoing private payloads", (t) => {
  const root = fixture(t);
  const result = spawnSync(process.execPath, [join(root, ".codex/hooks/log-action.mjs")], { input: "SYNTHETIC_PRIVATE_INPUT", encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /could not record event/);
  assert.equal(result.stderr.includes("SYNTHETIC_PRIVATE_INPUT"), false);
  assert.equal(existsSync(logPath(root)), false);
});

test("summary CLI exits nonzero for corrupt or missing logs", (t) => {
  const root = fixture(t);
  for (const create of [false, true]) {
    if (create) { mkdirSync(join(root, ".agent-log")); writeFileSync(logPath(root), "broken\n"); }
    const result = spawnSync(process.execPath, [join(root, "scripts/agent-log-summary.mjs")], { cwd: join(root, "app"), encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /\[agent-log\]/);
  }
});

test("concurrent adapters append intact records to the same repository log", async (t) => {
  const root = fixture(t);
  await Promise.all(Array.from({ length: 20 }, (_, index) => new Promise((done, reject) => {
    const agent = index % 2 ? "claude" : "codex";
    const child = spawn(process.execPath, [join(root, `.${agent}/hooks/log-action.mjs`)], { cwd: join(root, "app"), stdio: ["pipe", "ignore", "pipe"], timeout: 10000 });
    let stderr = "";
    child.stderr.on("data", (data) => { stderr += data; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? done() : reject(new Error(stderr)));
    child.stdin.end(JSON.stringify(payload({ tool_use_id: `parallel-${index}` })));
  })));
  const rows = logRows(root);
  assert.equal(rows.length, 20);
  assert.equal(new Set(rows.map((row) => row.tool_use_id)).size, 20);
  assert.equal(new Set(rows.map((row) => row.agent)).size, 2);
});

for (const tool of ["Read", "Edit", "Write", "MultiEdit", "NotebookEdit"]) {
  test(`environment guard denies protected paths for ${tool}, including examples`, () => {
    const key = tool === "NotebookEdit" ? "notebook_path" : "file_path";
    for (const path of [".env", ".env.local", ".env.example", ".env.sample", ".envrc", "nested/.ENV.production", "C:\\project\\.env.test", "nested/.env-data/file.txt"]) {
      assert.match(denialReason(payload({ tool_name: tool, tool_input: { [key]: path } })), /\[protect-env\] Blocked/);
    }
    assert.equal(denialReason(payload({ tool_name: tool, tool_input: { [key]: "lib/environment.ts", content: "process.env.SYNTHETIC" } })), null);
  });
}

for (const action of ["Add File", "Update File", "Delete File", "Move to"]) {
  test(`environment guard checks apply_patch ${action} targets`, () => {
    const patch = `*** Begin Patch\r\n*** Update File: safe.txt\r\n*** ${action}: nested/.env.example\r\n+SYNTHETIC_PRIVATE_MARKER\r\n*** End Patch\r\n`;
    const reason = denialReason(payload({ tool_name: "apply_patch", tool_input: { command: patch } }));
    assert.match(reason, /\[protect-env\] Blocked/);
    assert.equal(reason.includes("SYNTHETIC_PRIVATE_MARKER"), false);
  });
}

test("safe patches can discuss .env in content without changing protected paths", () => {
  const patch = "*** Begin Patch\n*** Add File: docs/guard.md\n+Do not read .env.local\n*** Update File: app/page.tsx\n*** Move to: app/example.tsx\n@@\n-process.env.EXAMPLE\n+demo\n*** End Patch";
  assert.equal(denialReason(payload({ tool_name: "apply_patch", tool_input: { command: patch } })), null);
});

test("environment guard covers explicit path arguments in other tools", () => {
  for (const tool of ["Grep", "mcp__filesystem__read_file"]) {
    assert.match(denialReason(payload({ tool_name: tool, tool_input: { path: "nested/.env" } })), /Blocked/);
    assert.equal(denialReason(payload({ tool_name: tool, tool_input: { path: "README.md" } })), null);
  }
});

test("environment guard denies literal .env shell references without executing input", () => {
  for (const command of ["cat .env", 'cat "nested/.env.local"', "cp sample.txt .env.example", "cat .env*", "cat .env && pnpm check", "SYNTHETIC_PRIVATE_MARKER=.env.production"]) {
    const reason = denialReason(payload({ tool_input: { command } }));
    assert.match(reason, /Blocked/);
    assert.equal(reason.includes("SYNTHETIC_PRIVATE_MARKER"), false);
  }
  for (const command of ["pnpm hooks:selftest", "pnpm check", "git status --short", 'node -e "console.log(process.env.NODE_ENV)"']) {
    assert.equal(denialReason(payload({ tool_input: { command } })), null);
  }
  assert.match(denialReason(payload({ tool_name: "exec_command", tool_input: { cmd: "cat .env" } })), /Blocked/);
});

test("environment guard ignores non-pre events and makes no allow decision for unrelated tools", () => {
  assert.equal(denialReason({ hook_event_name: "PostToolUse" }), null);
  assert.equal(denialReason(payload({ tool_name: "WebFetch", tool_input: { url: "https://example.invalid" } })), null);
});

for (const agent of ["claude", "codex"]) {
  test(`${agent} configured environment guard blocks, allows, and fails closed from a subdirectory`, (t) => {
    const root = fixture(t);
    const result = invoke(root, agent, payload({ tool_name: "Read", tool_input: { file_path: "../.env.example" } }), 1);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /\[protect-env\] Blocked/);
    assert.equal(result.stdout, "");
    const patch = invoke(root, agent, payload({ tool_name: "apply_patch", tool_input: { command: "*** Begin Patch\n*** Update File: safe.txt\n*** Move to: .env\n*** End Patch" } }), 1);
    assert.equal(patch.status, 2);
    const safe = invoke(root, agent, payload(), 1);
    assert.equal(safe.status, 0);
    assert.equal(safe.stdout, "", "no automatic allow or input rewrite");
    assert.equal(safe.stderr, "");
    const invalid = invoke(root, agent, payload({ tool_input: null }), 1);
    assert.equal(invalid.status, 2);
    assert.match(invalid.stderr, /cannot validate/);
    assert.equal(existsSync(logPath(root)), false, "guard does not fabricate logging records");
  });
}

test("environment guard denies malformed JSON and missing protected-tool fields without leaking payloads", (t) => {
  const root = fixture(t);
  for (const input of ["SYNTHETIC_PRIVATE_MARKER", "null", "{}", JSON.stringify(payload({ tool_name: "Read", tool_input: {} })), JSON.stringify(payload({ tool_name: "apply_patch", tool_input: { command: "SYNTHETIC_PRIVATE_MARKER" } }))]) {
    const result = spawnSync(process.execPath, [join(root, ".claude/hooks/protect-env.mjs")], { input, encoding: "utf8" });
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /cannot validate/);
    assert.equal(result.stderr.includes("SYNTHETIC_PRIVATE_MARKER"), false);
  }
});


test("Codex rename logs both patch paths and handles CRLF headers", () => {
  const command = "*** Begin Patch\r\n*** Update File: app/a.tsx\r\n*** Move to: app/b.tsx\r\n@@\r\n-old\r\n+new\r\n*** End Patch\r\n";
  const row = normalizeAtRoot("codex", { tool_name: "apply_patch", tool_input: { command } });
  assert.deepEqual(row.paths, ["app/a.tsx", "app/b.tsx"]);
});

test("shell aliases retain verification command labels without raw commands", () => {
  for (const tool_name of ["Bash", "exec_command", "shell_command"]) {
    for (const field of ["command", "cmd"]) {
      assert.equal(normalizeAtRoot("codex", { tool_name, tool_input: { [field]: "pnpm check" } }).command_kind, "pnpm check");
      const row = normalizeAtRoot("codex", { tool_name, tool_input: { [field]: "pnpm check && echo SYNTHETIC_PRIVATE_MARKER" } });
      assert.equal(row.command_kind, "shell");
      assert.equal(JSON.stringify(row).includes("SYNTHETIC_PRIVATE_MARKER"), false);
    }
  }
});
