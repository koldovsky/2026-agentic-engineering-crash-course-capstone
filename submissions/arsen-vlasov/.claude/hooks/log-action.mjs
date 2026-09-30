#!/usr/bin/env node
/**
 * Appends one JSONL entry per hook event to .agent-log/actions.jsonl.
 * A PreToolUse without a matching PostToolUse means the action was proposed
 * but not carried out — stopped by a hook, a permission rule, or a human.
 * Runs on every tool call, so it must be silent and never throw.
 */
import { readFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

let payload;
try {
  payload = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}
if (!payload || typeof payload !== 'object') process.exit(0);

const input = payload.tool_input ?? {};
const target = String(
  input.command ?? input.file_path ?? input.path ?? input.pattern ?? input.url ?? '',
).slice(0, 200);

const entry = {
  ts: new Date().toISOString(),
  id: payload.tool_use_id ?? '',
  event: String(payload.hook_event_name ?? ''),
  tool: payload.tool_name ?? '',
  session: payload.session_id ?? '',
  target,
};

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const file = join(root, '.agent-log', 'actions.jsonl');
try {
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, JSON.stringify(entry) + '\n');
} catch {
  // never throw from a hook
}
process.exit(0);
