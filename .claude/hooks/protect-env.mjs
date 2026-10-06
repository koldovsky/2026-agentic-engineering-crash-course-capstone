#!/usr/bin/env node
// Shared Claude Code / Codex PreToolUse guard. Exit 2 denies; exit 0 makes no decision.
// Inspect payloads only: never read target files, run commands, or echo their contents.
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const protectedPath = (path) => path.replaceAll("\\", "/").split("/").some((part) => part.toLowerCase().startsWith(".env"));
const BLOCKED = "[protect-env] Blocked: .env* paths are off limits, including examples and samples. Ask the user to manage these files.\n";
const INVALID = "[protect-env] Blocked: cannot validate the tool input. Repair the hook payload before retrying.\n";

export function denialReason(event) {
  if (!isObject(event) || typeof event.hook_event_name !== "string") throw new Error("Invalid event");
  if (event.hook_event_name !== "PreToolUse") return null;
  if (typeof event.tool_name !== "string" || !event.tool_name || !isObject(event.tool_input)) throw new Error("Invalid tool input");
  const input = event.tool_input;
  const paths = [];
  for (const key of ["file_path", "notebook_path", "path"]) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== "string" || !input[key]) throw new Error("Invalid path");
    paths.push(input[key]);
  }
  if (["Read", "Edit", "Write", "MultiEdit", "NotebookEdit"].includes(event.tool_name) && paths.length === 0) {
    throw new Error("Missing file path");
  }
  if (event.tool_name === "apply_patch") {
    // Codex exposes the raw patch in tool_input.command. Inspect both rename endpoints.
    if (typeof input.command !== "string") throw new Error("Missing patch");
    const targets = [...input.command.matchAll(/^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)\r?$/gm)];
    if (targets.length === 0) throw new Error("Missing patch targets");
    paths.push(...targets.map((match) => match[1].trim()));
  }
  if (paths.some(protectedPath)) return BLOCKED;
  if (["Bash", "exec_command", "shell_command"].includes(event.tool_name)) {
    const command = input.command ?? input.cmd;
    if (typeof command !== "string") throw new Error("Missing shell command");
    // Conservative literal check, not a shell parser. Encoded/dynamic paths are out of scope.
    if (/(^|[^a-z0-9_.-])\.env/i.test(command)) return BLOCKED;
  }
  return null;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let reason;
  try {
    let raw = "";
    for await (const chunk of process.stdin) raw += chunk;
    reason = denialReason(JSON.parse(raw));
  } catch {
    // A policy hook must deny malformed input rather than silently allow it.
    reason = INVALID;
  }
  if (reason) {
    process.stderr.write(reason);
    process.exitCode = 2;
  }
}
