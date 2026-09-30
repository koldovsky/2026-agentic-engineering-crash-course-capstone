#!/usr/bin/env node
/**
 * git pre-commit: a commit cannot hide debt. Called by .githooks/pre-commit.
 * Install once per clone: npm run hooks:install (sets core.hooksPath to .githooks).
 * Spec: openspec/specs/edit-hooks ("A commit cannot hide debt").
 *
 * Blocks (exit 1) when the staged content has:
 *   - an env file (.env or .env.*), except the template .env.example
 *   - a baseline entry that is new or larger than in HEAD
 *   - a new ci/known-failures.json entry without a PRJ-<number> issue
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const BASELINES = [
  '.rules-lint-baseline.json',
  '.ste-baseline.json',
  '.docs-language-baseline.json',
  'eslint-suppressions.json',
];
const KNOWN_FAILURES = 'ci/known-failures.json';

export function checkEnvFiles(paths) {
  return paths.filter((p) => {
    const name = p.split('/').pop();
    return (name === '.env' || name.startsWith('.env.')) && name !== '.env.example';
  });
}

/** Each baseline as a flat map key → number. */
export function flatten(json) {
  const out = {};
  for (const [a, v] of Object.entries(json ?? {})) {
    if (typeof v === 'number') out[a] = v;
    else if (v && typeof v === 'object') {
      for (const [b, w] of Object.entries(v)) {
        const n = typeof w === 'number' ? w : w?.count;
        if (typeof n === 'number') out[`${a} › ${b}`] = n;
      }
    }
  }
  return out;
}

/** `name` is kept in the signature for messages and future per-file rules. */
export function baselineGrowth(_name, head, staged) {
  const before = flatten(head);
  const after = flatten(staged);
  return Object.entries(after)
    .filter(([key, n]) => n > (before[key] ?? 0))
    .map(([key, n]) => ({ key, before: before[key] ?? 0, after: n }));
}

export function knownFailureIssues(head, staged) {
  const old = new Set((head ?? []).map((e) => e.test));
  return (staged ?? []).filter((e) => !old.has(e.test) && !/^PRJ-\d+$/.test(e.issue ?? '')).map((e) => e.test);
}

const git = (...args) => spawnSync('git', args, { encoding: 'utf8' });
const jsonAt = (ref, path) => {
  const r = git('show', `${ref}:${path}`);
  if (r.status !== 0) return null;
  try {
    return JSON.parse(r.stdout);
  } catch {
    return null;
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const staged = git('diff', '--cached', '--name-only', '--diff-filter=ACMR').stdout.split('\n').filter(Boolean);
  const problems = [];

  for (const p of checkEnvFiles(staged)) problems.push(`${p}: an env file must not be committed. Unstage it: git restore --staged ${p}`);

  for (const name of BASELINES.filter((b) => staged.includes(b))) {
    for (const g of baselineGrowth(name, jsonAt('HEAD', name) ?? {}, jsonAt('', name) ?? {})) {
      problems.push(
        `${name}: "${g.key}" grows ${g.before} → ${g.after}. Baselines only go down. Fix the violation instead (AGENTS.md, Definition of done).`,
      );
    }
  }

  if (staged.includes(KNOWN_FAILURES)) {
    for (const t of knownFailureIssues(jsonAt('HEAD', KNOWN_FAILURES) ?? [], jsonAt('', KNOWN_FAILURES) ?? [])) {
      problems.push(`${KNOWN_FAILURES}: the new entry "${t}" needs "issue": "PRJ-<number>". File the bug first.`);
    }
  }

  if (problems.length) {
    console.error(`pre-commit: the commit is blocked (${problems.length} problem(s)):`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  process.exit(0);
}
