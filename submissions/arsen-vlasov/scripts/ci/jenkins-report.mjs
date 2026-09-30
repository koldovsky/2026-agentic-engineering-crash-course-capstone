#!/usr/bin/env node
/**
 * One Jenkins build of the autotest jobs → PASS / FAIL / NOT-EARNED.
 * Spec: openspec/specs/jenkins-verify/spec.md
 *
 *   node scripts/ci/jenkins-report.mjs <job> [<build number>|last] [--known <file>]
 *   node scripts/ci/jenkins-report.mjs --from <saved build.json> [--known <file>]
 *
 * Data comes from the Allure plugin (/allure/data/suites.json); the jobs publish no JUnit.
 * Live mode reads JENKINS_URL, JENKINS_USER, JENKINS_API_TOKEN from .env (or the environment).
 * Read-only: it never triggers, stops or edits a build. Prints a summary, never raw JSON.
 * Exit 0 PASS · 1 FAIL · 2 NOT-EARNED · 3 usage or access error.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DEFAULT_KNOWN = `${ROOT}ci/known-failures.json`;
const LIST_LIMIT = 15;
const EXIT = { PASS: 0, FAIL: 1, 'NOT-EARNED': 2, ERROR: 3 };
const PASSED = new Set(['PASSED', 'FIXED']);
const FAILED = new Set(['FAILED', 'REGRESSION']);

const testId = (c) => `${c.className} › ${c.name}`;
const firstLine = (text = '') => text.trim().split('\n')[0];
export const redact = (text) => text.replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/g, 'Bearer <redacted>');

const ALLURE_STATUS = { passed: 'PASSED', failed: 'FAILED', broken: 'FAILED', skipped: 'SKIPPED', unknown: 'SKIPPED' };

/**
 * The Allure plugin's data/suites.json → the neutral report shape verdict() takes.
 * Tree: root → project (chromium | api) → spec file → describe… → test. A test's suite is its spec file.
 */
export function fromAllure(root) {
  const suites = [];
  for (const project of root.children ?? []) {
    for (const spec of project.children ?? []) {
      const cases = [];
      const walk = (node) => {
        if (node.children) return node.children.forEach(walk);
        cases.push({ uid: node.uid, className: spec.name, name: node.name, status: ALLURE_STATUS[node.status] ?? 'SKIPPED' });
      };
      walk(spec);
      suites.push({ name: `${project.name} › ${spec.name}`, cases });
    }
  }
  return { suites };
}

export function verdict(build, report, known = [], job) {
  const base = { counts: null, new: [], known: [], fixed: [], stale: [] };
  if (build.building) return { ...base, verdict: 'NOT-EARNED', reason: 'the build is still running' };
  if (['ABORTED', 'NOT_BUILT'].includes(build.result)) {
    return { ...base, verdict: 'NOT-EARNED', reason: `the build result is ${build.result}` };
  }
  if (!report) {
    return { ...base, verdict: 'NOT-EARNED', reason: 'no test report — the build broke before or outside the tests' };
  }

  const cases = (report.suites ?? []).flatMap((s) => s.cases ?? []);
  const passed = cases.filter((c) => PASSED.has(c.status));
  const failed = cases.filter((c) => FAILED.has(c.status));
  const counts = {
    executed: passed.length + failed.length,
    passed: passed.length,
    failed: failed.length,
    skipped: cases.filter((c) => c.status === 'SKIPPED').length,
  };

  const knownById = new Map(known.map((k) => [k.test, k]));
  const seen = new Set(cases.map(testId));
  const passedIds = new Set(passed.map(testId));
  const result = {
    ...base,
    counts,
    new: failed
      .filter((c) => !knownById.has(testId(c)))
      .map((c) => ({ test: testId(c), error: firstLine(c.errorDetails), uid: c.uid })),
    known: failed.filter((c) => knownById.has(testId(c))).map((c) => ({ ...knownById.get(testId(c)) })),
    fixed: known.filter((k) => passedIds.has(k.test)),
    stale: known.filter((k) => (!k.job || !job || k.job === job) && !seen.has(k.test)),
  };

  if (counts.executed === 0) return { ...result, verdict: 'NOT-EARNED', reason: 'no test was executed' };
  if (result.new.length > 0) {
    return { ...result, verdict: 'FAIL', reason: `${result.new.length} new failure${result.new.length === 1 ? '' : 's'}` };
  }
  return { ...result, verdict: 'PASS', reason: counts.failed ? `${counts.failed} failure(s), all known` : 'all executed tests passed' };
}

