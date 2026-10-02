// The single quality gate, used by `npm run check*`, the git pre-commit hook and the agent Stop hooks.
//
//   node scripts/check.mjs <all|harness|be|fe|e2e> [--fast]
//   node scripts/check.mjs <be|fe|e2e> --red <task-id> [--change <name>] [--filter <expr>]
//
// --fast  : build/lint + unit tests only (no Docker, no integration tests). Used by the Stop hooks.
// e2e     : Playwright against the running stack (`npm run start` first). Not part of `all`.
// --red   : TDD red run. The tests must run and fail on assertions (not compile errors). The output is
//           saved to openspec/changes/<change>/evidence/<task-id>-red.txt.
// A side whose project does not exist yet (backend/, frontend/) is reported as skipped.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, run, parseArgs, dockerIsRunning, today } from './lib/proc.mjs';
import { classifyRedRun, stripAnsi } from './lib/red.mjs';
import { missingEvidence } from './lib/evidence.mjs';
import { unresolvedReviews } from './lib/ledger.mjs';
import { isUpToDate } from './lib/generated.mjs';

const CHANGES = path.join(ROOT, 'openspec', 'changes');
const BE_SLN = 'backend/BOMKeeper.slnx';
const BE_UNIT = 'backend/tests/BOMKeeper.BLL.Tests';
const FE_PKG = 'frontend/package.json';
const E2E_CONFIG = 'frontend/playwright.config.ts';

const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

function changeDirs() {
  if (!fs.existsSync(CHANGES)) return { active: [], all: [] };
  const active = fs
    .readdirSync(CHANGES, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'archive')
    .map((d) => path.join(CHANGES, d.name));
  const archiveDir = path.join(CHANGES, 'archive');
  const archived = fs.existsSync(archiveDir)
    ? fs
        .readdirSync(archiveDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => path.join(archiveDir, d.name))
    : [];
  return { active, all: [...active, ...archived] };
}

function evidenceStep() {
  const problems = [];
  for (const dir of changeDirs().all) {
    const tasks = path.join(dir, 'tasks.md');
    if (!fs.existsSync(tasks)) continue;
    const evidenceDir = path.join(dir, 'evidence');
    const files = fs.existsSync(evidenceDir) ? fs.readdirSync(evidenceDir) : [];
    for (const id of missingEvidence(fs.readFileSync(tasks, 'utf8'), files)) {
      problems.push(`${path.relative(ROOT, dir)}: task ${id} is ticked but evidence/${id}-red.txt is missing`);
    }
  }
  if (problems.length) console.error(problems.join('\n'));
  return { exitCode: problems.length ? 1 : 0 };
}

function reviewsResolvedStep() {
  const open = unresolvedReviews(fs.readFileSync(path.join(ROOT, 'docs', 'logs', 'reviews.md'), 'utf8'));
  if (open.length) {
    console.error(`Reviews without a Resolution in docs/logs/reviews.md:\n  ${open.join('\n  ')}`);
  }
  return { exitCode: open.length ? 1 : 0 };
}

function steps(scope, fast) {
  const list = [];
  if (scope === 'all' || scope === 'harness') {
    list.push(['harness: script tests', 'node --test "scripts/test/*.test.mjs"']);
    list.push(['harness: skills in sync', 'node scripts/skills-sync.mjs --check']);
    list.push(['harness: red evidence for ticked [checks] tasks', evidenceStep]);
    list.push(['harness: openspec validate', 'openspec validate --all --strict --no-interactive']);
    list.push(['harness: every review has a Resolution', reviewsResolvedStep]);
  }
  if (scope === 'all' || scope === 'be') {
    if (!exists(BE_SLN)) {
      list.push(['backend', null]);
    } else if (fast) {
      list.push(['be: build', `dotnet build ${BE_SLN} -warnaserror`]);
      list.push(['be: unit tests', `dotnet test ${BE_UNIT} --no-build`]);
    } else {
      list.push(['be: docker running', dockerStep]);
      list.push(['be: build', `dotnet build ${BE_SLN} -warnaserror`]);
      list.push(['be: format', `dotnet format ${BE_SLN} --verify-no-changes`]);
      list.push(['be: tests (unit + integration)', `dotnet test ${BE_SLN} --no-build`]);
    }
  }
  if (scope === 'all' || scope === 'fe') {
    if (!exists(FE_PKG)) {
      list.push(['frontend', null]);
    } else {
      list.push(['fe: API types match the contract', apiTypesStep]);
      list.push(['fe: lint', 'npm --prefix frontend run lint']);
      if (!fast) list.push(['fe: prettier', 'npm --prefix frontend run format:check']);
      list.push(['fe: unit tests', 'npm --prefix frontend run test']);
      if (!fast) list.push(['fe: build', 'npm --prefix frontend run build']);
    }
  }
  if (scope === 'e2e') {
    list.push(exists(E2E_CONFIG) ? ['e2e: playwright', 'npm --prefix frontend run e2e'] : ['e2e', null]);
  }
  return list;
}

