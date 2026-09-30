#!/usr/bin/env node
/**
 * Exercises the hooks without starting an agent: feeds them synthetic events on
 * stdin and asserts the exit codes and the journal entries they produce.
 *
 * Usage: npm run hooks:selftest
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const GUARD = '.claude/hooks/guard-secrets.mjs';
const CURSOR_GUARD = '.cursor/hooks/guard-secrets.mjs';
const LOGGER = '.claude/hooks/log-action.mjs';

const sandbox = mkdtempSync(join(tmpdir(), 'hooks-selftest-'));
let failures = 0;

function run(script, payload, env = {}) {
  return spawnSync('node', [script], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function check(name, actual, expected) {
  const ok = actual === expected;
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok ? '' : `  (expected ${expected}, got ${actual})`}`);
  if (!ok) failures += 1;
}

const pre = (tool, input) => ({
  hook_event_name: 'PreToolUse',
  tool_name: tool,
  tool_input: input,
  tool_use_id: 'toolu_selftest',
  session_id: 'selftest',
});

console.log('guard-secrets — must block (exit 2)');
check('ENV=prod run', run(GUARD, pre('Bash', { command: 'ENV=prod npx playwright test' })).status, 2);
check('--project prod', run(GUARD, pre('Bash', { command: 'npx playwright test --project=prod' })).status, 2);
check('cat prod.json', run(GUARD, pre('Bash', { command: 'cat test-data/users/static/prod.json' })).status, 2);
check('grep in .env', run(GUARD, pre('Bash', { command: 'grep API_KEY .env' })).status, 2);
check('listing .auth', run(GUARD, pre('Bash', { command: 'ls .auth/admin' })).status, 2);

console.log('\nguard-secrets — must block raw journal reads');
check('cat journal', run(GUARD, pre('Bash', { command: 'cat .agent-log/actions.jsonl' })).status, 2);
check('tail journal', run(GUARD, pre('Bash', { command: 'tail -n 20 .agent-log/actions.jsonl' })).status, 2);
check('grep journal', run(GUARD, pre('Bash', { command: 'grep Bash .agent-log/actions.jsonl' })).status, 2);
check('Read journal', run(GUARD, pre('Read', { file_path: '.agent-log/actions.jsonl' })).status, 2);

console.log('\nguard-secrets — must pass through (exit 0)');
check('ordinary stage run', run(GUARD, pre('Bash', { command: 'ENV=stage npx playwright test --project=api' })).status, 0);
check('reading a spec', run(GUARD, pre('Read', { file_path: 'tests/specs/api/auth/admin-sign-in.spec.ts' })).status, 0);
check('the word reproduction', run(GUARD, pre('Bash', { command: 'echo reproduction' })).status, 0);
check('agent:log summary', run(GUARD, pre('Bash', { command: 'npm run agent:log' })).status, 0);
check('summary script direct', run(GUARD, pre('Bash', { command: 'node scripts/agent-log-summary.mjs' })).status, 0);
check('Edit docs mentioning .env is allowed',
  run(GUARD, pre('Edit', { file_path: 'docs/test-strategy/api/index.md', old_string: 'foo', new_string: 'never commit .env or a token' })).status, 0);
check('Write test mentioning journal path is allowed',
  run(GUARD, pre('Write', { file_path: 'scripts/hooks-selftest.mjs', content: 'test that blocks reads of the journal' })).status, 0);
check('Edit still blocks writing INTO a protected path',
  run(GUARD, pre('Edit', { file_path: '.env', old_string: 'a', new_string: 'b' })).status, 2);
check('empty input', spawnSync('node', [GUARD], { input: '', encoding: 'utf8' }).status, 0);
check('malformed JSON', spawnSync('node', [GUARD], { input: '{not json', encoding: 'utf8' }).status, 0);

// .cursor/ is local and git-ignored: on a clone without it, the Cursor cases are skipped, not failed.
if (existsSync(CURSOR_GUARD)) {
  console.log('\nguard-secrets, Cursor adapter — same policy, JSON contract');
  const cursorVerdict = (payload) => {
    const r = spawnSync('node', [CURSOR_GUARD], { input: JSON.stringify(payload), encoding: 'utf8' });
    try {
      return JSON.parse(r.stdout).permission;
    } catch {
      return `unparseable: ${r.stdout.slice(0, 40)}`;
    }
  };
  check('ENV=prod run denied', cursorVerdict({ command: 'ENV=prod npx playwright test' }), 'deny');
  check('cat prod.json denied', cursorVerdict({ command: 'cat test-data/users/static/prod.json' }), 'deny');
  check('read .env denied by any field name', cursorVerdict({ file_path: '.env' }), 'deny');
  check('nested payload inspected', cursorVerdict({ tool: { input: { path: '.auth/admin.json' } } }), 'deny');
  check('ordinary stage run allowed', cursorVerdict({ command: 'ENV=stage npx playwright test' }), 'allow');
  check('reading a spec allowed', cursorVerdict({ file_path: 'tests/specs/api/auth/admin-sign-in.spec.ts' }), 'allow');
  check('malformed JSON allowed through', cursorVerdict('{'), 'allow');

  console.log('\nboth adapters agree on the same policy');
  for (const probe of [
    { text: 'ENV=prod npx playwright test', expectBlocked: true },
    { text: 'cat test-data/users/static/dev.json', expectBlocked: true },
    { text: 'ENV=stage npm run test:api', expectBlocked: false },
  ]) {
    const claude = run(GUARD, pre('Bash', { command: probe.text })).status === 2;
    const cursor = cursorVerdict({ command: probe.text }) === 'deny';
    check(`same verdict: ${probe.text.slice(0, 38)}`, claude === cursor && claude === probe.expectBlocked, true);
  }
} else {
  console.log(`\nguard-secrets, Cursor adapter — SKIP: ${CURSOR_GUARD} is absent (.cursor/ is local)`);
}

console.log('\nguard-secrets — gaps closed by add-edit-hooks');
check('glob on the journal blocked', run(GUARD, pre('Bash', { command: 'wc -l .agent-log/*.jsonl' })).status, 2);
check('the env template is readable', run(GUARD, pre('Bash', { command: 'cat .env.example' })).status, 0);
check('.env.local still blocked', run(GUARD, pre('Bash', { command: 'cat .env.local' })).status, 2);
check('Grep on static users blocked', run(GUARD, pre('Grep', { pattern: 'password', path: 'test-data/users/static/stage.json' })).status, 2);
check('git commit --no-verify blocked', run(GUARD, pre('Bash', { command: 'git commit --no-verify -m x' })).status, 2);
check('git log -n 5 allowed', run(GUARD, pre('Bash', { command: 'git log -n 5' })).status, 0);

console.log('\npost-edit-check — findings go back to the agent (exit 2)');
const POST_EDIT = '.claude/hooks/post-edit-check.mjs';
const editSandbox = mkdtempSync(join(tmpdir(), 'post-edit-'));
const post = (file_path) => ({ hook_event_name: 'PostToolUse', tool_name: 'Write', tool_input: { file_path }, tool_use_id: 'toolu_selftest' });
const docRel = '.claude/skills/selftest-tmp/SKILL.md';
mkdirSync(join(editSandbox, '.claude/skills/selftest-tmp'), { recursive: true });
writeFileSync(join(editSandbox, docRel), '# Selftest\n\nОткрыть таблицу; spin up the job.\n');
const docRun = run(POST_EDIT, post(join(editSandbox, docRel)), { CLAUDE_PROJECT_DIR: editSandbox });
check('Cyrillic prose + STE finding → exit 2', docRun.status, 2);
check('the finding names the line', /SKILL\.md:3/.test(docRun.stderr), true);
writeFileSync(join(editSandbox, docRel), '# Selftest\n\nOpen the table. Start the job.\n');
check('clean doc → exit 0', run(POST_EDIT, post(join(editSandbox, docRel)), { CLAUDE_PROJECT_DIR: editSandbox }).status, 0);
check('a file outside the scope → exit 0', run(POST_EDIT, post(join(editSandbox, 'utils/x.ts')), { CLAUDE_PROJECT_DIR: editSandbox }).status, 0);
check('malformed input → exit 0', spawnSync('node', [POST_EDIT], { input: '{not json', encoding: 'utf8' }).status, 0);
rmSync(editSandbox, { recursive: true, force: true });

console.log('\nsession-start — prints the newest notes block');
const SESSION_START = '.claude/hooks/session-start.mjs';
const ss = spawnSync('node', [SESSION_START], { input: JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup' }), encoding: 'utf8' });
check('exit 0', ss.status, 0);
check('prints a "## " block', /^## /m.test(ss.stdout), true);

console.log('\nlog-action — writes the journal and never throws');
const env = { CLAUDE_PROJECT_DIR: sandbox };
check('exit 0 on Pre', run(LOGGER, pre('Bash', { command: 'npm run test:api' }), env).status, 0);
check(
  'exit 0 on Post',
  run(
    LOGGER,
    { hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_use_id: 'toolu_selftest', tool_input: {}, tool_response: 'ok' },
    env,
  ).status,
  0,
);
check('exit 0 on malformed input', spawnSync('node', [LOGGER], { input: '{', encoding: 'utf8', env: { ...process.env, ...env } }).status, 0);

const logFile = join(sandbox, '.agent-log', 'actions.jsonl');
check('journal created', existsSync(logFile), true);
if (existsSync(logFile)) {
  const lines = readFileSync(logFile, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  check('entry count', lines.length, 2);
  check('paired by tool_use_id', new Set(lines.map((l) => l.id)).size, 1);
  check('events differ', new Set(lines.map((l) => l.event)).size, 2);
  check('no secrets in the journal', /password|Bearer/i.test(readFileSync(logFile, 'utf8')), false);
}

rmSync(sandbox, { recursive: true, force: true });
console.log(failures === 0 ? '\nAll checks passed.' : `\nFailed: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
