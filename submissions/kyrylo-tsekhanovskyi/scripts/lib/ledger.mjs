// Markdown ledger helpers for docs/logs/*.md.
import fs from 'node:fs';

const PLACEHOLDER = /^\|\s*_none yet_/;
const LOCK_TIMEOUT_MS = 15_000;
const STALE_LOCK_MS = 30_000;

export function escapeCell(value) {
  return String(value ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();
}

// Appends a row after the last row of the first table; the `_none yet_` placeholder row is replaced.
export function appendTableRow(markdown, cells) {
  const row = `| ${cells.map(escapeCell).join(' | ')} |`;
  const lines = markdown.split('\n');
  const start = lines.findIndex((l) => l.startsWith('|'));
  if (start === -1) throw new Error('No markdown table found in ledger');
  let end = start;
  while (end + 1 < lines.length && lines[end + 1].startsWith('|')) end++;
  if (PLACEHOLDER.test(lines[end])) {
    lines[end] = row;
  } else {
    lines.splice(end + 1, 0, row);
  }
  return lines.join('\n');
}

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// Cross-process lock (an atomic mkdir) so parallel reviews or stops never overwrite each other's rows.
function withLock(file, fn) {
  const lock = `${file}.lock`;
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  for (;;) {
    try {
      fs.mkdirSync(lock);
      break;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      const age = Date.now() - (fs.statSync(lock, { throwIfNoEntry: false })?.mtimeMs ?? Date.now());
      if (age > STALE_LOCK_MS) fs.rmSync(lock, { recursive: true, force: true });
      else if (Date.now() > deadline) throw new Error(`Timed out waiting for ${lock}`);
      else sleep(25);
    }
  }
  try {
    return fn();
  } finally {
    fs.rmSync(lock, { recursive: true, force: true });
  }
}

export function appendRowToFile(file, cells) {
  withLock(file, () => fs.writeFileSync(file, appendTableRow(fs.readFileSync(file, 'utf8'), cells)));
}

// Review ledger rows whose last cell (Resolution) is empty, as "<date> <scope> (<reviewer>)".
export function unresolvedReviews(markdown) {
  return markdown
    .split(/\r?\n/)
    .filter((l) => l.startsWith('|') && !l.startsWith('|---') && !PLACEHOLDER.test(l))
    .slice(1) // header row
    .map((l) => l.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim()))
    .filter((cells) => !cells.at(-1))
    .map(([date, scope, reviewer]) => `${date} ${scope} (${reviewer})`);
}

// Reads the checker's closing line: `SUMMARY: P0=0 P1=2 P2=1 P3=0 VERDICT=changes-requested`.
// Codex review mode often uses its own format instead; then the [P0]..[P3] tags are counted and the
// verdict is derived: any P0/P1 means changes are requested. Output with no tags counts as a clean
// review only when it says so explicitly; anything else is `unrecognized` (fail closed).
// Covers prose ("No actionable findings.", "The patch is correct.") and the native JSON result
// (`"findings": []` with `"overall_correctness": "patch is correct"`).
const EXPLICIT_CLEAN =
  /\bno (actionable |blocking )?(findings|issues|problems)\b|\bdid(?: not|n't) find any\b|\bpatch is correct\b|"findings"\s*:\s*\[\s*\]/i;

export function parseReviewSummary(text) {
  const m = /^SUMMARY:\s*P0=(\d+)\s+P1=(\d+)\s+P2=(\d+)\s+P3=(\d+)\s+VERDICT=(\S+)/m.exec(text);
  if (m) {
    return { counts: { P0: +m[1], P1: +m[2], P2: +m[3], P3: +m[4] }, verdict: m[5] };
  }
  const count = (p) => (text.match(new RegExp(`\\[${p}\\]`, 'g')) ?? []).length;
  const counts = { P0: count('P0'), P1: count('P1'), P2: count('P2'), P3: count('P3') };
  const total = counts.P0 + counts.P1 + counts.P2 + counts.P3;
  let verdict;
  if (counts.P0 + counts.P1 > 0) verdict = 'changes-requested (derived)';
  else if (total > 0 || EXPLICIT_CLEAN.test(text)) verdict = 'approve (derived)';
  else verdict = 'unrecognized';
  return { counts, verdict };
}
