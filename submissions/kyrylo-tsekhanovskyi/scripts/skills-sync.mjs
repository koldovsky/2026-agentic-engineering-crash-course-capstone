// Keeps the Claude Code copy of the vendored skills identical to the canonical tree.
//
//   node scripts/skills-sync.mjs          copy .agents/skills/<name> -> .claude/skills/<name>
//   node scripts/skills-sync.mjs --check  fail if the two trees differ
//
// Only skills listed in skills-lock.json are synced. OpenSpec skills are generated per tool by
// `openspec update`, so their Claude and Codex/Antigravity variants differ on purpose.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, parseArgs } from './lib/proc.mjs';

const SOURCE = path.join(ROOT, '.agents', 'skills');
const TARGET = path.join(ROOT, '.claude', 'skills');

function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full, base) : [path.relative(base, full)];
  });
}

function differences(name) {
  const src = path.join(SOURCE, name);
  const dst = path.join(TARGET, name);
  const srcFiles = listFiles(src);
  const dstFiles = new Set(listFiles(dst));
  const diffs = [];
  for (const file of srcFiles) {
    if (!dstFiles.has(file)) diffs.push(`missing in .claude: ${name}/${file}`);
    else if (!fs.readFileSync(path.join(src, file)).equals(fs.readFileSync(path.join(dst, file)))) {
      diffs.push(`differs: ${name}/${file}`);
    }
    dstFiles.delete(file);
  }
  for (const extra of dstFiles) diffs.push(`extra in .claude: ${name}/${extra}`);
  return diffs;
}

const { options } = parseArgs(process.argv.slice(2));
const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'skills-lock.json'), 'utf8'));
const names = Object.keys(lock.skills);

if (options.check) {
  const diffs = names.flatMap((name) =>
    fs.existsSync(path.join(SOURCE, name)) ? differences(name) : [`missing canonical skill: .agents/skills/${name}`],
  );
  if (diffs.length) {
    console.error(`${diffs.join('\n')}\nRun: npm run skills:sync`);
    process.exitCode = 1;
  } else {
    console.log(`${names.length} vendored skills in sync`);
  }
} else {
  for (const name of names) {
    const dst = path.join(TARGET, name);
    fs.rmSync(dst, { recursive: true, force: true });
    fs.cpSync(path.join(SOURCE, name), dst, { recursive: true });
    console.log(`synced ${name}`);
  }
}
