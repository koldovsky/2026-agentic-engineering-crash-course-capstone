// Tests for openspec/specs/stabilize-loop/spec.md. Run: npm run harness:test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STOP,
  parseArgs,
  summarize,
  signature,
  decide,
  weakening,
  changedProtected,
  agentVerdict,
  parseAgentOutput,
  checkStep,
  buildPrompt,
  renderReport,
  exitCode,
  runLoop,
  UsageError,
} from './stabilize.mjs';

const LIMITS = { repeat: 5, attempts: 3, minutes: 20, budget: 3, stall: 2 };
const MIN = 60_000;
const CAL = 'Calendar view mode dropdown options did not load within 15000ms';

/** A Playwright JSON report: `passed` green tests and one red test per entry of `failed`. */
function pwReport({ passed = 0, failed = [], errors = [] } = {}) {
  const red = failed.map((f) => ({
    title: f.title,
    tests: [
      {
        status: 'unexpected',
        results: [
          {
            status: 'failed',
            error: { message: f.message },
            attachments: [{ name: 'error-context', path: '/tmp/r/error-context.md' }],
            steps: [{ title: 'Precondition' }, { title: f.step ?? '1. Open', error: { message: f.message } }],
          },
        ],
      },
    ],
  }));
  const green = Array.from({ length: passed }, () => ({ title: 'Green', tests: [{ status: 'expected', results: [{ status: 'passed' }] }] }));
  return {
    stats: { expected: passed, unexpected: failed.length, flaky: 0, skipped: 0 },
    errors,
    suites: [{ title: 'regression/lms/x.spec.ts', specs: [], suites: [{ title: 'Calendar', specs: [...red, ...green] }] }],
  };
}

const fail = (message = CAL, title = 'Верифікація календаря активностей') => pwReport({ passed: 2, failed: [{ title, message }] });
const green = (n = 5) => pwReport({ passed: n });
const agent = ({ cost = 0.5, verdict = 'VERDICT: FIXED — wait for the options list', ...rest } = {}) => ({
  stdout: JSON.stringify({
    type: 'result',
    subtype: 'success',
    is_error: false,
    total_cost_usd: cost,
    num_turns: 7,
    session_id: 's-1',
    result: `I changed the POM.\n${verdict}`,
    ...rest,
  }),
});

/** Fake side effects for runLoop. Each test run and each agent run moves the clock by 1 minute. */
function fakeDeps({ runs, agents = [], checks = [], clean = true, hashes, diffs = [] }) {
  let clock = 0;
  const calls = { tests: 0, agents: 0, checks: 0, hashes: 0, budgets: [], prompts: [], restored: [], reports: [] };
  const deps = {
    now: () => clock,
    isClean: () => clean,
    runTests: () => {
      const r = runs[calls.tests++];
      clock += r.ms ?? MIN;
      return r.timedOut ? { timedOut: true } : { report: r };
    },
    runCheck: () => checks[calls.checks++] ?? { ok: true, output: '', step: '' },
    runAgent: ({ prompt, budgetLeft }) => {
      calls.prompts.push(prompt);
      calls.budgets.push(budgetLeft);
      const a = agents[calls.agents++] ?? agent();
      clock += a.ms ?? MIN;
      return a;
    },
    hashProtected: () => (hashes ? hashes[calls.hashes++] : { 'ci/known-failures.json': 'h1' }),
    diff: () => diffs[calls.agents - 1] ?? '',
    changedFiles: () => ['page-objects/lms/courses/activity-calendar-page.ts'],
    restore: (paths) => calls.restored.push(...paths),
    writeReport: (markdown, meta) => {
      calls.reports.push({ markdown, meta });
      return 'docs/loops/2026-09-30-x.md';
    },
  };
  return { deps, calls };
}

const options = { spec: 'tests/specs/regression/lms/x.spec.ts', model: 'opus', ...LIMITS };

// Requirement: Green means five passes and a green check

test('summarize: counts, title path, first error lines, the failed step, the page snapshot', () => {
  const run = summarize(fail(`\u001b[31m${CAL}\u001b[39m\n  at x.ts:1`));
  assert.equal(run.executed, 3);
  assert.equal(run.passed, 2);
  assert.equal(run.failed, 1);
  assert.equal(run.failures[0].title, 'Calendar › Верифікація календаря активностей');
  assert.equal(run.failures[0].error, `${CAL}\n  at x.ts:1`);
  assert.equal(run.failures[0].step, '1. Open');
  assert.equal(run.failures[0].context, '/tmp/r/error-context.md');
});

