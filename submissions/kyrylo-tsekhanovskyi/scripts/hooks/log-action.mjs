// PostToolUse hook: appends one JSON line per agent action to .agent-log/actions.jsonl (gitignored).
// The log feeds the "what the agent proposed and what was not executed" part of the autonomy log.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/proc.mjs';
import { readPayload } from './payload.mjs';

const payload = await readPayload();
const input = payload.toolInput;
const target = input.command ?? input.file_path ?? input.path ?? input.pattern ?? JSON.stringify(input);
const entry = {
  ts: new Date().toISOString(),
  tool: payload.tool,
  session: payload.session,
  agent: payload.agent,
  action: payload.toolName,
  target: String(target).slice(0, 300),
};
const dir = path.join(ROOT, '.agent-log');
fs.mkdirSync(dir, { recursive: true });
fs.appendFileSync(path.join(dir, 'actions.jsonl'), `${JSON.stringify(entry)}\n`);
