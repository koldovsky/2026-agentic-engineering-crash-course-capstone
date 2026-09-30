#!/usr/bin/env node
/**
 * Stabilize loop: run one spec on stage until it is stable, with an agent that fixes the test code
 * between the runs. Spec: openspec/specs/stabilize-loop/spec.md
 *
 *   npm run loop:stabilize -- <spec> [--grep <title>] [--workers <n>] [--repeat 5] [--attempts 3]
 *                                    [--minutes 20] [--budget 3] [--stall 2] [--model opus]
 *
 * One iteration: playwright --repeat-each → on a failure, `claude -p` fixes page-objects/, tests/ or
 * utils/ → hash and weakening checks → run again. Stops on GREEN or on a hard limit. Never commits.
 * The report goes to docs/loops/. Exit 0 GREEN or NOT_REPRODUCED · 1 other stop · 3 usage error.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const LOOPS_DIR = 'docs/loops';

export const STOP = Object.freeze({
  GREEN: 'GREEN',
  NOT_REPRODUCED: 'NOT_REPRODUCED',
  NOT_EARNED: 'NOT_EARNED',
  MAX_ATTEMPTS: 'MAX_ATTEMPTS',
  TIME: 'TIME',
  BUDGET: 'BUDGET',
  STALL: 'STALL',
  PROTECTED: 'PROTECTED',
  WEAKENED: 'WEAKENED',
  PRODUCT_BUG: 'PRODUCT_BUG',
  AGENT_ERROR: 'AGENT_ERROR',
});

export const DEFAULTS = Object.freeze({ repeat: 5, attempts: 3, minutes: 20, budget: 3, stall: 2, model: 'opus' });

/** The folders the agent may edit. The weakening check reads their diff. */
export const EDITABLE = ['page-objects', 'tests', 'utils'];

/** Tracked files that the agent must not change. */
export const PROTECTED_PATHS = [
  '.claude',
  'scripts',
  'ci',
  '.githooks',
  'openspec',
  'test-data',
  'config',
  '.rules-lint-baseline.json',
  '.ste-baseline.json',
  '.docs-language-baseline.json',
  'eslint-suppressions.json',
  'package.json',
  'package-lock.json',
  'playwright.config.ts',
];

const WEAK_PATTERNS = [
  [/\b(test|describe)(\.\w+)*\.(skip|fixme|only|fail)\b/, 'a skipped, focused or expected-to-fail test'],
  [/waitForTimeout/, 'a fixed wait (waitForTimeout)'],
  [/setTimeout/, 'a changed test timeout (setTimeout)'],
  [/\bretries\b/, 'retries'],
];
const SHOULD_CALL = /\.should\w*\(/g;
const ERROR_LINES = 15;
const DIFF_LINES = 200;

export class UsageError extends Error {}

const stripAnsi = (text = '') => stripVTControlCharacters(text);
const firstLine = (text = '') => text.trim().split('\n')[0] ?? '';
const money = (usd) => `${usd.toFixed(2)} USD`;
const minutes = (ms) => (ms === undefined ? '—' : `${(ms / 60_000).toFixed(1)} min`);

export function parseArgs(argv) {
  const out = { ...DEFAULTS, spec: undefined, grep: undefined, workers: undefined };
  const numeric = ['repeat', 'attempts', 'minutes', 'budget', 'stall', 'workers'];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      if (out.spec) throw new UsageError(`one spec only, got "${out.spec}" and "${arg}"`);
      out.spec = arg;
      continue;
    }
    const name = arg.slice(2);
    const value = argv[++i];
    if (!(name in out) || name === 'spec') throw new UsageError(`unknown option ${arg}`);
    if (value === undefined) throw new UsageError(`${arg} needs a value`);
    if (numeric.includes(name)) {
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) throw new UsageError(`${arg} needs a positive number, got "${value}"`);
      out[name] = n;
    } else {
      out[name] = value;
    }
  }
  if (!out.spec) {
    throw new UsageError('usage: npm run loop:stabilize -- <spec> [--grep <title>] [--workers <n>] [--attempts 3] [--minutes 20] [--budget 3]');
  }
  return out;
}