test('summarize: no report or a global error means 0 executed, with the reason', () => {
  assert.equal(summarize(null).executed, 0);
  const broken = summarize(pwReport({ errors: [{ message: 'Error: No tests found' }] }));
  assert.equal(broken.executed, 0);
  assert.match(broken.errors[0], /No tests found/);
});

test('five of five after a fix is GREEN after 1 attempt, exit 0', () => {
  const { deps, calls } = fakeDeps({ runs: [fail(), green()], checks: [{ ok: true }] });
  const r = runLoop(options, deps);
  assert.equal(r.stop, STOP.GREEN);
  assert.equal(r.attempts.length, 1);
  assert.equal(calls.checks, 1);
  assert.equal(exitCode(r.stop), 0);
});

test('zero tests is NOT_EARNED, exit 1, and the agent does not start', () => {
  const { deps, calls } = fakeDeps({ runs: [pwReport()] });
  const r = runLoop(options, deps);
  assert.equal(r.stop, STOP.NOT_EARNED);
  assert.equal(calls.agents, 0);
  assert.equal(exitCode(r.stop), 1);
});

test('a first run of 5 of 5 is NOT_REPRODUCED, exit 0, no agent and no check', () => {
  const { deps, calls } = fakeDeps({ runs: [green()] });
  const r = runLoop(options, deps);
  assert.equal(r.stop, STOP.NOT_REPRODUCED);
  assert.equal(calls.agents, 0);
  assert.equal(calls.checks, 0);
  assert.equal(exitCode(r.stop), 0);
});

test('green tests with a red check are not GREEN, and the next prompt gets the check output', () => {
  const { deps, calls } = fakeDeps({
    runs: [fail(), green(), green()],
    checks: [{ ok: false, step: 'rules:lint', output: 'NEW no-wait-for-timeout page-objects/x.ts:12' }, { ok: true }],
  });
  const r = runLoop(options, deps);
  assert.equal(r.stop, STOP.GREEN);
  assert.equal(r.attempts.length, 2);
  assert.match(calls.prompts[1], /npm run check/);
  assert.match(calls.prompts[1], /no-wait-for-timeout/);
});

test('checkStep: the last npm script header is the step that failed', () => {
  const out = '> p@1.0.0 check\n> npm run typecheck\n\n> p@1.0.0 typecheck\n> tsc --noEmit\n\n> p@1.0.0 lint\n> eslint .\n\n  12:3  error  x\n';
  assert.equal(checkStep(out), 'lint');
});

// Requirement: Hard limits stop the loop

test('signature: sorted titles and first error lines, digits folded', () => {
  const a = summarize(fail('Activity "x - 2026-09-28T00:29:32.959Z" is not visible\nstack'));
  const b = summarize(fail('Activity "x - 2026-09-30T11:02:07.001Z" is not visible\nother stack'));
  assert.equal(signature(a), signature(b));
  assert.notEqual(signature(a), signature(summarize(fail(CAL))));
  assert.equal(signature(summarize(green())), '');
});

test('three attempts with a different failure each time is MAX_ATTEMPTS, exit 1', () => {
  const { deps } = fakeDeps({ runs: [fail('A 1'), fail('B 1'), fail('C 1'), fail('D 1')] });
  const r = runLoop(options, deps);
  assert.equal(r.stop, STOP.MAX_ATTEMPTS);
  assert.equal(r.attempts.length, 3);
  assert.equal(exitCode(r.stop), 1);
});

test('3.20 USD after attempt 2 is BUDGET before attempt 3, and each run gets the remaining budget', () => {
  const { deps, calls } = fakeDeps({ runs: [fail('A'), fail('B'), fail('C')], agents: [agent({ cost: 1.6 }), agent({ cost: 1.6 })] });
  const r = runLoop(options, deps);
  assert.equal(r.stop, STOP.BUDGET);
  assert.equal(r.attempts.length, 2);
  assert.deepEqual(calls.budgets, [3, 1.4]);
});

test('an agent run that hits --max-budget-usd is BUDGET', () => {
  const { deps } = fakeDeps({ runs: [fail()], agents: [agent({ subtype: 'error_max_budget_usd', is_error: true, cost: 3.05 })] });
  assert.equal(runLoop(options, deps).stop, STOP.BUDGET);
});