function section(title, items, line) {
  if (items.length === 0) return [];
  const shown = items.slice(0, LIST_LIMIT).flatMap(line);
  const more = items.length > LIST_LIMIT ? [`  …and ${items.length - LIST_LIMIT} more`] : [];
  return ['', `${title} (${items.length}):`, ...shown, ...more];
}

export function format(build, v, job) {
  const c = v.counts;
  const lines = [
    `jenkins-verify · ${job} #${build.number} · ${build.building ? 'RUNNING' : build.result}`,
    build.url,
    c ? `executed ${c.executed} · passed ${c.passed} · failed ${c.failed} · skipped ${c.skipped}` : 'no test counts',
    `VERDICT: ${v.verdict} — ${v.reason}`,
    ...section('new', v.new, (f) => [`  - ${f.test}`, `    ${f.error || '(no error text)'}`]),
    ...section('known', v.known, (k) => [`  - ${k.test} — ${k.reason}${k.issue ? ` (${k.issue})` : ''}`]),
    ...section('fixed — passed now, remove from ci/known-failures.json', v.fixed, (k) => [`  - ${k.test}`]),
    ...section('stale — not in this build, check and remove from ci/known-failures.json', v.stale, (k) => [`  - ${k.test}`]),
  ];
  return redact(lines.join('\n'));
}

const jobFromUrl = (url = '') => url.match(/\/job\/([^/]+)\//)?.[1] ?? 'unknown-job';

class AccessError extends Error {}

async function fetchBuild(job, number) {
  const { JENKINS_URL: url, JENKINS_USER: user, JENKINS_API_TOKEN: token } = process.env;
  const missing = Object.entries({ JENKINS_URL: url, JENKINS_USER: user, JENKINS_API_TOKEN: token })
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) throw new AccessError(`missing ${missing.join(', ')} — add to .env (values are never printed)`);

  const headers = { Authorization: `Basic ${Buffer.from(`${user}:${token}`).toString('base64')}` };
  const base = `${url.replace(/\/$/, '')}/job/${encodeURIComponent(job)}/${number === 'last' ? 'lastCompletedBuild' : number}`;
  const get = async (path) => {
    const res = await fetch(`${base}${path}`, { headers });
    if (res.status === 401 || res.status === 403) {
      throw new AccessError(`Jenkins rejected JENKINS_USER / JENKINS_API_TOKEN (HTTP ${res.status})`);
    }
    if (res.status === 404) return null;
    if (!res.ok) throw new AccessError(`Jenkins answered HTTP ${res.status} for ${path.split('?')[0] || 'build'}`);
    return res.json();
  };

  const build = await get('/api/json?tree=number,result,building,url,timestamp,duration');
  if (!build) throw new AccessError(`no build ${number} in job ${job}`);
  const allure = await get('/allure/data/suites.json');
  return { build, allure, errorOf: async (uid) => (await get(`/allure/data/test-cases/${uid}.json`))?.statusMessage };
}

async function main(args) {
  const opt = (name) => {
    const i = args.indexOf(name);
    return i === -1 ? undefined : args[i + 1];
  };
  const from = opt('--from');
  const known = JSON.parse(readFileSync(opt('--known') ?? DEFAULT_KNOWN, 'utf8'));
  const positional = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));

  let saved;
  if (from) {
    saved = JSON.parse(readFileSync(from, 'utf8'));
  } else {
    const [job, number = 'last'] = positional;
    if (!job || !(number === 'last' || /^\d+$/.test(number))) {
      throw new AccessError('usage: jenkins-report.mjs <job> [<build number>|last] | --from <file>');
    }
    dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? [`${ROOT}.env`, `${ROOT}config/.env`], quiet: true });
    saved = await fetchBuild(job, number);
  }

  const report = saved.allure ? fromAllure(saved.allure) : saved.report;
  const job = positional[0] ?? jobFromUrl(saved.build.url);
  const v = verdict(saved.build, report, known, job);
  if (saved.errorOf) {
    for (const f of v.new.slice(0, LIST_LIMIT)) if (!f.error && f.uid) f.error = firstLine(await saved.errorOf(f.uid));
  }
  process.stdout.write(`${format(saved.build, v, job)}\n`);
  return EXIT[v.verdict];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      const cause = err.cause ? ` (${err.cause.code ?? err.cause.message})` : '';
      process.stderr.write(`jenkins-verify: ${redact(err instanceof AccessError ? err.message : `${err}${cause}`)}\n`);
      process.exit(EXIT.ERROR);
    },
  );
}