/** A Playwright JSON report → counts and a short description of each failure. */
export function summarize(report) {
  if (!report) return { executed: 0, passed: 0, failed: 0, failures: [], errors: ['no JSON report: Playwright did not finish'] };
  const s = report.stats ?? {};
  const passed = s.expected ?? 0;
  const failed = (s.unexpected ?? 0) + (s.flaky ?? 0);
  const failures = [];
  const walk = (suite, path) => {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        if (t.status !== 'unexpected' && t.status !== 'flaky') continue;
        const result = (t.results ?? []).find((r) => r.status !== 'passed' && r.status !== 'skipped') ?? t.results?.[0] ?? {};
        const message = stripAnsi(result.error?.message ?? result.errors?.[0]?.message ?? '(no error text)');
        failures.push({
          title: [...path, spec.title].join(' › '),
          error: message.split('\n').slice(0, ERROR_LINES).join('\n'),
          step: (result.steps ?? []).find((st) => st.error)?.title,
          context: (result.attachments ?? []).find((a) => a.name === 'error-context')?.path,
        });
      }
    }
    for (const child of suite.suites ?? []) walk(child, [...path, child.title]);
  };
  for (const fileSuite of report.suites ?? []) walk(fileSuite, []);
  const errors = (report.errors ?? []).map((e) => stripAnsi(e.message ?? String(e)));
  return { executed: passed + failed, passed, failed, failures, errors };
}

/** The same failure with other numbers (timeouts, dates, ids) gives the same signature. */
export function signature(run) {
  return run.failures
    .map((f) => `${f.title} :: ${firstLine(f.error)}`.replace(/\d+/g, '#'))
    .sort()
    .join('\n');
}

const isGreen = (run) => run.executed > 0 && run.failed === 0 && run.checkOk !== false;

/** After a test run: the stop reason, or null for one more attempt. */
export function decide({ runs, attempts, spent, elapsedMs, limits }) {
  const last = runs.at(-1);
  if (last.executed === 0) return STOP.NOT_EARNED;
  if (isGreen(last)) return attempts === 0 ? STOP.NOT_REPRODUCED : STOP.GREEN;
  if (elapsedMs >= limits.minutes * 60_000) return STOP.TIME;
  if (spent >= limits.budget) return STOP.BUDGET;
  const recent = runs.slice(-(limits.stall + 1));
  if (recent.length === limits.stall + 1 && new Set(recent.map(signature)).size === 1) return STOP.STALL;
  if (attempts >= limits.attempts) return STOP.MAX_ATTEMPTS;
  return null;
}

const isComment = (code) => /^\s*(\/\/|\/?\*)/.test(code);

/** Findings in a unified diff that make a test weaker. Empty when the diff is clean. */
export function weakening(diff) {
  const findings = [];
  let added = 0;
  let removed = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    const code = line.slice(1);
    if (line.startsWith('+')) {
      const hit = WEAK_PATTERNS.find(([re]) => re.test(code));
      if (hit) findings.push(`added ${hit[1]}: ${code.trim()}`);
      if (!isComment(code)) added += (code.match(SHOULD_CALL) ?? []).length;
    } else if (line.startsWith('-') && !isComment(code)) {
      removed += (code.match(SHOULD_CALL) ?? []).length;
    }
  }
  if (removed > added) findings.push(`removed ${removed - added} should…( call(s) more than it added`);
  return findings;
}

export function changedProtected(before, after) {
  const paths = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...paths].filter((p) => before[p] !== after[p]).sort();
}

export function agentVerdict(text = '') {
  const lines = text.split('\n').filter((l) => /^VERDICT:\s*(FIXED|PRODUCT_BUG|UNKNOWN)\b/.test(l.trim()));
  const line = lines.at(-1)?.trim();
  if (!line) return { kind: 'UNKNOWN', line: '(no VERDICT line)' };
  return { kind: line.match(/^VERDICT:\s*(\w+)/)[1], line };
}

/** `claude -p --output-format json` stdout → cost, session and text. */
export function parseAgentOutput(stdout = '') {
  let json;
  try {
    json = JSON.parse(stdout.trim());
  } catch {
    return { ok: false, cost: 0, error: `no JSON result: ${firstLine(stdout) || '(empty stdout)'}` };
  }
  const cost = Number(json.total_cost_usd ?? 0);
  const base = { cost, sessionId: json.session_id, turns: json.num_turns, text: json.result ?? '' };
  if (/budget/i.test(json.subtype ?? '')) return { ...base, ok: false, budgetHit: true, error: json.subtype };
  if (json.is_error || json.subtype !== 'success') return { ...base, ok: false, error: json.subtype ?? 'is_error' };
  return { ...base, ok: true };
}

