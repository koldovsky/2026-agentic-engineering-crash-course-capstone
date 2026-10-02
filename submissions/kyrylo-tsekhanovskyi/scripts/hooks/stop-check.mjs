// Stop / SubagentStop hook (Claude Code, Codex): runs the fast check for the side(s) with uncommitted
// changes and hands failures back to the agent. After 3 re-entries in a row it gives up, logs the stop
// in docs/logs/retry-stops.md and lets the agent stop, so the human takes over.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, run, runSync, tail } from '../lib/proc.mjs';
import { logRetryStop } from '../lib/retry-stop.mjs';
import { resolveAgentType, sidesToCheck } from '../lib/stop.mjs';
import { readPayload } from './payload.mjs';

const MAX_REENTRIES = 3;

const payload = await readPayload();
const agentType = resolveAgentType(payload.raw);
// One counter per subagent instance; never shared with the main session.
const key = [payload.session, payload.raw.agent_id || agentType || 'main']
  .join('-')
  .replace(/[^\w.-]/g, '_');
const stateDir = path.join(ROOT, '.agent-work', 'stop-hook');
const stateFile = path.join(stateDir, `${key}.json`);
const reset = () => fs.rmSync(stateFile, { force: true });

const changed = (dir) => Boolean(runSync('git', ['status', '--porcelain', '--', dir]).stdout?.trim());
const sides = sidesToCheck(
  agentType,
  { be: changed('backend'), fe: changed('frontend') },
  payload.raw.hook_event_name ?? 'SubagentStop',
);
if (!sides.length) {
  reset();
  process.exit(0);
}

let output = '';
let failed = false;
for (const side of sides) {
  const result = await run(`node scripts/check.mjs ${side} --fast`, { quiet: true });
  output += result.output;
  failed ||= result.exitCode !== 0;
}
if (!failed) {
  reset();
  process.exit(0);
}

const count = (fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')).count : 0) + 1;
if (count > MAX_REENTRIES) {
  reset();
  logRetryStop({
    agent: agentType ?? 'unidentified agent',
    model: payload.model ?? 'see session',
    effort: 'see session',
    task: '-',
    limit: `Stop hook: ${MAX_REENTRIES} re-entries`,
    lastFailure: tail(output, 20),
    next: 'handed back to human',
  });
  process.stdout.write(
    JSON.stringify({
      systemMessage: `Fast check still failing after ${MAX_REENTRIES} re-entries. Logged in docs/logs/retry-stops.md; human takes over.`,
    }),
  );
  process.exit(0);
}

fs.mkdirSync(stateDir, { recursive: true });
fs.writeFileSync(stateFile, JSON.stringify({ count }));
process.stdout.write(
  JSON.stringify({
    decision: 'block',
    reason: `Fast check failed (re-entry ${count}/${MAX_REENTRIES}). Fix it before finishing:\n${tail(output, 60)}`,
  }),
);
