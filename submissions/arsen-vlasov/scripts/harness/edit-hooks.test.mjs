// Tests for openspec/changes/add-edit-hooks/specs/edit-hooks/spec.md. Run: npm run harness:test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checksFor, docFindings, codeFindings } from '../../.claude/hooks/post-edit-check.mjs';
import { newestBlock } from '../../.claude/hooks/session-start.mjs';
import { checkEnvFiles, baselineGrowth, knownFailureIssues } from './pre-commit.mjs';
import { classify } from './guard-policy.mjs';

// Requirement: A doc edit is checked at once

test('checksFor: docs, code, and exempt paths', () => {
  assert.deepEqual(checksFor('.claude/skills/x/SKILL.md'), { language: true, ste: true, code: false });
  assert.deepEqual(checksFor('docs/bugs/2026-x.md'), { language: false, ste: false, code: false });
  assert.deepEqual(checksFor('openspec/changes/archive/a/design.md'), { language: true, ste: false, code: false });
  assert.deepEqual(checksFor('tests/specs/regression/a.spec.ts'), { language: false, ste: false, code: true });
  assert.deepEqual(checksFor('page-objects/admin/x.ts'), { language: false, ste: false, code: true });
  assert.deepEqual(checksFor('utils/helpers/x.ts'), { language: false, ste: false, code: false });
});

test('Cyrillic prose in a skill with baseline 0 is a finding with the line and the fix', () => {
  const found = docFindings({
    path: '.claude/skills/x/SKILL.md',
    content: '# X\n\nОткрыть таблицу\n',
    steReport: { violations: [] },
    languageBaseline: {},
    steBaseline: {},
  });
  assert.equal(found.length, 1);
  assert.match(found[0], /\.claude\/skills\/x\/SKILL\.md:3/);
  assert.match(found[0], /Translate/);
});

test('a known STE finding at its baseline does not nag', () => {
  const path = '.claude/skills/jenkins-verify/SKILL.md';
  const steReport = { violations: [{ file: path, line: 4, rule: 'synonym-rotation', level: 'advisory-free' }] };
  assert.deepEqual(docFindings({ path, content: '# ok\n', steReport, languageBaseline: {}, steBaseline: { [path]: 1 } }), []);
});

test('an STE finding above the baseline is reported with rule and line; advisory is ignored', () => {
  const path = 'docs/a.md';
  const steReport = {
    violations: [
      { file: path, line: 2, rule: 'semicolon', level: 'advisory-free', message: 'Split.' },
      { file: path, line: 3, rule: 'passive-voice', level: 'advisory', message: 'x' },
    ],
  };
  const found = docFindings({ path, content: '# a\n', steReport, languageBaseline: {}, steBaseline: {} });
  assert.equal(found.length, 1);
  assert.match(found[0], /docs\/a\.md:2 semicolon/);
});

// Requirement: A code edit is checked at once

test('codeFindings keeps only the rules:lint lines of the edited file, with the rule', () => {
  const rulesLintOutput = [
    '✗ no-expect-in-regression-specs        1 file(s), 0 in baseline',
    '    NEW    tests/specs/regression/a.spec.ts (1)',
    '    rule: playwright-specs-no-expect.md — move the assertion into a should* method',
    '✗ pom-size (limit 300)                  1 file(s), 0 in baseline',
    '    NEW    page-objects/other.ts (320)',
    '    rule: page-object-size.md — split the page object',
  ].join('\n');
  const found = codeFindings({ path: 'tests/specs/regression/a.spec.ts', rulesLintOutput, eslintOutput: '' });
  assert.equal(found.length, 1);
  assert.match(found[0], /playwright-specs-no-expect\.md/);
  assert.doesNotMatch(found.join('\n'), /other\.ts/);
});

test('codeFindings reports ESLint errors', () => {
  const eslintOutput = '/abs/tests/a.spec.ts\n  3:7  error  x is not defined  no-undef\n\n✖ 1 problem (1 error, 0 warnings)';
  const found = codeFindings({ path: 'tests/a.spec.ts', rulesLintOutput: '', eslintOutput });
  assert.equal(found.length, 1);
  assert.match(found[0], /no-undef/);
});

// Requirement: The guard closes the known gaps