/** `npm run check` stops at the first red step. That step is the last npm script header. */
export function checkStep(output = '') {
  const names = [...output.matchAll(/^> \S+@\S+ (\S+)/gm)].map((m) => m[1]);
  return names.at(-1) ?? 'check';
}

export function buildPrompt({ options, run, attempts }) {
  const target = `${options.spec}${options.grep ? ` (--grep "${options.grep}")` : ''}`;
  const failures = run.failures.map((f) =>
    [
      `### ${f.title}`,
      f.step ? `Failed step: ${f.step}` : null,
      f.context ? `Page snapshot at the failure: ${f.context} (read it: it is the ARIA tree of the page when the test failed)` : null,
      '```',
      f.error,
      '```',
    ]
      .filter(Boolean)
      .join('\n'),
  );
  const earlier = attempts.length
    ? ['', 'Earlier attempts in this loop. Their fixes are in the working tree now:', ...attempts.map((a) => `- attempt ${a.n}: ${a.verdict.line}`)]
    : [];
  return [
    'You are the fix step of a stabilize loop in this repository.',
    `The loop runs a Playwright spec on stage with --repeat-each=${options.repeat} and no retries.`,
    'You do not run tests. The loop runs the spec again after your edit.',
    '',
    `Target: ${target}`,
    `Last run: ${run.passed} of ${run.executed} passed.`,
    '',
    'Failures:',
    ...failures,
    ...earlier,
    '',
    'What to do:',
    '1. Read the spec, its page objects and helpers. Find the root cause of the failure.',
    '2. Fix the test code in page-objects/, tests/ or utils/. Follow the project rules in .claude/rules/.',
    '3. Wait for a real state (a locator, a response, a text), not for time.',
    '',
    'Do not:',
    '- skip, fixme, only or fail a test, add retries, or call waitForTimeout or setTimeout',
    '- remove or loosen a should… check, or change an expected value',
    '- edit anything outside page-objects/, tests/ and utils/',
    '',
    'If the test is right and the product behaves wrong, change nothing and say so.',
    '',
    'End your answer with exactly one of these lines:',
    'VERDICT: FIXED — <the cause and the fix, one sentence>',
    'VERDICT: PRODUCT_BUG — <what the product does wrong, one sentence>',
    'VERDICT: UNKNOWN — <what you could not find out, one sentence>',
  ].join('\n');
}

const NEXT_STEP = {
  GREEN: 'The spec passed every repeat after the fix, and `npm run check` is green. Review the diff. Then give the spec to `spec-reviewer`, and commit by hand.',
  NOT_REPRODUCED: 'The spec passed every repeat on the first run, so the agent did not start. The failure did not repeat locally. Try more workers, or wait for the next Jenkins build.',
  NOT_EARNED: 'The run executed 0 tests. Check the spec path and the `--grep` value.',
  MAX_ATTEMPTS: 'The agent used all its attempts, and the spec still fails. Review the diff. A person continues from here.',
  TIME: 'The time limit stopped the loop. Review the diff. A person continues from here.',
  BUDGET: 'The budget limit stopped the loop. Review the diff. A person continues from here.',
  STALL: 'The fix attempts did not change the failure. The cause is probably outside the test code. Use the `bug-report` skill to decide.',
  PROTECTED: 'The agent changed a protected file. The loop restored the changed files. Read the diff below.',
  WEAKENED: 'The agent made the test weaker. The loop restored the changed files. Read the findings and the diff below.',
  PRODUCT_BUG: 'The agent says that the product is wrong. Use the `bug-report` skill to check this and to write the draft.',
  AGENT_ERROR: 'The agent run failed. Read the error below.',
};