// The frontend's API types are generated from the contract (design D6). The check regenerates, compares
// and restores the file, so it never changes the working tree.
async function apiTypesStep() {
  const file = path.join(ROOT, 'frontend', 'src', 'app', 'api', 'schema.d.ts');
  const upToDate = await isUpToDate(file, async () => {
    const result = await run('npm --prefix frontend run generate:api', { quiet: true });
    if (result.exitCode !== 0) throw new Error(`generate:api failed:\n${result.output}`);
  });
  if (!upToDate) {
    console.error(
      'frontend/src/app/api/schema.d.ts is out of date with the contract. Run `npm --prefix frontend run generate:api` and stage it.',
    );
  }
  return { exitCode: upToDate ? 0 : 1 };
}

function dockerStep() {
  if (dockerIsRunning()) return { exitCode: 0 };
  console.error('Docker is not running. Start Docker Desktop: integration tests use Testcontainers (postgres:17).');
  return { exitCode: 1 };
}

async function check(scope, fast) {
  const results = [];
  for (const [name, action] of steps(scope, fast)) {
    if (action === null) {
      results.push([name, 'skipped (not scaffolded yet)']);
      continue;
    }
    console.log(`\n=== ${name} ===`);
    const { exitCode } = typeof action === 'function' ? await action() : await run(action);
    results.push([name, exitCode === 0 ? 'ok' : 'FAILED']);
    if (exitCode !== 0) break; // fail fast: later steps depend on earlier ones
  }
  console.log('\n=== summary ===');
  for (const [name, status] of results) console.log(`${status.padEnd(28)} ${name}`);
  return results.some(([, s]) => s === 'FAILED') ? 1 : 0;
}

function resolveChange(name) {
  if (name) return path.join(CHANGES, name);
  const { active } = changeDirs();
  if (active.length === 1) return active[0];
  throw new Error(`Pass --change <name>; active changes: ${active.map((d) => path.basename(d)).join(', ') || 'none'}`);
}

async function red(side, taskId, { change, filter }) {
  if (!/^\d+(\.\d+)*$/.test(taskId)) throw new Error(`Task id must look like 2.1, got "${taskId}"`);
  const changeDir = resolveChange(change);
  let command;
  if (side === 'be') {
    if (!exists(BE_SLN)) throw new Error('backend/ is not scaffolded yet');
    command = `dotnet test ${BE_SLN}${filter ? ` --filter "${filter}"` : ''}`;
  } else if (side === 'fe') {
    if (!exists(FE_PKG)) throw new Error('frontend/ is not scaffolded yet');
    command = `npm --prefix frontend run test${filter ? ` -- ${filter}` : ''}`;
  } else if (side === 'e2e') {
    if (!exists(E2E_CONFIG)) throw new Error('Playwright is not configured yet (frontend/playwright.config.ts)');
    command = `npm --prefix frontend run e2e${filter ? ` -- ${filter}` : ''}`;
  } else {
    throw new Error('--red needs a side: be, fe or e2e');
  }
  console.log(`=== red run for task ${taskId}: ${command} ===`);
  const { exitCode, output } = await run(command);
  const verdict = classifyRedRun({ exitCode, output });
  if (!verdict.ok) {
    console.error(`\nNot a valid red run: ${verdict.reason}`);
    return 1;
  }
  const evidenceDir = path.join(changeDir, 'evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });
  const file = path.join(evidenceDir, `${taskId}-red.txt`);
  const header = [
    `# Red evidence: task ${taskId} (${path.basename(changeDir)})`,
    `# date: ${today()}  side: ${side}  exit code: ${exitCode}`,
    `# command: ${command}`,
    `# verdict: ${verdict.reason}`,
    '',
  ].join('\n');
  fs.writeFileSync(file, header + stripAnsi(output));
  console.log(`\nRed confirmed. Evidence saved to ${path.relative(ROOT, file)}`);
  return 0;
}

try {
  const { options, positional } = parseArgs(process.argv.slice(2), ['red', 'change', 'filter']);
  const scope = positional[0] ?? 'all';
  process.exitCode = options.red
    ? await red(scope, String(options.red), options)
    : await check(scope, Boolean(options.fast));
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
}
