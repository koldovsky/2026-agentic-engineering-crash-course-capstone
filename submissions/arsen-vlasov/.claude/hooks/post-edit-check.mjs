#!/usr/bin/env node
/**
 * PostToolUse hook for Edit, Write and MultiEdit: checks the edited file at once and sends the
 * findings back to the agent (exit 2 + stderr). The edit has already happened; the hook reports.
 * Spec: openspec/specs/edit-hooks ("A doc edit is checked at once", "A code edit is checked at once").
 *
 * - Harness and doc text: the language check and the ASD-STE100 linter, against the baselines.
 * - Specs and page objects: rules:lint lines about this file, and ESLint errors (not warnings).
 *
 * It never breaks a session: bad input or a missing tool gives exit 0, with a note for a tool.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inScope, cyrillicProseLines, LANGUAGE_BASELINE } from '../../scripts/docs/docs-lint.mjs';
import { STE_EXEMPT, STE_BASELINE } from '../../scripts/docs/docs-ste.mjs';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const STE_LINTER = join(REPO, '.claude/skills/asd-ste100/scripts/ste-lint.py');

export function checksFor(path) {
  const doc = inScope(path);
  return {
    language: doc && !path.startsWith('docs/bugs/'),
    ste: doc && !STE_EXEMPT.some((prefix) => path.startsWith(prefix)),
    code: /^(tests|page-objects)\/.*\.ts$/.test(path),
  };
}

export function docFindings({ path, content, steReport, languageBaseline, steBaseline }) {
  const out = [];
  const want = checksFor(path);

  if (want.language) {
    const lines = cyrillicProseLines(path, content);
    const base = languageBaseline[path] ?? 0;
    if (lines.length > base) {
      out.push(
        `${path}:${lines[0]} Cyrillic prose on ${lines.length} line(s) (baseline ${base}): ${lines.slice(0, 8).join(', ')}. ` +
          'Translate it to English. Quote a UI string in «…» or backticks.',
      );
    }
  }

  if (want.ste) {
    const hard = (steReport.violations ?? []).filter((v) => v.level === 'advisory-free' && v.file === path);
    if (hard.length > (steBaseline[path] ?? 0)) {
      for (const v of hard) out.push(`${path}:${v.line} ${v.rule} — ${v.message ?? 'see the asd-ste100 skill'}`);
    }
  }
  return out;
}

export function codeFindings({ path, rulesLintOutput, eslintOutput }) {
  const out = [];
  const lines = rulesLintOutput.split('\n');
  let pending = [];
  for (const line of lines) {
    const hit = line.match(/^\s+(NEW|WORSE)\s+(\S+)/);
    if (hit && hit[2] === path) pending.push(line.trim());
    if (/^\s+rule:/.test(line)) {
      for (const p of pending) out.push(`${p} — ${line.trim()}`);
      pending = [];
    }
    if (/^[✓✗]/.test(line)) pending = [];
  }
  for (const line of eslintOutput.split('\n')) {
    const m = line.match(/^\s+(\d+):(\d+)\s+error\s+(.*)$/);
    if (m) out.push(`${path}:${m[1]}:${m[2]} ESLint error: ${m[3].trim()}`);
  }
  return out;
}

const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
};

function main() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return 0;
  }
  const file = payload?.tool_input?.file_path;
  if (typeof file !== 'string') return 0;

  const project = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const rel = relative(project, isAbsolute(file) ? file : join(project, file)).split('\\').join('/');
  if (rel.startsWith('..')) return 0;

  const want = checksFor(rel);
  if (!want.language && !want.ste && !want.code) return 0;

  const findings = [];
  const notes = [];

  if (want.language || want.ste) {
    const abs = join(project, rel);
    const content = existsSync(abs) ? readFileSync(abs, 'utf8') : '';
    let steReport = { violations: [] };
    if (want.ste) {
      const r = spawnSync('python3', [STE_LINTER, '--json', rel], { cwd: project, encoding: 'utf8' });
      if (r.error) notes.push('python3 not found — the STE check was skipped.');
      else {
        try {
          steReport = JSON.parse(r.stdout);
        } catch {
          notes.push('the STE linter gave no JSON — the STE check was skipped.');
        }
      }
    }
    findings.push(
      ...docFindings({
        path: rel,
        content,
        steReport,
        languageBaseline: readJson(join(project, LANGUAGE_BASELINE)),
        steBaseline: readJson(join(project, STE_BASELINE)),
      }),
    );
  }

  if (want.code) {
    const rl = spawnSync('node', [join(REPO, 'scripts/rules-lint.mjs')], { cwd: project, encoding: 'utf8' });
    const es = spawnSync(join(REPO, 'node_modules/.bin/eslint'), ['--quiet', rel], { cwd: project, encoding: 'utf8' });
    if (es.error) notes.push('eslint not found — the ESLint check was skipped.');
    findings.push(...codeFindings({ path: rel, rulesLintOutput: rl.stdout ?? '', eslintOutput: es.stdout ?? '' }));
  }

  if (notes.length) process.stderr.write(notes.map((n) => `post-edit-check: ${n}`).join('\n') + '\n');
  if (findings.length === 0) return 0;
  process.stderr.write(
    `post-edit-check: ${findings.length} problem(s) in ${rel}. Fix them before the next step:\n` +
      findings.map((f) => `  ${f}`).join('\n') +
      '\n',
  );
  return 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let code = 0;
  try {
    code = main();
  } catch {
    code = 0;
  }
  process.exit(code);
}