const cell = (text) => String(text).replace(/\|/g, '\\|').replace(/`/g, "'");

export function renderReport({ options, runs, attempts, stop, spent, startedAt, elapsedMs, diff, findings = [], error }) {
  const ids = new Map();
  const idOf = (sig) => {
    if (!sig) return '—';
    if (!ids.has(sig)) ids.set(sig, `F${ids.size + 1}`);
    return ids.get(sig);
  };
  const runRows = runs.map((r, i) => {
    const failure = r.executed === 0 ? 'no test' : idOf(signature(r));
    return `| ${i} | ${r.passed} of ${r.executed} | ${failure} | ${minutes(r.ms)} |`;
  });
  const attemptRows = attempts.map(
    (a) => `| ${a.n ?? attempts.indexOf(a) + 1} | ${money(a.cost ?? 0)} | ${a.turns ?? '—'} | ${a.sessionId ? `\`${a.sessionId}\`` : '—'} | ${a.files?.length ? a.files.map((f) => `\`${cell(f)}\``).join(', ') : 'none'} |`,
  );
  const signatures = [...ids].map(([sig, id]) => `${id}:\n${sig}`).join('\n\n');
  const diffLines = (diff ?? '').split('\n');
  const shownDiff = diffLines.length > DIFF_LINES ? [...diffLines.slice(0, DIFF_LINES), `… ${diffLines.length - DIFF_LINES} more lines`] : diffLines;
  const command = ['npm run loop:stabilize --', options.spec, options.grep ? `--grep "${options.grep}"` : '', options.workers ? `--workers ${options.workers}` : '']
    .filter(Boolean)
    .join(' ');

  return [
    `# Stabilize loop: ${basename(options.spec)}`,
    '',
    `- Target: \`${options.spec}\`${options.grep ? `, grep \`${cell(options.grep)}\`` : ''}.`,
    `- Command: \`${command}\`.`,
    `- Start: ${startedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC. Wall time: ${minutes(elapsedMs)}.`,
    `- Limits: ${options.attempts} attempts, ${options.minutes} min, ${money(options.budget)}, stall ${options.stall}. Repeats in each run: ${options.repeat}. Model: \`${options.model}\`.`,
    `- Stop reason: **${stop}**.`,
    `- Agent cost: ${money(spent)} in ${attempts.length} attempt(s).`,
    '',
    NEXT_STEP[stop] ?? '',
    '',
    '## Runs',
    '',
    'The same failure id in two rows means the same failure signature.',
    '',
    '| Run | Passed | Failure | Time |',
    '|---|---|---|---|',
    ...runRows,
    '',
    ...(signatures ? ['Failure signatures (digits folded to `#`):', '', '```text', signatures, '```', ''] : []),
    '## Attempts',
    '',
    ...(attempts.length
      ? ['| Attempt | Cost | Turns | Session | Changed files |', '|---|---|---|---|---|', ...attemptRows, '', 'Verdict lines of the agent:', '', '```text', ...attempts.map((a, i) => `attempt ${a.n ?? i + 1}: ${a.verdict?.line ?? '(none)'}`), '```', '']
      : ['The agent did not start.', '']),
    ...(findings.length ? ['## Findings', '', '```text', ...findings, '```', ''] : []),
    ...(error ? ['## Error', '', '```text', error, '```', ''] : []),
    '## Diff',
    '',
    ...(diff?.trim() ? ['```diff', ...shownDiff, '```'] : ['No change in the working tree.']),
    '',
  ].join('\n');
}

export const exitCode = (stop) => (stop === STOP.GREEN || stop === STOP.NOT_REPRODUCED ? 0 : stop in STOP ? 1 : 3);

