// Tests for scripts/docs/docs-lint.mjs, one per scenario of
// openspec/changes/add-docs-gates/specs/docs-gates/spec.md. Run: npm run harness:test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  inScope,
  checkAgentsSize,
  findBrokenLinks,
  findOrphans,
  cyrillicProseLines,
  checkPolicy,
  ratchet,
  lintDocs,
} from './docs-lint.mjs';

const lines = (n) => Array.from({ length: n }, (_, i) => `line ${i + 1}`).join('\n');

test('scope: the harness and doc files are in, code and vendored run output are out', () => {
  assert.equal(inScope('AGENTS.md'), true);
  assert.equal(inScope('docs/design/x.md'), true);
  assert.equal(inScope('.claude/rules/project-base.md'), true);
  assert.equal(inScope('openspec/specs/jenkins-verify/spec.md'), true);
  assert.equal(inScope('tests/specs/a.spec.ts'), false);
  assert.equal(inScope('docs/references/endpoints.csv'), false);
});

test('empty scope fails and is not a pass', () => {
  const r = lintDocs({ files: {}, isIgnored: () => false, languageBaseline: {} });
  assert.equal(r.ok, false);
  assert.match(r.lines.join('\n'), /0 files in scope/);
});

test('AGENTS.md over 100 lines fails with the count and the fix', () => {
  assert.equal(checkAgentsSize(lines(100)), null);
  assert.match(checkAgentsSize(lines(101)), /AGENTS\.md has 101 lines \(limit 100\)/);
  assert.match(checkAgentsSize(lines(101)), /docs\//);
});

test('a broken relative link is reported as file:line → target; external links are ignored', () => {
  const files = {
    'docs/a.md': '# A\n\nsee [b](b.md)\nsee [missing](missing.md)\n[web](https://x.test) [anchor](#top)\n',
    'docs/b.md': '# B\n',
  };
  assert.deepEqual(findBrokenLinks(files), [{ file: 'docs/a.md', line: 4, target: 'missing.md' }]);
});

test('a link inside a code fence is not checked', () => {
  const files = { 'docs/a.md': '```\n[x](nope.md)\n```\n' };
  assert.deepEqual(findBrokenLinks(files), []);
});

test('an unreachable doc is an orphan; a doc reached through a folder index is not', () => {
  const files = {
    'docs/index.md': '[reviews](reviews/index.md)',
    'docs/reviews/index.md': '[x](x.md)',
    'docs/reviews/x.md': '# x',
    'docs/design/new.md': '# new',
  };
  assert.deepEqual(findOrphans(files), ['docs/design/new.md']);
});

test('a quoted UI string or inline code is data, not prose', () => {
  assert.deepEqual(cyrillicProseLines('docs/a.md', 'Click «Применить» or `Ментор` now'), []);
  assert.deepEqual(cyrillicProseLines('docs/a.md', 'The title is "Поиск студента".'), []);
});

test('Cyrillic prose is reported by line', () => {
  assert.deepEqual(cyrillicProseLines('docs/a.md', 'English\nОткрыть таблицу и проверить фильтры\n'), [2]);
});

test('Cyrillic inside a code fence is data', () => {
  assert.deepEqual(cyrillicProseLines('docs/a.md', '```ts\ntest(\'Проверка\')\n```\n'), []);
});

test('bug drafts are exempt from the language check', () => {
  assert.deepEqual(cyrillicProseLines('docs/bugs/2026-09-30-x.md', 'Открыть таблицу'), []);
});

test('git policy: .cursor must be ignored, committed paths must not be', () => {
  assert.deepEqual(checkPolicy((p) => p.startsWith('.cursor/')), []);
  const bad = checkPolicy((p) => p.startsWith('docs/logs/'));
  assert.equal(bad.length, 2);
  assert.match(bad.join('\n'), /docs\/logs\/ must be committed but is ignored/);
  assert.match(bad.join('\n'), /\.cursor\/ must be ignored/);
  assert.match(bad.join('\n'), /docs\/harness\/git-policy\.md/);
});

test('ratchet: above baseline or new with findings fails; below baseline is improved', () => {
  const r = ratchet({ 'a.md': 3, 'b.md': 1, 'c.md': 0, 'd.md': 2 }, { 'a.md': 2, 'b.md': 4, 'd.md': 2 });
  assert.deepEqual(r.failed.map((f) => f.file), ['a.md']);
  assert.deepEqual(r.improved.map((f) => f.file), ['b.md']);
  const fresh = ratchet({ 'new.md': 1 }, {});
  assert.deepEqual(fresh.failed, [{ file: 'new.md', count: 1, baseline: 0 }]);
});

test('lintDocs passes a clean tree and prints the scope count', () => {
  const files = { 'AGENTS.md': '[i](docs/index.md)', 'docs/index.md': '# Index\n' };
  const r = lintDocs({ files, isIgnored: (p) => p.startsWith('.cursor/'), languageBaseline: {} });
  assert.equal(r.ok, true, r.lines.join('\n'));
  assert.match(r.lines.join('\n'), /2 file\(s\)/);
});

test('a file whose Cyrillic prose drops to 0 is reported as improved', () => {
  const files = { 'AGENTS.md': '[i](docs/index.md)', 'docs/index.md': '# Index\n\nEnglish only now.\n' };
  const r = lintDocs({ files, isIgnored: (p) => p.startsWith('.cursor/'), languageBaseline: { 'docs/index.md': 5 } });
  assert.equal(r.ok, true);
  assert.match(r.lines.join('\n'), /improved: docs\/index\.md 0 < 5/);
});
