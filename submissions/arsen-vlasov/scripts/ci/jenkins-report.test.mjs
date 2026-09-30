// Tests for scripts/ci/jenkins-report.mjs, one per scenario of
// openspec/specs/jenkins-verify/spec.md. Run: npm run harness:test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verdict, format } from './jenkins-report.mjs';

const dir = fileURLToPath(new URL('./fixtures/', import.meta.url));
const cli = fileURLToPath(new URL('./jenkins-report.mjs', import.meta.url));
const load = (name) => JSON.parse(readFileSync(`${dir}${name}.json`, 'utf8'));
const known = load('known-failures');
const judge = (name, list = known) => {
  const { build, report } = load(name);
  return verdict(build, report, list);
};
const run = (name) =>
  spawnSync(process.execPath, [cli, '--from', `${dir}${name}.json`, '--known', `${dir}known-failures.json`], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH },
  });

// Requirement: Verdict is earned only by executed tests

test('green build with executed tests is PASS with counts', () => {
  const v = judge('green', []);
  assert.equal(v.verdict, 'PASS');
  assert.deepEqual(v.counts, { executed: 120, passed: 120, failed: 0, skipped: 3 });
  assert.match(format(load('green').build, v, 'demo-tests'), /executed 120 · passed 120 · failed 0 · skipped 3/);
});

test('zero executed tests is NOT-EARNED, not PASS', () => {
  const v = judge('zero-executed', []);
  assert.equal(v.verdict, 'NOT-EARNED');
  assert.equal(v.reason, 'no test was executed');
});

test('no test report is NOT-EARNED', () => {
  const v = judge('no-report', []);
  assert.equal(v.verdict, 'NOT-EARNED');
  assert.equal(v.reason, 'no test report — the build broke before or outside the tests');
});

test('running and aborted builds are NOT-EARNED and name the state', () => {
  assert.equal(judge('running').verdict, 'NOT-EARNED');
  assert.match(judge('running').reason, /still running/);
  assert.equal(judge('aborted').verdict, 'NOT-EARNED');
  assert.match(judge('aborted').reason, /ABORTED/);
});

// Requirement: Failures are classified against a known-failures list

test('only known failures is PASS, listed as known with their reason', () => {
  const v = judge('known-only');
  assert.equal(v.verdict, 'PASS');
  assert.equal(v.new.length, 0);
  assert.deepEqual(v.known.map((k) => k.reason), ['stage timeout on the payment step', 'audit log written twice']);
});

test('one new failure among known ones is FAIL', () => {
  const v = judge('new-among-known');
  assert.equal(v.verdict, 'FAIL');
  assert.deepEqual(v.new.map((f) => f.test), ['regression/demo/fresh.spec.ts › brand new failure']);
  assert.equal(v.known.length, 2);
});

test('a known failure that passed is fixed; a listed test absent from the build is stale', () => {
  const v = judge('fixed-and-stale');
  assert.equal(v.verdict, 'PASS');
  assert.deepEqual(v.fixed.map((f) => f.test), ['regression/demo/known.spec.ts › known flaky one']);
  assert.deepEqual(v.stale.map((f) => f.test), [
    'regression/demo/known.spec.ts › known product bug',
    'regression/demo/gone.spec.ts › deleted long ago',
  ]);
  assert.match(format(load('fixed-and-stale').build, v, 'demo-tests'), /remove/i);
});

// Requirement: Output is compact and safe

test('many failures: 15 listed, then "…and 25 more"', () => {
  const out = format(load('many-failures').build, judge('many-failures', []), 'demo-tests');
  assert.equal((out.match(/failing test \d+/g) ?? []).length, 15);
  assert.match(out, /…and 25 more/);
});

test('a bearer token in the error text is redacted', () => {
  const out = format(load('bearer-in-error').build, judge('bearer-in-error', []), 'demo-tests');
  assert.match(out, /Bearer <redacted>/);
  assert.doesNotMatch(out, /eyJhbGciOiJIUzI1NiJ9/);
});

test('only the first line of an error is printed', () => {
  const out = format(load('new-among-known').build, judge('new-among-known'), 'demo-tests');
  assert.match(out, /expected "Ментор" to be visible/);
  assert.doesNotMatch(out, /at line 2/);
});

test('missing credentials: access-error exit code, variable named, no value', () => {
  const r = spawnSync(process.execPath, [cli, 'demo-tests', 'last'], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, DOTENV_CONFIG_PATH: '/nonexistent' },
  });
  assert.equal(r.status, 3);
  assert.match(r.stderr, /JENKINS_(URL|USER|API_TOKEN)/);
});

// Requirement: Exit codes follow the verdict  +  Builds can be read offline

test('offline CLI exit codes: PASS 0, FAIL 1, NOT-EARNED 2', () => {
  assert.equal(run('green').status, 0);
  assert.equal(run('new-among-known').status, 1);
  assert.equal(run('zero-executed').status, 2);
});

test('offline CLI prints the same summary as the core', () => {
  const r = run('new-among-known');
  const { build } = load('new-among-known');
  assert.equal(r.stdout.trim(), format(build, judge('new-among-known'), 'demo-tests').trim());
});

// Data source: the Allure plugin's data/suites.json (design.md, "Data source")

test('Allure tree converts to cases: identity is "<spec> › <name>", describes are skipped over', async () => {
  const { fromAllure } = await import('./jenkins-report.mjs');
  const cases = fromAllure(load('allure-suites')).suites.flatMap((s) => s.cases);
  assert.deepEqual(
    cases.map((c) => `${c.className} › ${c.name}`),
    [
      'regression/demo/area.spec.ts › passes',
      'regression/demo/area.spec.ts › fails on an assertion',
      'regression/demo/area.spec.ts › breaks in a fixture',
      'regression/demo/area.spec.ts › is skipped',
      'regression/demo/area.spec.ts › has unknown status',
      'api/demo/endpoint.spec.ts › returns 200',
    ],
  );
});

test('Allure statuses: broken counts as a failure, unknown as skipped', async () => {
  const { fromAllure } = await import('./jenkins-report.mjs');
  const v = verdict({ result: 'FAILURE', building: false }, fromAllure(load('allure-suites')), []);
  assert.deepEqual(v.counts, { executed: 4, passed: 2, failed: 2, skipped: 2 });
  assert.equal(v.verdict, 'FAIL');
  assert.ok(v.new.some((f) => f.test === 'regression/demo/area.spec.ts › breaks in a fixture'));
});

test('offline CLI accepts a saved build with an Allure tree', () => {
  const r = run('allure-build');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /demo-allure #7/);
  assert.match(r.stdout, /executed 4 · passed 2 · failed 2 · skipped 2/);
});

// Change scope-known-failures-by-job: stale only among this job's entries

test('an entry for another job is not stale; one for this job, or with no job, is', () => {
  const { build, report } = load('fixed-and-stale');
  const list = [
    { test: 'regression/demo/other.spec.ts › belongs elsewhere', reason: 'x', job: 'another-job' },
    { test: 'regression/demo/mine.spec.ts › gone from my job', reason: 'x', job: 'demo-tests' },
    { test: 'regression/demo/any.spec.ts › no job named', reason: 'x' },
  ];
  const v = verdict(build, report, list, 'demo-tests');
  assert.deepEqual(v.stale.map((k) => k.test), [
    'regression/demo/mine.spec.ts › gone from my job',
    'regression/demo/any.spec.ts › no job named',
  ]);
});