/** The whole loop. `deps` holds every side effect, so the tests can give fakes. */
export function runLoop(options, deps) {
  if (!deps.isClean()) throw new UsageError('tracked files have uncommitted changes. Commit or stash them first');
  const limits = { attempts: options.attempts, minutes: options.minutes, budget: options.budget, stall: options.stall };
  const startedAt = deps.now();
  const elapsed = () => deps.now() - startedAt;
  const timeLeft = () => Math.max(0, options.minutes * 60_000 - elapsed());
  const runs = [];
  const attempts = [];
  let spent = 0;
  let stop = null;
  let findings = [];
  let error;
  let diff = '';

  while (!stop) {
    const t0 = deps.now();
    const tests = deps.runTests({ options, timeLeftMs: timeLeft() });
    if (tests.timedOut) {
      stop = STOP.TIME;
      break;
    }
    const run = summarize(tests.report);
    if (run.executed > 0 && run.failed === 0 && attempts.length > 0) {
      const check = deps.runCheck({ timeLeftMs: timeLeft() });
      run.checkOk = Boolean(check.ok);
      if (!check.ok) run.failures = [{ title: 'npm run check', error: `failed step: ${check.step}\n${check.output ?? ''}`.trim() }];
    }
    run.ms = deps.now() - t0;
    runs.push(run);

    stop = decide({ runs, attempts: attempts.length, spent, elapsedMs: elapsed(), limits });
    if (stop) break;

    const before = deps.hashProtected();
    const budgetLeft = Math.round((options.budget - spent) * 100) / 100;
    const a0 = deps.now();
    const out = deps.runAgent({ options, prompt: buildPrompt({ options, run, attempts }), budgetLeft, timeLeftMs: timeLeft() });
    if (out.timedOut) {
      attempts.push({ n: attempts.length + 1, cost: 0, verdict: { line: '(stopped by the time limit)' }, files: deps.changedFiles() });
      stop = STOP.TIME;
      break;
    }
    const parsed = parseAgentOutput(out.stdout);
    spent += parsed.cost;
    const verdict = agentVerdict(parsed.text);
    attempts.push({ n: attempts.length + 1, cost: parsed.cost, turns: parsed.turns, sessionId: parsed.sessionId, verdict, files: deps.changedFiles(), ms: deps.now() - a0 });

    const touched = changedProtected(before, deps.hashProtected());
    diff = deps.diff();
    const weak = weakening(diff);
    if (touched.length || weak.length) {
      stop = touched.length ? STOP.PROTECTED : STOP.WEAKENED;
      findings = [...touched.map((p) => `protected file changed: ${p}`), ...weak];
      deps.restore([...new Set([...deps.changedFiles(), ...touched])]);
    } else if (parsed.budgetHit) {
      stop = STOP.BUDGET;
    } else if (!parsed.ok) {
      stop = STOP.AGENT_ERROR;
      error = parsed.error;
    } else if (verdict.kind === 'PRODUCT_BUG') {
      stop = STOP.PRODUCT_BUG;
    }
  }

  if (stop !== STOP.PROTECTED && stop !== STOP.WEAKENED) diff = deps.diff();
  const markdown = renderReport({ options, runs, attempts, stop, spent, startedAt: new Date(startedAt), elapsedMs: elapsed(), diff, findings, error });
  const reportPath = deps.writeReport(markdown, { options, stop, runs, attempts, spent });
  return { stop, runs, attempts, spent, reportPath };
}

// ---- the real side effects ----

