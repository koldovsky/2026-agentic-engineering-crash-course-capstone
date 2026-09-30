#!/usr/bin/env node
/**
 * Renders a report for one session from .agent-log/actions.jsonl.
 *
 * The journal is written by the PreToolUse / PostToolUse / PostToolUseFailure hooks in
 * .claude/hooks/log-action.mjs. Only what the hooks recorded appears here — this script
 * never infers anything.
 *
 * Usage:
 *   node .claude/skills/agent-log-report/scripts/report.mjs            # latest session
 *   node .claude/skills/agent-log-report/scripts/report.mjs --session <id>
 *   node .claude/skills/agent-log-report/scripts/report.mjs --all      # every session
 *   node .claude/skills/agent-log-report/scripts/report.mjs --sessions # list sessions only
 */
import { readFileSync, existsSync } from 'node:fs';

const LOG = '.agent-log/actions.jsonl';
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? undefined : argv[i + 1];
};

if (!existsSync(LOG)) {
  console.log(`No journal at ${LOG}.`);
  console.log('The hooks have not fired yet, or this session started before they were configured.');
  process.exit(0);
}

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
  .filter(Boolean);

if (rows.length === 0) {
  console.log('The journal is empty.');
  process.exit(0);
}

const sessions = [...new Set(rows.map((r) => r.session))].filter(Boolean);
const lastOf = (id) => rows.filter((r) => r.session === id).at(-1)?.ts ?? '';

if (flag('sessions')) {
  console.log(`Sessions in the journal: ${sessions.length}\n`);
  for (const id of sessions) {
    const n = rows.filter((r) => r.session === id).length;
    console.log(`  ${id}  ${String(n).padStart(5)} entries  last seen ${lastOf(id)}`);
  }
  process.exit(0);
}

const wanted = flag('all')
  ? sessions
  : [opt('session') ?? sessions.sort((a, b) => lastOf(a).localeCompare(lastOf(b))).at(-1)];

for (const id of wanted) {
  const mine = rows.filter((r) => r.session === id);
  if (mine.length === 0) {
    console.log(`No entries for session ${id}.`);
    continue;
  }

  const done = new Set(mine.filter((r) => r.event !== 'PreToolUse' && r.id).map((r) => r.id));
  const proposed = mine.filter((r) => r.event === 'PreToolUse');
  const blocked = proposed.filter((r) => r.id && !done.has(r.id));
  const failed = mine.filter((r) => r.event === 'PostToolUseFailure');

  const byTool = new Map();
  for (const r of proposed) byTool.set(r.tool, (byTool.get(r.tool) ?? 0) + 1);

  console.log(`Session ${id}`);
  console.log(`  ${mine[0].ts}  →  ${mine.at(-1).ts}`);
  console.log(
    `  ${proposed.length} actions proposed, ${proposed.length - blocked.length} carried out, ` +
      `${blocked.length} stopped, ${failed.length} failed`,
  );

  console.log('\n  By tool');
  for (const [tool, n] of [...byTool].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(4)}  ${tool}`);
  }

  if (blocked.length) {
    console.log('\n  Stopped — proposed but never ran (a hook, a permission rule, or a human):');
    for (const b of blocked) console.log(`    ${b.ts}  ${b.tool}  ${b.target}`);
  }

  if (failed.length) {
    console.log('\n  Failed while running:');
    for (const f of failed) console.log(`    ${f.ts}  ${f.tool}  ${f.target}\n      ${f.error ?? ''}`);
  }

  const commands = proposed.filter((r) => r.tool === 'Bash' && r.target).map((r) => r.target);
  if (commands.length) {
    console.log('\n  Commands proposed:');
    for (const c of [...new Set(commands)]) console.log(`    ${c}`);
  }

  const touched = proposed
    .filter((r) => ['Edit', 'Write', 'NotebookEdit'].includes(r.tool) && r.target)
    .map((r) => r.target);
  if (touched.length) {
    const counts = new Map();
    for (const f of touched) counts.set(f, (counts.get(f) ?? 0) + 1);
    console.log('\n  Files written:');
    for (const [f, n] of [...counts].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${String(n).padStart(3)}×  ${f}`);
    }
  }

  const subagents = [...new Set(proposed.map((r) => r.agent).filter(Boolean))];
  if (subagents.length) console.log(`\n  Subagents involved: ${subagents.join(', ')}`);

  if (wanted.length > 1) console.log();
}
