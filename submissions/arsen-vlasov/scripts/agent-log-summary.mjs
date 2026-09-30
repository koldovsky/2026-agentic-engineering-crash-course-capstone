#!/usr/bin/env node
/**
 * Summarises .agent-log/actions.jsonl.
 *
 * The column that matters is `blocked`: a PreToolUse with no matching PostToolUse or
 * PostToolUseFailure. Those are actions the agent proposed but could not carry out —
 * stopped by a hook, a permission rule, or a human answering the approval prompt.
 *
 * Usage: npm run agent:log [--since 2026-09-14] [--session <id>]
 */
import { readFileSync, existsSync } from 'node:fs';

const LOG = '.agent-log/actions.jsonl';
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};

if (!existsSync(LOG)) {
  console.log(`No log at ${LOG}. The hooks have not fired yet.`);
  process.exit(0);
}

const since = opt('since');
const session = opt('session');

const rows = readFileSync(LOG, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  })
  .filter(Boolean)
  .filter((r) => (since ? r.ts >= since : true))
  .filter((r) => (session ? r.session === session : true));

if (rows.length === 0) {
  console.log('Nothing matched the filter.');
  process.exit(0);
}

const byTool = new Map();
const finished = new Set(rows.filter((r) => r.event !== 'PreToolUse' && r.id).map((r) => r.id));
const blocked = [];

for (const r of rows) {
  const s = byTool.get(r.tool) ?? { proposed: 0, ok: 0, failed: 0, blocked: 0 };
  if (r.event === 'PreToolUse') {
    s.proposed += 1;
    if (r.id && !finished.has(r.id)) {
      s.blocked += 1;
      blocked.push(r);
    }
  } else if (r.event === 'PostToolUse') s.ok += 1;
  else if (r.event === 'PostToolUseFailure') s.failed += 1;
  byTool.set(r.tool, s);
}

const pad = (v, n) => String(v).padEnd(n);
console.log(`Log: ${rows.length} entries across ${new Set(rows.map((r) => r.session)).size} session(s)\n`);
console.log(`${pad('tool', 22)}${pad('proposed', 10)}${pad('ok', 6)}${pad('failed', 8)}blocked`);
console.log('-'.repeat(54));
for (const [tool, s] of [...byTool].sort((a, b) => b[1].proposed - a[1].proposed)) {
  console.log(`${pad(tool, 22)}${pad(s.proposed, 10)}${pad(s.ok, 6)}${pad(s.failed, 8)}${s.blocked || ''}`);
}

if (blocked.length) {
  console.log(`\nNot carried out (${blocked.length}) — proposed but stopped:`);
  for (const b of blocked) console.log(`  ${b.ts}  ${b.tool}: ${b.target}`);
} else {
  console.log('\nEvery proposed action was carried out.');
}
