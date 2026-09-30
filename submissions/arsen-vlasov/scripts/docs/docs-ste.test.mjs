// Tests for scripts/docs/docs-ste.mjs (openspec/changes/add-docs-gates, requirement
// "STE hard violations do not grow"). Run: npm run harness:test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { countHard, steVerdict, STE_EXEMPT } from './docs-ste.mjs';

const cli = fileURLToPath(new URL('./docs-ste.mjs', import.meta.url));

const report = {
  violations: [
    { file: 'a.md', line: 2, rule: 'semicolon', level: 'advisory-free' },
    { file: 'a.md', line: 5, rule: 'passive-voice', level: 'advisory' },
    { file: 'b.md', line: 1, rule: 'phrasal-verb', level: 'advisory-free' },
  ],
};

test('only hard (advisory-free) violations are counted, per file', () => {
  assert.deepEqual(countHard(report, ['a.md', 'b.md', 'c.md']).counts, { 'a.md': 1, 'b.md': 1, 'c.md': 0 });
});

test('a new semicolon in a file with baseline 0 fails and names file, rule and line', () => {
  const v = steVerdict(report, ['a.md', 'b.md'], { 'a.md': 0, 'b.md': 1 });
  assert.equal(v.ok, false);
  const text = v.lines.join('\n');
  assert.match(text, /a\.md/);
  assert.match(text, /semicolon/);
  assert.match(text, /:2/);
});

test('advisory findings never fail the run', () => {
  const advisoryOnly = { violations: [{ file: 'a.md', line: 5, rule: 'passive-voice', level: 'advisory' }] };
  assert.equal(steVerdict(advisoryOnly, ['a.md'], {}).ok, true);
});

test('below the baseline passes with the update advice', () => {
  const v = steVerdict({ violations: [] }, ['a.md'], { 'a.md': 3 });
  assert.equal(v.ok, true);
  assert.match(v.lines.join('\n'), /--update-baseline/);
});

test('missing python3 fails and says so, it is not a pass', () => {
  const r = spawnSync(process.execPath, [cli], {
    encoding: 'utf8',
    env: { ...process.env, DOCS_STE_PYTHON: 'python3-that-does-not-exist' },
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /python3 not found — docs:ste cannot run/);
});

test('records and bug text are not rewritten: archive, docs/bugs and the vendored skill are exempt', () => {
  const exempt = (f) => STE_EXEMPT.some((p) => f.startsWith(p));
  assert.equal(exempt('openspec/changes/archive/2026-09-29-x/design.md'), true);
  assert.equal(exempt('docs/bugs/2026-09-30-x.md'), true);
  assert.equal(exempt('.claude/skills/asd-ste100/SKILL.md'), true);
  assert.equal(exempt('openspec/specs/jenkins-verify/spec.md'), false);
  assert.equal(exempt('docs/index.md'), false);
});
