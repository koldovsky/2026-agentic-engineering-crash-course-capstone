#!/usr/bin/env node
/**
 * Structure and language checks for the harness and the documents.
 * Spec: openspec/changes/add-docs-gates/specs/docs-gates/spec.md
 *
 *   npm run docs:lint                          check
 *   npm run docs:lint -- --update-baseline     write .docs-language-baseline.json from the current counts
 *
 * Every failure prints how to fix it. Exit 0 when all checks pass, 1 otherwise.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LANGUAGE_BASELINE = '.docs-language-baseline.json';
const AGENTS_LIMIT = 100;
const CYRILLIC = /[А-Яа-яЁёІіЇїЄєҐґ]/;
const LINK = /\[[^\]]*\]\(([^)\s]+)\)/g;
const POLICY_DOC = 'docs/harness/git-policy.md';

export function inScope(path) {
  if (['AGENTS.md', 'ARCHITECTURE.md', 'CLAUDE.md'].includes(path)) return true;
  return /^(docs|\.claude|openspec)\//.test(path) && path.endsWith('.md');
}

/** Each line with fenced code blanked, so line numbers stay the same. */
function proseLines(content) {
  let fenced = false;
  return content.split('\n').map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      return '';
    }
    return fenced ? '' : line;
  });
}

export function checkAgentsSize(content) {
  const count = content.replace(/\n$/, '').split('\n').length;
  return count > AGENTS_LIMIT
    ? `AGENTS.md has ${count} lines (limit ${AGENTS_LIMIT}). Move the detail into docs/ and link it from AGENTS.md.`
    : null;
}

