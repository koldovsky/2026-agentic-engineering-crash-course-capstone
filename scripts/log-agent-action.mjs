import { appendFileSync, mkdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

export const EVENTS = ["PreToolUse", "PostToolUse", "PostToolUseFailure"];
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isExitCode = (value) => Number.isInteger(value) && value >= 0;

// Parse only known result metadata. Tool output and error messages are never persisted.
export function exitCode(response) {
  if (isObject(response)) {
    const code = response.exit_code ?? response.exitCode ?? response.metadata?.exit_code;
    if (isExitCode(code)) return code;
    if (typeof response.output === "string") return exitCode(response.output);
    return null;
  }
  if (typeof response !== "string") return null;
  try {
    const parsed = JSON.parse(response);
    if (isObject(parsed)) return exitCode(parsed);
  } catch { /* A normal tool result can be plain text. */ }
  // Codex command output has a metadata header followed by "Final output:".
  // Never interpret a status-looking line from the command's own stdout.
  const end = response.indexOf("\nFinal output:");
  if (end < 0) return null;
  const match = /^Process exited with code (\d+)\s*$/m.exec(response.slice(0, end));
  return match ? Number(match[1]) : null;
}

function outcome(agent, event) {
  if (event.hook_event_name === "PreToolUse") return { status: "proposed", exit_code: null };
  if (agent === "claude" && event.hook_event_name === "PostToolUseFailure") {
    const match = /^Exit code (\d+)\b/.exec(event.error ?? "");
    return { status: event.is_interrupt ? "interrupted" : "failure", exit_code: match ? Number(match[1]) : null };
  }
  if (agent === "claude") return { status: "success", exit_code: 0 };
  const response = event.tool_response;
  if (isObject(response) && response.isError === true) return { status: "failure", exit_code: null };
  const code = exitCode(response);
  if (code !== null) return { status: code === 0 ? "success" : "failure", exit_code: code };
  if (event.tool_name === "apply_patch" && typeof response === "string" && response.startsWith("Success. Updated the following files:\n")) {
    return { status: "success", exit_code: 0 };
  }
  return { status: "unknown", exit_code: null };
}

function repoPath(value, root, cwd) {
  if (typeof value !== "string" || !value) return undefined;
  const base = typeof cwd === "string" ? resolve(root, cwd) : root;
  const path = relative(root, resolve(base, value.replaceAll("\\", "/")));
  if (path === ".." || path.startsWith(`..${sep}`) || resolve(root, path) === root) return undefined;
  return path.split(sep).join("/");
}

function commandKind(command) {
  if (typeof command !== "string") return undefined;
  const match = /^pnpm (check|typecheck|lint|build|test:unit|test:e2e|hooks:selftest)\s*$/.exec(command.trim());
  return match ? `pnpm ${match[1]}` : "shell";
}

export function normalize(agent, event, root) {
  if (!["claude", "codex"].includes(agent) || !isObject(event)) throw new Error("invalid event");
  if (!EVENTS.includes(event.hook_event_name) || (agent === "codex" && event.hook_event_name === "PostToolUseFailure")) throw new Error("unsupported event");
  for (const key of ["session_id", "tool_use_id", "tool_name"]) {
    if (typeof event[key] !== "string" || !event[key]) throw new Error("missing event identity");
  }
  const input = isObject(event.tool_input) ? event.tool_input : {};
  const paths = [input.file_path, input.notebook_path];
  if (agent === "codex" && event.tool_name === "apply_patch" && typeof input.command === "string") {
    for (const match of input.command.matchAll(/^\*\*\* (?:Add File|Update File|Delete File|Move to): ([^\r\n]+)\r?$/gm)) paths.push(match[1]);
  }
  const entry = {
    schema_version: 1,
    ts: new Date().toISOString(),
    agent,
    session_id: event.session_id,
    tool_use_id: event.tool_use_id,
    event: event.hook_event_name,
    tool: event.tool_name,
    ...outcome(agent, event),
    paths: [...new Set(paths.map((path) => repoPath(path, root, event.cwd)).filter(Boolean))],
  };
  if (["Bash", "exec_command", "shell_command"].includes(event.tool_name)) entry.command_kind = commandKind(input.command ?? input.cmd) ?? "shell";
  if (Number.isFinite(event.duration_ms) && event.duration_ms >= 0) entry.duration_ms = event.duration_ms;
  return entry;
}

export function appendEvent(root, entry) {
  const directory = resolve(root, ".agent-log");
  mkdirSync(directory, { recursive: true });
  // One append per event; concurrent hooks never rewrite the existing log.
  appendFileSync(resolve(directory, "actions.jsonl"), JSON.stringify(entry) + "\n", { mode: 0o600 });
}

export async function runHook(agent, root) {
  try {
    let raw = "";
    for await (const chunk of process.stdin) raw += chunk;
    appendEvent(root, normalize(agent, JSON.parse(raw), root));
  } catch {
    // Exit 1 reports a hook failure; exit 2 is reserved for policy denials.
    // Keep payloads, credentials, and raw exception messages out of diagnostics.
    process.stderr.write(`[agent-log] ${agent}: could not record event; run pnpm hooks:selftest.\n`);
    process.exitCode = 1;
  }
}
