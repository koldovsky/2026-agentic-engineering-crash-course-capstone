#!/usr/bin/env node
/**
 * Enforces the project rules that can be checked statically.
 *
 * A rule that a script can verify should be a check, not a paragraph: it costs no
 * context tokens, it fires every time, and it cannot be talked out of its verdict.
 * Each check below names the rule file it enforces.
 *
 * Existing violations are recorded in .rules-lint-baseline.json and do not fail the
 * run — the baseline is a ratchet. A new violation, or more violations in an already
 * listed file, fails. Fewer violations pass and suggest refreshing the baseline.
 *
 * Usage:
 *   npm run rules:lint
 *   npm run rules:lint -- --update-baseline
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const BASELINE = '.rules-lint-baseline.json';
const updating = process.argv.includes('--update-baseline');

// Tracked and new (untracked, not ignored) files: a new spec is checked before its first commit.
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '*.ts'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

const read = (f) => {
  try {
    return readFileSync(f, 'utf8');
  } catch {
    return '';
  }
};

const under = (f, ...prefixes) => prefixes.some((p) => f.startsWith(p));

/**
 * Each check returns a Map of file -> number (violation count, or a size for pom-size).
 * `rule` points at the .mdc that states the invariant in prose.
 */
const CHECKS = [
  {
    id: 'no-expect-in-regression-specs',
    rule: 'playwright-specs-no-expect.md',
    hint: 'move the assertion into a should* method on the POM or a helper',
    run: () => {
      const out = new Map();
      for (const f of files) {
        if (!under(f, 'tests/specs/regression/') || !f.endsWith('.spec.ts')) continue;
        const n = (read(f).match(/\bexpect\s*\(/g) ?? []).length;
        if (n) out.set(f, n);
      }
      return out;
    },
  },
  {
    id: 'no-hardcoded-waits',
    rule: 'no-hardcoded-waits.md',
    hint: 'use a locator wait, toPass(), or a should* method instead',
    run: () => {
      const out = new Map();
      const re = /waitForTimeout\s*\(|this\.wait\s*\(|waitUntil:\s*['"]networkidle['"]/g;
      for (const f of files) {
        if (!under(f, 'page-objects/', 'tests/', 'utils/')) continue;
        const n = (read(f).match(re) ?? []).length;
        if (n) out.set(f, n);
      }
      return out;
    },
  },
  {
    id: 'pom-size',
    rule: 'page-object-size.md',
    hint: 'split the page object into components under components/',
    limit: 300,
    run: () => {
      const out = new Map();
      for (const f of files) {
        if (!under(f, 'page-objects/')) continue;
        const lines = read(f).split('\n').length;
        if (lines > 300) out.set(f, lines);
      }
      return out;
    },
  },
  {
    id: 'no-tc-ids-in-names',
    rule: 'test-naming-no-tc-ids.md',
    hint: 'link the case with linkTestCase(id) instead of naming it',
    run: () => {
      const out = new Map();
      const inTitle = /\b(?:test|describe)\s*\(\s*[`'"][^`'"]*\bGD-TC-\d+/gi;
      for (const f of files) {
        if (!under(f, 'tests/')) continue;
        let n = /gd-tc-\d+|(^|\/)tc-\d+/i.test(f) ? 1 : 0;
        n += (read(f).match(inTitle) ?? []).length;
        if (n) out.set(f, n);
      }
      return out;
    },
  },
  {
    id: 'no-relative-imports',
    rule: 'api-test.md',
    hint: "use the @/ path alias",
    run: () => {
      const out = new Map();
      for (const f of files) {
        if (!under(f, 'tests/', 'page-objects/')) continue;
        const n = (read(f).match(/from\s+['"]\.\.\//g) ?? []).length;
        if (n) out.set(f, n);
      }
      return out;
    },
  },
  {
    id: 'no-hardcoded-endpoints',
    rule: 'api-test.md',
    hint: 'use an AdminRoutes.* constant',
    run: () => {
      const out = new Map();
      for (const f of files) {
        if (!under(f, 'tests/specs/api/')) continue;
        const n = (read(f).match(/['"]\/api\/v\d/g) ?? []).length;
        if (n) out.set(f, n);
      }
      return out;
    },
  },
  {
    id: 'no-deprecated-allure-import',
    rule: 'autotest-tags-and-allure.md',
    hint: "import * as allure from 'allure-js-commons'",
    run: () => {
      const out = new Map();
      for (const f of files) {
        const n = (read(f).match(/from\s+['"]allure-playwright['"]/g) ?? []).length;
        if (n) out.set(f, n);
      }
      return out;
    },
  },
  {
    id: 'no-userfactory-in-specs',
    rule: 'code-quality.md',
    hint: 'use testUserRegistry.createStudent()',
    run: () => {
      const out = new Map();
      for (const f of files) {
        if (!f.endsWith('.spec.ts')) continue;
        const n = (read(f).match(/UserFactory\.createStudent\s*\(/g) ?? []).length;
        if (n) out.set(f, n);
      }
      return out;
    },
  },
  {
    id: 'seconds-to-ms-max-30',
    rule: 'date-helper-seconds-to-ms.md',
    hint: 'DateHelper.secondsToMs(n) — n must be ≤ 30; use minutesToMs for longer waits',
    run: () => {
      const out = new Map();
      const re = /secondsToMs\(\s*(\d+)\s*\)/g;
      for (const f of files) {
        if (f === 'utils/helpers/date-helper.ts') continue;
        const text = read(f);
        let n = 0;
        for (const match of text.matchAll(re)) {
          if (Number(match[1]) > 30) n += 1;
        }
        if (n) out.set(f, n);
      }
      return out;
    },
  },
];

const results = new Map(CHECKS.map((c) => [c.id, c.run()]));

if (updating) {
  const baseline = {};
  for (const [id, hits] of results) {
    if (hits.size) baseline[id] = Object.fromEntries([...hits].sort());
  }
  writeFileSync(BASELINE, `${JSON.stringify(baseline, null, 2)}\n`);
  const total = [...results.values()].reduce((a, m) => a + m.size, 0);
  console.log(`Baseline written to ${BASELINE}: ${total} file(s) recorded.`);
  process.exit(0);
}

const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};
let failures = 0;
let improved = 0;

for (const check of CHECKS) {
  const hits = results.get(check.id);
  const known = baseline[check.id] ?? {};
  const isNew = [];
  const worse = [];

  for (const [file, count] of hits) {
    const before = known[file];
    if (before === undefined) isNew.push([file, count]);
    else if (count > before) worse.push([file, count, before]);
  }
  for (const [file, before] of Object.entries(known)) {
    const now = hits.get(file);
    if (now === undefined || now < before) improved += 1;
  }

  const bad = isNew.length + worse.length;
  failures += bad;
  const label = check.limit ? `${check.id} (limit ${check.limit})` : check.id;
  console.log(
    `${bad ? '✗' : '✓'} ${label.padEnd(34)} ${String(hits.size).padStart(3)} file(s), ` +
      `${Object.keys(known).length} in baseline`,
  );
  for (const [file, count] of isNew) console.log(`    NEW    ${file} (${count})`);
  for (const [file, count, before] of worse) console.log(`    WORSE  ${file} (${before} → ${count})`);
  if (bad) console.log(`    rule: ${check.rule} — ${check.hint}`);
}

if (improved) {
  console.log(`\n${improved} baseline entr(ies) improved. Refresh with: npm run rules:lint -- --update-baseline`);
}
console.log(failures === 0 ? '\nNo new rule violations.' : `\nNew rule violations: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