function linkTargets(path, content) {
  const out = [];
  proseLines(content).forEach((line, i) => {
    for (const m of line.replace(/`[^`]*`/g, '').matchAll(LINK)) {
      const target = m[1];
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      out.push({ line: i + 1, target, resolved: normalize(join(dirname(path), target.split('#')[0])) });
    }
  });
  return out;
}

export function findBrokenLinks(files, exists = (p) => p in files) {
  const broken = [];
  for (const [path, content] of Object.entries(files)) {
    if (!path.endsWith('.md')) continue;
    for (const l of linkTargets(path, content)) {
      if (!exists(l.resolved)) broken.push({ file: path, line: l.line, target: l.target });
    }
  }
  return broken;
}

export function findOrphans(files) {
  const start = 'docs/index.md';
  const seen = new Set();
  const queue = start in files ? [start] : [];
  while (queue.length) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);
    for (const l of linkTargets(path, files[path])) {
      if (l.resolved in files && l.resolved.endsWith('.md') && !seen.has(l.resolved)) queue.push(l.resolved);
    }
  }
  return Object.keys(files).filter((p) => p.startsWith('docs/') && p.endsWith('.md') && !seen.has(p));
}

export function cyrillicProseLines(path, content) {
  if (path.startsWith('docs/bugs/')) return [];
  const found = [];
  proseLines(content).forEach((line, i) => {
    const stripped = line
      .replace(/`[^`]*`/g, '')
      .replace(/«[^»]*»/g, '')
      .replace(/"[^"]*"/g, '')
      .replace(/“[^”]*”/g, '');
    if (CYRILLIC.test(stripped)) found.push(i + 1);
  });
  return found;
}

export function checkPolicy(isIgnored) {
  const problems = [];
  if (!isIgnored('.cursor/rules/probe.mdc')) problems.push(`.cursor/ must be ignored — see ${POLICY_DOC}`);
  for (const [label, probe] of [
    ['docs/logs/', 'docs/logs/probe.md'],
    ['docs/index.md', 'docs/index.md'],
    ['.claude/rules/', '.claude/rules/probe.md'],
    ['openspec/', 'openspec/probe.md'],
    ['ci/known-failures.json', 'ci/known-failures.json'],
  ]) {
    if (isIgnored(probe)) problems.push(`${label} must be committed but is ignored — see ${POLICY_DOC}`);
  }
  return problems;
}

/** Shared by the language check and docs:ste. A new file counts from baseline 0. */
export function ratchet(counts, baseline) {
  const failed = [];
  const improved = [];
  for (const [file, count] of Object.entries(counts)) {
    const base = baseline[file] ?? 0;
    if (count > base) failed.push({ file, count, baseline: base });
    else if (file in baseline && count < base) improved.push({ file, count, baseline: base });
  }
  return { failed, improved };
}

export function lintDocs({ files, isIgnored, languageBaseline, exists }) {
  const scope = Object.fromEntries(Object.entries(files).filter(([p]) => inScope(p)));
  const paths = Object.keys(scope);
  const out = [];
  if (paths.length === 0) {
    return { ok: false, lines: ['✗ docs:lint — 0 files in scope, nothing was checked'], counts: {} };
  }

  const results = [];
  const agents = scope['AGENTS.md'] ? checkAgentsSize(scope['AGENTS.md']) : 'AGENTS.md is missing.';
  results.push(['agents-map', agents ? [agents] : []]);

  const broken = findBrokenLinks(scope, exists ?? ((p) => p in files));
  results.push(['links', broken.map((b) => `${b.file}:${b.line} → ${b.target}. Fix the path or remove the link.`)]);

  const orphans = findOrphans(scope);
  results.push(['reachable', orphans.map((o) => `orphan: ${o}. Link it from docs/index.md or from the index of its folder.`)]);

  const counts = {};
  const where = {};
  for (const p of paths) {
    const hits = cyrillicProseLines(p, scope[p]);
    counts[p] = hits.length;
    where[p] = hits;
  }
  const lang = ratchet(counts, languageBaseline);
  results.push([
    'english-only',
    lang.failed.map(
      (f) =>
        `${f.file}: ${f.count} line(s) of Cyrillic prose (baseline ${f.baseline}) at ${where[f.file].slice(0, 8).join(', ')}. ` +
        'Translate to English. Quote a UI string in «…» or backticks.',
    ),
  ]);

  results.push(['git-policy', checkPolicy(isIgnored)]);

  let ok = true;
  for (const [name, problems] of results) {
    out.push(`${problems.length ? '✗' : '✓'} ${name.padEnd(14)} ${paths.length} file(s)`);
    for (const p of problems) out.push(`    ${p}`);
    if (problems.length) ok = false;
  }
  for (const i of lang.improved) {
    out.push(`  improved: ${i.file} ${i.count} < ${i.baseline}. Refresh with: npm run docs:lint -- --update-baseline`);
  }
  return { ok, lines: out, counts };
}

export function listScope() {
  const r = spawnSync('git', ['ls-files', '-co', '--exclude-standard'], { encoding: 'utf8' });
  return r.stdout.split('\n').filter((p) => p && inScope(p) && existsSync(p));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = Object.fromEntries(listScope().map((p) => [p, readFileSync(p, 'utf8')]));
  const isIgnored = (p) => spawnSync('git', ['check-ignore', '-q', '--no-index', p]).status === 0;
  const baseline = existsSync(LANGUAGE_BASELINE) ? JSON.parse(readFileSync(LANGUAGE_BASELINE, 'utf8')) : {};
  const r = lintDocs({ files, isIgnored, languageBaseline: baseline, exists: (p) => existsSync(p) || p in files });

  if (process.argv.includes('--update-baseline')) {
    const nonZero = Object.fromEntries(Object.entries(r.counts).filter(([, n]) => n > 0));
    writeFileSync(LANGUAGE_BASELINE, `${JSON.stringify(nonZero, null, 2)}\n`);
    console.warn(`${LANGUAGE_BASELINE} written: ${Object.keys(nonZero).length} file(s) with Cyrillic prose`);
  }
  console.warn(r.lines.join('\n'));
  process.exit(r.ok ? 0 : 1);
}