const git = (args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

function realDeps() {
  const tmp = mkdtempSync(join(tmpdir(), 'stabilize-'));
  const bin = join(ROOT, 'node_modules/.bin/playwright');
  let runNo = 0;
  return {
    now: () => Date.now(),
    isClean: () => git(['status', '--porcelain', '--untracked-files=no']).stdout.trim() === '',
    runTests: ({ options, timeLeftMs }) => {
      const file = join(tmp, `run-${runNo++}.json`);
      const args = ['test', options.spec, `--repeat-each=${options.repeat}`, '--retries=0', '--max-failures=1', '--reporter=dot,json'];
      if (options.grep) args.push('--grep', options.grep);
      if (options.workers) args.push(`--workers=${options.workers}`);
      process.stdout.write(`\nstabilize: run ${runNo - 1} · playwright ${args.slice(1).join(' ')}\n`);
      const r = spawnSync(bin, args, {
        cwd: ROOT,
        stdio: ['ignore', 'inherit', 'inherit'],
        timeout: timeLeftMs,
        env: { ...process.env, ENV: 'stage', HEADLESS: 'true', PLAYWRIGHT_JSON_OUTPUT_FILE: file },
      });
      if (r.error?.code === 'ETIMEDOUT') return { timedOut: true };
      return { report: existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null };
    },
    runCheck: ({ timeLeftMs }) => {
      process.stdout.write('stabilize: the tests are green, running npm run check\n');
      const r = spawnSync('npm', ['run', 'check'], { cwd: ROOT, encoding: 'utf8', timeout: timeLeftMs, maxBuffer: 64 * 1024 * 1024 });
      const output = `${r.stdout ?? ''}${r.stderr ?? ''}`;
      return { ok: r.status === 0, step: checkStep(output), output: output.split('\n').slice(-40).join('\n') };
    },
    runAgent: ({ options, prompt, budgetLeft, timeLeftMs }) => {
      process.stdout.write(`stabilize: agent (${options.model}, budget ${money(budgetLeft)}) is fixing the failure\n`);
      const env = { ...process.env };
      delete env.CLAUDECODE;
      const args = [
        '-p',
        '--model', options.model,
        '--output-format', 'json',
        '--max-budget-usd', String(budgetLeft),
        '--permission-mode', 'dontAsk',
        '--setting-sources', 'project',
        '--strict-mcp-config',
        '--allowedTools', 'Read', 'Grep', 'Glob', ...EDITABLE.map((d) => `Edit(${d}/**)`),
        '--disallowedTools', 'Bash', 'WebFetch', 'WebSearch', 'Agent',
      ];
      const r = spawnSync('claude', args, { cwd: ROOT, input: prompt, encoding: 'utf8', env, timeout: timeLeftMs, maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'inherit'] });
      if (r.error?.code === 'ETIMEDOUT') return { timedOut: true };
      const v = agentVerdict(parseAgentOutput(r.stdout).text);
      process.stdout.write(`stabilize: ${v.line}\n`);
      return { stdout: r.stdout ?? '' };
    },
    hashProtected: () => {
      const files = git(['ls-files', '-z', '--', ...PROTECTED_PATHS]).stdout.split('\0').filter(Boolean);
      return Object.fromEntries(
        files.map((f) => [f, existsSync(join(ROOT, f)) ? createHash('sha256').update(readFileSync(join(ROOT, f))).digest('hex') : 'missing']),
      );
    },
    diff: () => {
      const tracked = git(['diff', '--', ...EDITABLE]).stdout;
      const untracked = git(['ls-files', '--others', '--exclude-standard', '--', ...EDITABLE]).stdout.split('\n').filter(Boolean);
      return untracked.length ? `${tracked}\n# new files, not tracked by git: ${untracked.join(', ')}\n` : tracked;
    },
    changedFiles: () => git(['diff', '--name-only']).stdout.split('\n').filter(Boolean),
    restore: (paths) => {
      if (paths.length) git(['checkout', '--', ...paths]);
    },
    writeReport: (markdown, { options, stop, runs, attempts, spent }) => {
      const dir = join(ROOT, LOOPS_DIR);
      mkdirSync(dir, { recursive: true });
      const day = new Date().toISOString().slice(0, 10);
      const slug = basename(options.spec).replace(/\.spec\.ts$/, '').replace(/[^a-z0-9-]+/gi, '-');
      let name = `${day}-${slug}.md`;
      for (let n = 2; existsSync(join(dir, name)); n++) name = `${day}-${slug}-${n}.md`;
      writeFileSync(join(dir, name), markdown);
      const index = join(dir, 'index.md');
      const row = `| [${name}](${name}) | \`${basename(options.spec)}\` | **${stop}** | ${runs.length} | ${attempts.length} | ${money(spent)} |\n`;
      writeFileSync(index, `${readFileSync(index, 'utf8').replace(/\n*$/, '\n')}${row}`);
      return `${LOOPS_DIR}/${name}`;
    },
  };
}

function main(argv) {
  const options = parseArgs(argv);
  if (!existsSync(join(ROOT, options.spec))) throw new UsageError(`no such spec: ${options.spec}`);
  if (!existsSync(join(ROOT, LOOPS_DIR, 'index.md'))) throw new UsageError(`missing ${LOOPS_DIR}/index.md`);
  const r = runLoop(options, realDeps());
  process.stdout.write(`\nstabilize: STOP ${r.stop} · ${r.runs.length} run(s) · ${r.attempts.length} attempt(s) · ${money(r.spent)}\nstabilize: report ${r.reportPath}\n`);
  return exitCode(r.stop);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (err) {
    process.stderr.write(`stabilize: ${err.message}\n`);
    process.exit(err instanceof UsageError ? 3 : 1);
  }
}
