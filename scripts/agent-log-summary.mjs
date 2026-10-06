import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EVENTS } from "./log-agent-action.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const key = (row) => JSON.stringify([row.agent, row.session_id, row.tool_use_id]);
const terminal = (row) => row.event === "PostToolUse" || row.event === "PostToolUseFailure";

function valid(row) {
  if (!row || row.schema_version !== 1 || !["claude", "codex"].includes(row.agent) || !EVENTS.includes(row.event)) return false;
  if (![row.session_id, row.tool_use_id, row.tool].every((value) => typeof value === "string" && value.length > 0)) return false;
  if (row.event === "PreToolUse") return row.status === "proposed" && row.exit_code === null;
  if (!["success", "failure", "unknown", "interrupted"].includes(row.status)) return false;
  if (row.exit_code !== null && (!Number.isInteger(row.exit_code) || row.exit_code < 0)) return false;
  return row.status !== "success" || row.exit_code === 0;
}

export function summarize(text) {
  const rows = [];
  const malformed = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    try {
      const row = JSON.parse(line);
      if (!valid(row)) throw new Error("invalid schema");
      rows.push(row);
    } catch { malformed.push(index + 1); }
  });
  const completedKeys = new Set(rows.filter(terminal).map(key));
  const groups = new Map();
  for (const row of rows) {
    const groupKey = JSON.stringify([row.agent, row.tool]);
    if (!groups.has(groupKey)) groups.set(groupKey, { agent: row.agent, tool: row.tool, proposed: 0, completed: 0, unmatched: 0, failed: 0, interrupted: 0, unknown: 0 });
    const group = groups.get(groupKey);
    if (row.event === "PreToolUse") {
      group.proposed++;
      if (!completedKeys.has(key(row))) group.unmatched++;
    } else {
      group.completed++;
      if (row.status === "failure") group.failed++;
      if (row.status === "interrupted") group.interrupted++;
      if (row.status === "unknown") group.unknown++;
    }
  }
  const totals = { proposed: 0, completed: 0, unmatched: 0, failed: 0, interrupted: 0, unknown: 0 };
  for (const group of groups.values()) for (const field of Object.keys(totals)) totals[field] += group[field];
  return {
    ...totals,
    sessions: new Set(rows.map((row) => JSON.stringify([row.agent, row.session_id]))).size,
    malformed,
    groups: [...groups.values()],
  };
}

// macOS may expose the same temporary directory through /var and /private/var.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const file = process.argv[2] ? resolve(process.argv[2]) : resolve(ROOT, ".agent-log/actions.jsonl");
    const summary = summarize(readFileSync(file, "utf8"));
    console.log(`Agent actions: ${summary.completed} completed, ${summary.unmatched} unmatched, ${summary.failed} failed, ${summary.interrupted} interrupted, ${summary.unknown} unknown — ${summary.sessions} session(s)`);
    console.table(summary.groups);
    if (summary.unmatched) console.log("Unmatched means pending or missing a terminal record; it is not proof of a blocked action.");
    if (summary.malformed.length) {
      console.error(`[agent-log] Invalid records on line(s): ${summary.malformed.join(", ")}. Counts are incomplete.`);
      process.exitCode = 1;
    }
  } catch {
    console.error("[agent-log] Cannot read the log. Run pnpm hooks:selftest and verify hook activation in both agents.");
    process.exitCode = 1;
  }
}
