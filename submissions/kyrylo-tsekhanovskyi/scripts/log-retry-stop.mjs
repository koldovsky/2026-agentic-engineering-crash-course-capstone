// Logs a retry-limit stop in docs/logs/retry-stops.md. Must run BEFORE any further action after a stop.
//
//   node scripts/log-retry-stop.mjs --agent be-maker --model claude-opus-5-5 --effort low \
//     --task 2.1 --limit "5 failed attempts" \
//     (--last-failure "<text>" | --last-failure-file <path>) \
//     --next "escalated to high effort"
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, parseArgs } from './lib/proc.mjs';
import { logRetryStop, RETRY_LEDGER } from './lib/retry-stop.mjs';

const { options } = parseArgs(process.argv.slice(2), [
  'agent',
  'model',
  'effort',
  'task',
  'limit',
  'last-failure',
  'last-failure-file',
  'next',
]);
const lastFailure = options['last-failure-file']
  ? fs.readFileSync(path.resolve(options['last-failure-file']), 'utf8')
  : options['last-failure'];
logRetryStop({ ...options, lastFailure });
console.log(`Logged retry-limit stop in ${path.relative(ROOT, RETRY_LEDGER)}`);
