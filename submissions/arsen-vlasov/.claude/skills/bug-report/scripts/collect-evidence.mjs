#!/usr/bin/env node
/**
 * Compact evidence for failed tests, from allure-results/.
 *
 *   node .claude/skills/bug-report/scripts/collect-evidence.mjs [--grep <text>] [--hours <n>] [--dir <path>] [--json]
 *
 * allure-results/ accumulates every local run (tens of thousands of files), so never read
 * it directly. This keeps only the newest result per test (historyId), drops passed and
 * skipped ones (a skipped result never supersedes a real run), and prints for each failure: test, spec:line, linked TC, the failing step
 * path, the first lines of the error, and the attachment files.
 *
 * --grep   substring of the test name or spec path
 * --hours  only results that finished within n hours of the newest result (default 24)
 * --dir    results folder (default allure-results)
 * Exit 0 — failures printed; exit 1 — no failure matched.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
const ERROR_LINES = 12;

/**
 * The step the test stopped in: the LAST failed step at each level. Allure also marks a step failed
 * when a `toPass` retry inside it failed and a later attempt passed, so the first failed one misleads.
 */
export function failingStepPath(node, path = []) {
  const failed = (node.steps ?? []).filter((s) => s.status === 'failed' || s.status === 'broken');
  const last = failed.at(-1);
  return last ? failingStepPath(last, [...path, last.name]) : path;
}

function attachmentsOf(node, dir, out = []) {
  for (const a of node.attachments ?? []) out.push({ name: a.name, type: a.type, file: join(dir, a.source) });
  for (const step of node.steps ?? []) attachmentsOf(step, dir, out);
  return out;
}

export function summarize(result, dir) {
  const message = (result.statusDetails?.message ?? '').replace(ANSI, '').trim();
  return {
    test: result.name,
    status: result.status,
    spec: result.fullName,
    finished: new Date(result.stop).toISOString(),
    durationSec: Math.round((result.stop - result.start) / 1000),
    testCase: (result.links ?? []).filter((l) => l.type === 'tms').map((l) => l.name),
    tags: (result.labels ?? []).filter((l) => l.name === 'tag').map((l) => l.value),
    failingStep: failingStepPath(result).join(' > '),
    error: message.split('\n').slice(0, ERROR_LINES).join('\n'),
    attachments: attachmentsOf(result, dir),
  };
}

export function collect(results, { grep, hours = 24 } = {}) {
  const newestPerTest = new Map();
  // A skipped result means the test did not run (another spec was grepped), so it must not
  // hide an older real failure.
  for (const r of results.filter((x) => x.status !== 'skipped')) {
    const key = r.historyId ?? r.fullName;
    if (!newestPerTest.has(key) || newestPerTest.get(key).stop < r.stop) newestPerTest.set(key, r);
  }
  const latest = [...newestPerTest.values()];
  const newest = Math.max(0, ...latest.map((r) => r.stop ?? 0));
  const since = newest - hours * 3600 * 1000;
  const needle = grep?.toLowerCase();
  return latest
    .filter((r) => r.status === 'failed' || r.status === 'broken')
    .filter((r) => r.stop >= since)
    .filter((r) => !needle || `${r.name} ${r.fullName}`.toLowerCase().includes(needle))
    .sort((a, b) => b.stop - a.stop);
}

function readResults(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('-result.json'))
    .map((f) => {
      try {
        return JSON.parse(readFileSync(join(dir, f), 'utf8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function toMarkdown(items) {
  return items
    .map((e) =>
      [
        `### ${e.test}`,
        `- status: ${e.status} · finished ${e.finished} · ${e.durationSec}s`,
        `- spec: \`${e.spec}\``,
        `- test case: ${e.testCase.join(', ') || '—'}`,
        `- failing step: ${e.failingStep || '—'}`,
        `- attachments: ${e.attachments.map((a) => `\`${a.file}\` (${a.name})`).join(', ') || 'none — local runs keep no screenshot or trace'}`,
        '```',
        e.error,
        '```',
      ].join('\n'),
    )
    .join('\n\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (name) => {
    const i = args.indexOf(name);
    return i === -1 ? undefined : args[i + 1];
  };
  const dir = opt('--dir') ?? 'allure-results';
  const hours = Number(opt('--hours') ?? 24);
  const failures = collect(readResults(dir), { grep: opt('--grep'), hours }).map((r) => summarize(r, dir));
  if (failures.length === 0) {
    console.error(`No failed or broken tests in ${dir} within ${hours}h of the newest result. Widen with --hours, or run the spec first.`);
    process.exit(1);
  }
  console.log(args.includes('--json') ? JSON.stringify(failures, null, 2) : toMarkdown(failures));
}
