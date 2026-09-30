#!/usr/bin/env node
/**
 * Copies the rules from .claude/rules/*.md (the source of truth, tracked in git) to
 * .cursor/rules/*.mdc (local, git-ignored), so that Cursor loads the same rules.
 *
 *   npm run cursor:sync            copy; overwrite changed files; never delete a file
 *   npm run cursor:sync -- --check report drift only; exit 1 if a copy differs or is missing
 *
 * A .mdc file that has no source in .claude/rules is reported and left in place.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = '.claude/rules';
const TARGET = '.cursor/rules';
const check = process.argv.includes('--check');

const sources = readdirSync(SOURCE).filter((f) => f.endsWith('.md'));
const drift = [];
let written = 0;

if (!check) mkdirSync(TARGET, { recursive: true });

for (const file of sources) {
  const target = join(TARGET, file.replace(/\.md$/, '.mdc'));
  const content = readFileSync(join(SOURCE, file));
  const same = existsSync(target) && readFileSync(target).equals(content);
  if (same) continue;
  drift.push(target);
  if (!check) {
    writeFileSync(target, content);
    written += 1;
  }
}

const extra = existsSync(TARGET)
  ? readdirSync(TARGET).filter((f) => f.endsWith('.mdc') && !sources.includes(f.replace(/\.mdc$/, '.md')))
  : [];

for (const f of extra) console.warn(`not in ${SOURCE}, left in place: ${join(TARGET, f)}`);

if (check) {
  for (const f of drift) console.warn(`differs or missing: ${f}`);
  console.warn(drift.length ? `${drift.length} file(s) out of sync. Run: npm run cursor:sync` : 'in sync');
  process.exit(drift.length ? 1 : 0);
}
console.warn(`${written} file(s) written, ${sources.length - written} already in sync`);
