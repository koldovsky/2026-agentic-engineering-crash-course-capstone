// Runs a cross-vendor checker (Codex CLI, Astra 6, high effort, read-only sandbox) and logs the review.
//
//   node scripts/review.mjs <be|fe|harness> [--dry-run]
//
// Writes the full report to docs/reviews/<date>-<scope>-<role>.md and appends a row to
// docs/logs/reviews.md with an empty Resolution cell, which must be filled in before the commit.
// A checker run that fails twice is logged in docs/logs/retry-stops.md.
//
// `codex exec review --uncommitted` cannot take custom instructions, so the prompt itself tells the
// checker which uncommitted changes to review.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, run, parseArgs, today, tail } from './lib/proc.mjs';
import { appendRowToFile, parseReviewSummary } from './lib/ledger.mjs';
import { logRetryStop } from './lib/retry-stop.mjs';

const MODEL = 'gpt-6-astra';
const EFFORT = 'high';
const SCOPES = {
  be: { role: 'be-checker', paths: 'backend/' },
  fe: { role: 'fe-checker', paths: 'frontend/' },
  harness: { role: 'harness-checker', paths: 'everything outside backend/ and frontend/' },
  spec: { role: 'spec-checker', paths: 'openspec/ (the OpenSpec change, its contract and openspec/config.yaml)' },
};

function activeChangeContext() {
  const changes = path.join(ROOT, 'openspec', 'changes');
  if (!fs.existsSync(changes)) return 'No active OpenSpec change.';
  const active = fs
    .readdirSync(changes, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'archive')
    .map((d) => `openspec/changes/${d.name}/ (proposal.md, design.md, specs/, contracts/openapi.yaml, tasks.md, evidence/)`);
  return active.length ? active.map((a) => `- ${a}`).join('\n') : 'No active OpenSpec change.';
}

function buildPrompt(scope) {
  const { role, paths } = SCOPES[scope];
  const rolePrompt = fs.readFileSync(path.join(ROOT, '.agents', 'roles', `${role}.md`), 'utf8');
  return `${rolePrompt}

---
## This run
- Working directory: the BOMKeeper submission folder (submissions/kyrylo-tsekhanovskyi/ in the git repo).
- Review the **uncommitted** changes (staged, unstaged and untracked; use \`git status\` and \`git diff HEAD\`)
  in this folder, limited to: ${paths}.
- Rules: AGENTS.md. Accepted decisions: docs/adr/. Plan: docs/plan-mvp1.md.
- OpenSpec change(s) to check the work against:
${activeChangeContext()}
- You are read-only. Do not modify files.

## Output format
List every finding as \`- [P0|P1|P2|P3] <file>:<line> - <problem> - <suggested fix>\`
(P0 blocker, P1 must fix, P2 should fix, P3 nit). Then finish with exactly one line:
SUMMARY: P0=<n> P1=<n> P2=<n> P3=<n> VERDICT=<approve|changes-requested>
`;
}

function reportPath(scope, role) {
  const dir = path.join(ROOT, 'docs', 'reviews');
  fs.mkdirSync(dir, { recursive: true });
  const base = `${today()}-${scope}-${role}`;
  let file = path.join(dir, `${base}.md`);
  for (let n = 2; fs.existsSync(file); n++) file = path.join(dir, `${base}-${n}.md`);
  return file;
}

async function runChecker(prompt, outFile) {
  const command = `codex exec review -m ${MODEL} -c model_reasoning_effort="${EFFORT}" -c sandbox_mode="read-only" -o "${outFile}" -`;
  const result = await run(command, { input: prompt });
  const message = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8').trim() : '';
  return { ...result, message, command };
}

const { options, positional } = parseArgs(process.argv.slice(2));
const scope = positional[0];
if (!SCOPES[scope]) {
  console.error(`Usage: node scripts/review.mjs <${Object.keys(SCOPES).join('|')}> [--dry-run]`);
  process.exit(1);
}
const { role } = SCOPES[scope];
const prompt = buildPrompt(scope);
if (options['dry-run']) {
  console.log(prompt);
  process.exit(0);
}

const workDir = path.join(ROOT, '.agent-work');
fs.mkdirSync(workDir, { recursive: true });
let attempt;
for (let i = 1; i <= 2; i++) {
  const outFile = path.join(workDir, `review-${scope}-last-message.md`);
  fs.rmSync(outFile, { force: true });
  attempt = await runChecker(prompt, outFile);
  const recognized = parseReviewSummary(attempt.message).verdict !== 'unrecognized';
  if (attempt.exitCode === 0 && attempt.message && recognized) break;
  console.error(`\nChecker run ${i}/2 failed (exit ${attempt.exitCode}${recognized ? '' : ', unrecognized review output'}).`);
  if (!recognized) attempt.output += `\n${attempt.message}`;
  if (i === 2) {
    logRetryStop({
      agent: role,
      model: MODEL,
      effort: EFFORT,
      task: `review:${scope}`,
      limit: 'checker run failed twice',
      lastFailure: tail(attempt.output, 20),
      next: 'pending: human decides',
    });
    console.error('Logged in docs/logs/retry-stops.md. Stopping.');
    process.exit(1);
  }
}

const { counts, verdict } = parseReviewSummary(attempt.message);
const file = reportPath(scope, role);
const rel = path.relative(ROOT, file).replace(/\\/g, '/');
fs.writeFileSync(
  file,
  `# Review: ${scope} (${role})

- Date: ${today()}
- Reviewer: ${role} via Codex CLI
- Model / effort: ${MODEL} / ${EFFORT}, sandbox read-only
- Command: \`${attempt.command}\`
- Findings: P0=${counts.P0} P1=${counts.P1} P2=${counts.P2} P3=${counts.P3} · verdict: ${verdict}

## Report

${attempt.message}
`,
);

appendRowToFile(path.join(ROOT, 'docs', 'logs', 'reviews.md'), [
  today(),
  scope,
  role,
  `${MODEL} / ${EFFORT}`,
  `${counts.P0}/${counts.P1}/${counts.P2}/${counts.P3}`,
  verdict,
  `[report](../reviews/${path.basename(file)})`,
  '',
]);
console.log(`\nReport: ${rel}\nLedger row appended to docs/logs/reviews.md. Fill in the Resolution before committing.`);