test('guard: a glob on the journal is blocked; the summary commands are allowed', () => {
  assert.equal(classify('wc -l .agent-log/*.jsonl')?.kind, 'journal');
  assert.equal(classify('ls .agent-log')?.kind, 'journal');
  assert.equal(classify('npm run agent:log'), null);
  assert.equal(classify('node .claude/skills/agent-log-report/scripts/report.mjs'), null);
});

test('guard: the env template is readable, other env files are not', () => {
  assert.equal(classify('cat .env.example'), null);
  assert.equal(classify('cat .env.local')?.kind, 'secret');
  assert.equal(classify('cat .env')?.kind, 'secret');
  assert.equal(classify('grep KEY config/.env')?.kind, 'secret');
});

test('guard: Grep or Glob on static users is blocked for those tools only', () => {
  assert.equal(classify('test-data/users/static/stage.json', 'Grep')?.kind, 'secret');
  assert.equal(classify('test-data/users/static/*.json', 'Glob')?.kind, 'secret');
  assert.equal(classify('test-data/users/static/user-manager.ts', 'Grep'), null);
  assert.equal(classify('git diff --numstat -- test-data/users/static/stage.json', 'Bash'), null);
});

test('guard: skipping git hooks is blocked; git log -n stays allowed', () => {
  assert.equal(classify('git commit --no-verify -m x')?.kind, 'no-verify');
  assert.equal(classify('git commit -nm x')?.kind, 'no-verify');
  assert.equal(classify('git push --no-verify')?.kind, 'no-verify');
  assert.equal(classify('git log -n 5'), null);
  assert.equal(classify('git commit -m "no verify needed"'), null);
});

test('guard: a commit message in a heredoc may name the flag; the flag itself is still blocked', () => {
  const message = "git commit -q -F - <<'EOF'\nguard: git commit/push --no-verify and commit -n blocked\nEOF";
  assert.equal(classify(message), null);
  assert.equal(classify("git commit --no-verify -F - <<'EOF'\nx\nEOF")?.kind, 'no-verify');
});

// Requirement: A commit cannot hide debt

test('pre-commit: env files are blocked, the template is not', () => {
  assert.deepEqual(checkEnvFiles(['.env', 'config/.env', '.env.local', '.env.example', 'docs/a.md']), [
    '.env',
    'config/.env',
    '.env.local',
  ]);
});

test('pre-commit: a baseline entry that grows or is new fails; a smaller or removed one passes', () => {
  assert.deepEqual(baselineGrowth('.ste-baseline.json', { 'AGENTS.md': 1 }, { 'AGENTS.md': 2 }), [
    { key: 'AGENTS.md', before: 1, after: 2 },
  ]);
  assert.deepEqual(baselineGrowth('.ste-baseline.json', { 'AGENTS.md': 1 }, {}), []);
  assert.deepEqual(baselineGrowth('.ste-baseline.json', {}, { 'new.md': 1 }), [{ key: 'new.md', before: 0, after: 1 }]);
});

test('pre-commit: nested baselines are compared by flat keys', () => {
  const head = { 'pom-size': { 'page-objects/a.ts': 310 } };
  const staged = { 'pom-size': { 'page-objects/a.ts': 320 } };
  assert.deepEqual(baselineGrowth('.rules-lint-baseline.json', head, staged), [
    { key: 'pom-size › page-objects/a.ts', before: 310, after: 320 },
  ]);
  const eh = { 'a.ts': { 'no-console': { count: 2 } } };
  const es = { 'a.ts': { 'no-console': { count: 3 } } };
  assert.deepEqual(baselineGrowth('eslint-suppressions.json', eh, es), [{ key: 'a.ts › no-console', before: 2, after: 3 }]);
});

test('pre-commit: a new known failure needs a PRJ- issue', () => {
  const head = [{ test: 'a › old', issue: 'PRJ-1' }];
  const staged = [...head, { test: 'b › new', issue: 'TODO' }, { test: 'c › new', issue: 'PRJ-6789' }];
  assert.deepEqual(knownFailureIssues(head, staged), ['b › new']);
});

// Requirement: A session starts from the last notes

test('SessionStart prints only the newest block', () => {
  const text = '# Session notes\n\nintro\n\n---\n\n## 2026-09-30 — new\n\n- **Done:** a\n\n## 2026-09-15 — old\n\n- **Done:** b\n';
  const block = newestBlock(text);
  assert.match(block, /2026-09-30 — new/);
  assert.doesNotMatch(block, /2026-09-15/);
  assert.equal(newestBlock('# Session notes\n\nno blocks\n'), '');
});
