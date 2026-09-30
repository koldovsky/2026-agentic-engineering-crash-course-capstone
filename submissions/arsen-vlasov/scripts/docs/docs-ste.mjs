#!/usr/bin/env node
/**
 * ASD-STE100 ratchet for the harness and the documents: runs the vendored linter and fails when a
 * file has more hard violations than its baseline.
 * Spec: openspec/changes/add-docs-gates/specs/docs-gates/spec.md ("STE hard violations do not grow")
 *
 *   npm run docs:ste                           check
 *   npm run docs:ste -- --update-baseline      write .ste-baseline.json from the current counts
 *
 * Needs python3 (stdlib only). DOCS_STE_PYTHON overrides the interpreter.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { listScope, ratchet } from './docs-lint.mjs';

export const STE_BASELINE = '.ste-baseline.json';
const LINTER = '.claude/skills/asd-ste100/scripts/ste-lint.py';
/** Exempt from STE (spec: scope): vendored files, Russian bug text, archived records. */
export const STE_EXEMPT = ['.claude/skills/asd-ste100/', 'docs/bugs/', 'openspec/changes/archive/'];

export function countHard(report, files) {
  const counts = Object.fromEntries(files.map((f) => [f, 0]));
  const where = {};
  for (const v of report.violations ?? []) {
    if (v.level !== 'advisory-free' || !(v.file in counts)) continue;
    counts[v.file] += 1;
    (where[v.file] ??= []).push(`${v.file}:${v.line} ${v.rule}`);
  }
  return { counts, where };
}

export function steVerdict(report, files, baseline) {
  const { counts, where } = countHard(report, files);
  const { failed, improved } = ratchet(counts, baseline);
  const lines = [`${failed.length || files.length === 0 ? '✗' : '✓'} docs:ste       ${files.length} file(s)`];
  if (files.length === 0) lines.push('    0 files in scope, nothing was checked');
  for (const f of failed) {
    lines.push(`    ${f.file}: ${f.count} hard STE violation(s), baseline ${f.baseline}`);
    for (const w of where[f.file].slice(0, 10)) lines.push(`      ${w}`);
    lines.push('      Fix: apply the asd-ste100 skill to this file (split the sentence, use the plain verb).');
  }
  for (const i of improved) {
    lines.push(`  improved: ${i.file} ${i.count} < ${i.baseline}. Refresh with: npm run docs:ste -- --update-baseline`);
  }
  return { ok: failed.length === 0 && files.length > 0, lines, counts };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const python = process.env.DOCS_STE_PYTHON ?? 'python3';
  if (spawnSync(python, ['--version']).error) {
    const tried = python === 'python3' ? '' : ` (tried "${python}")`;
    console.error(`python3 not found — docs:ste cannot run${tried}`);
    process.exit(1);
  }

  const files = listScope().filter((f) => !STE_EXEMPT.some((prefix) => f.startsWith(prefix)));
  const r = spawnSync(python, [LINTER, '--json', ...files], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  let report;
  try {
    report = JSON.parse(r.stdout);
  } catch {
    console.error(`docs:ste: the linter gave no JSON (exit ${r.status}). ${r.stderr.slice(0, 300)}`);
    process.exit(1);
  }

  const baseline = existsSync(STE_BASELINE) ? JSON.parse(readFileSync(STE_BASELINE, 'utf8')) : {};
  const v = steVerdict(report, files, baseline);
  if (process.argv.includes('--update-baseline')) {
    const nonZero = Object.fromEntries(Object.entries(v.counts).filter(([, n]) => n > 0));
    writeFileSync(STE_BASELINE, `${JSON.stringify(nonZero, null, 2)}\n`);
    console.warn(`${STE_BASELINE} written: ${Object.keys(nonZero).length} file(s) with hard violations`);
  }
  console.warn(v.lines.join('\n'));
  process.exit(v.ok ? 0 : 1);
}
