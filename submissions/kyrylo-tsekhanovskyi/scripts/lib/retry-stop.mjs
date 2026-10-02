// Appends one row to docs/logs/retry-stops.md (shared by the CLI and the Stop hook).
import path from 'node:path';
import { ROOT, today } from './proc.mjs';
import { appendRowToFile } from './ledger.mjs';

export const RETRY_LEDGER = path.join(ROOT, 'docs', 'logs', 'retry-stops.md');

// Keeps the ledger readable: the last few non-empty lines of the failure, at most 400 chars.
function trimFailure(text) {
  const lines = String(text).split(/\r?\n/).filter((l) => l.trim());
  const short = lines.slice(-4).join(' ⏎ ');
  return short.length > 400 ? `…${short.slice(-400)}` : short;
}

export function logRetryStop({ agent, model, effort, task, limit, lastFailure, next }) {
  const row = [
    today(),
    agent ?? '?',
    `${model ?? '?'} / ${effort ?? '?'}`,
    task ?? '-',
    limit ?? '?',
    `\`${trimFailure(lastFailure ?? '').replace(/`/g, "'")}\``,
    next ?? 'pending: human decides',
  ];
  appendRowToFile(RETRY_LEDGER, row);
}