test('the same failure in runs 0, 1 and 2, with only numbers changed, is STALL before attempt 3', () => {
  const { deps } = fakeDeps({
    runs: [fail(CAL), fail(CAL.replace('15000', '15001')), fail(CAL.replace('15000', '9999'))],
  });
  const r = runLoop(options, deps);
  assert.equal(r.stop, STOP.STALL);
  assert.equal(r.attempts.length, 2);
});

test('the end of the 20 minutes during a test run is TIME', () => {
  const { deps } = fakeDeps({ runs: [fail(), { timedOut: true }] });
  const r = runLoop(options, deps);
  assert.equal(r.stop, STOP.TIME);
  assert.equal(exitCode(r.stop), 1);
});

test('decide: time and budget are checked before the next attempt', () => {
  const runs = [summarize(fail())];
  assert.equal(decide({ runs, attempts: 1, spent: 0, elapsedMs: 20 * MIN, limits: LIMITS }), STOP.TIME);
  assert.equal(decide({ runs, attempts: 1, spent: 3, elapsedMs: MIN, limits: LIMITS }), STOP.BUDGET);
  assert.equal(decide({ runs, attempts: 1, spent: 0, elapsedMs: MIN, limits: LIMITS }), null);
});

// Requirement: The agent cannot weaken the test or change the harness

test('weakening: a skip, a fixed wait, retries and a timeout are findings', () => {
  const diff = [
    '--- a/tests/specs/x.spec.ts',
    '+++ b/tests/specs/x.spec.ts',
    "+test.skip('flaky', async () => {});",
    '+    await this.page.waitForTimeout(3000);',
    '+test.describe.configure({ retries: 2 });',
    '+    test.setTimeout(500_000);',
    '+    await this.options.waitFor({ state: "visible" });',
  ].join('\n');
  const found = weakening(diff);
  assert.equal(found.length, 4);
  assert.match(found.join('\n'), /test\.skip/);
  assert.match(found.join('\n'), /waitForTimeout/);
});

test('weakening: a removed should call is a finding, and a commented-out one does not count as added', () => {
  const removed = '-    await activityCalendarPage.shouldSeeActivity(activityTitle);\n+    await activityCalendarPage.clickDay();';
  assert.equal(weakening(removed).length, 1);
  const commented = '-    await x.shouldSeeActivity(t);\n+    // await x.shouldSeeActivity(t);';
  assert.equal(weakening(commented).length, 1);
  const moved = '-    await x.shouldSeeActivity(t);\n+    await x.shouldSeeActivity(t, { mode });';
  assert.deepEqual(weakening(moved), []);
});

test('a skip added by the agent is WEAKENED: the report has the diff, and the files are restored', () => {
  const diff = "--- a/tests/specs/x.spec.ts\n+++ b/tests/specs/x.spec.ts\n+test.skip('flaky', async () => {});";
  const { deps, calls } = fakeDeps({ runs: [fail()], diffs: [diff] });
  const r = runLoop(options, deps);
  assert.equal(r.stop, STOP.WEAKENED);
  assert.deepEqual(calls.restored, ['page-objects/lms/courses/activity-calendar-page.ts']);
  assert.match(calls.reports[0].markdown, /test\.skip/);
});

test('changedProtected: changed, added and removed paths', () => {
  const before = { 'ci/known-failures.json': 'a', 'package.json': 'b', 'scripts/x.mjs': 'c' };
  const after = { 'ci/known-failures.json': 'z', 'package.json': 'b', '.claude/new.md': 'd' };
  assert.deepEqual(changedProtected(before, after), ['.claude/new.md', 'ci/known-failures.json', 'scripts/x.mjs']);
});

test('a changed hash of ci/known-failures.json is PROTECTED, and the file is restored', () => {
  const { deps, calls } = fakeDeps({
    runs: [fail()],
    hashes: [{ 'ci/known-failures.json': 'h1' }, { 'ci/known-failures.json': 'h2' }],
  });
  const r = runLoop(options, deps);
  assert.equal(r.stop, STOP.PROTECTED);
  assert.ok(calls.restored.includes('ci/known-failures.json'));
});

// Requirement: The agent can say that the product is wrong

test('agentVerdict: the last VERDICT line wins, and no line is UNKNOWN', () => {
  assert.equal(agentVerdict('x\nVERDICT: FIXED — a\nmore\nVERDICT: PRODUCT_BUG — b').kind, 'PRODUCT_BUG');
  assert.equal(agentVerdict('VERDICT: PRODUCT_BUG — b').line, 'VERDICT: PRODUCT_BUG — b');
  assert.equal(agentVerdict('I fixed it.').kind, 'UNKNOWN');
});

test('a PRODUCT_BUG verdict stops the loop, exit 1, and the report names bug-report', () => {
  const { deps, calls } = fakeDeps({
    runs: [fail()],
    agents: [agent({ verdict: 'VERDICT: PRODUCT_BUG — the role search does not filter the table' })],
  });
  const r = runLoop(options, deps);
  assert.equal(r.stop, STOP.PRODUCT_BUG);
  assert.equal(exitCode(r.stop), 1);
  assert.match(calls.reports[0].markdown, /bug-report/);
});

test('an agent run with no JSON on stdout is AGENT_ERROR', () => {
  const { deps } = fakeDeps({ runs: [fail()], agents: [{ stdout: 'Error: not logged in' }] });
  assert.equal(runLoop(options, deps).stop, STOP.AGENT_ERROR);
  assert.equal(parseAgentOutput('').ok, false);
});

test('the prompt has the failure, the page snapshot, the bans, the verdict format and the earlier verdicts', () => {
  const { deps, calls } = fakeDeps({ runs: [fail('A 1'), fail('B 1'), green()] });
  runLoop(options, deps);
  const [first, second] = calls.prompts;
  assert.match(first, /A 1/);
  assert.match(first, /error-context\.md/);
  assert.match(first, /waitForTimeout/);
  assert.match(first, /VERDICT: PRODUCT_BUG/);
  assert.equal(buildPrompt({ options, run: summarize(fail()), attempts: [] }).includes('Earlier attempts'), false);
  assert.match(second, /Earlier attempts/);
  assert.match(second, /wait for the options list/);
});

// Requirement: Each loop leaves a report and no commit

test('a dirty tree is a usage error before any run', () => {
  const { deps, calls } = fakeDeps({ runs: [fail()], clean: false });
  assert.throws(() => runLoop(options, deps), UsageError);
  assert.equal(calls.tests, 0);
  assert.equal(exitCode('usage'), 3);
});

test('every stop reason writes one report', () => {
  for (const runs of [[green()], [pwReport()], [fail(), green()]]) {
    const { deps, calls } = fakeDeps({ runs });
    runLoop(options, deps);
    assert.equal(calls.reports.length, 1);
  }
});

test('renderReport: one row per run, the same failure has the same id, the stop reason and the cost', () => {
  const runs = [summarize(fail(CAL)), summarize(fail(CAL)), summarize(green())];
  const md = renderReport({
    options,
    runs,
    attempts: [
      { cost: 0.4, turns: 5, sessionId: 's-1', verdict: { line: 'VERDICT: FIXED — a' }, files: ['page-objects/a.ts'] },
      { cost: 0.6, turns: 6, sessionId: 's-2', verdict: { line: 'VERDICT: FIXED — b' }, files: ['page-objects/a.ts'] },
    ],
    stop: STOP.GREEN,
    spent: 1,
    startedAt: new Date('2026-09-30T10:00:00Z'),
    elapsedMs: 9 * MIN,
    diff: '+ok',
  });
  assert.match(md, /GREEN/);
  assert.match(md, /1\.00 USD/);
  assert.equal((md.match(/^\| [0-9]+ \|/gm) ?? []).length, 5);
  assert.equal((md.match(/\| F1 \|/g) ?? []).length, 2);
  assert.match(md, /VERDICT: FIXED — b/);
});

test('parseArgs: defaults, options, and a missing spec', () => {
  const o = parseArgs(['tests/specs/regression/lms/x.spec.ts', '--grep', 'Верифікація', '--workers', '4']);
  assert.deepEqual(
    { spec: o.spec, grep: o.grep, workers: o.workers, repeat: o.repeat, attempts: o.attempts, minutes: o.minutes, budget: o.budget, stall: o.stall, model: o.model },
    { spec: 'tests/specs/regression/lms/x.spec.ts', grep: 'Верифікація', workers: 4, repeat: 5, attempts: 3, minutes: 20, budget: 3, stall: 2, model: 'opus' },
  );
  assert.equal(parseArgs(['x.spec.ts', '--budget', '1.5', '--model', 'sonnet']).budget, 1.5);
  assert.throws(() => parseArgs([]), UsageError);
  assert.throws(() => parseArgs(['x.spec.ts', '--attempts', 'many']), UsageError);
});
