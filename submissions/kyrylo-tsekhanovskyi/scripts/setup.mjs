// One-time setup, run by the human: `npm run setup`.
// Points git at .githooks/ (pre-commit gate) and reports missing prerequisites.
import path from 'node:path';
import { ROOT, runSync, dockerIsRunning } from './lib/proc.mjs';

const top = runSync('git', ['rev-parse', '--show-toplevel']).stdout.trim();
const hooksPath = path.relative(top, path.join(ROOT, '.githooks')).replace(/\\/g, '/');
const set = runSync('git', ['config', 'core.hooksPath', hooksPath]);
if (set.status !== 0) {
  console.error(`Failed to install the pre-commit gate (git config core.hooksPath): ${set.stderr}`);
  process.exit(1);
}
console.log(`git core.hooksPath = ${hooksPath}`);

// Pinned local .NET tools (dotnet-ef) from dotnet-tools.json.
const tools = runSync('dotnet', ['tool', 'restore'], { shell: true });
console.log(tools.status === 0 ? 'ok      dotnet tool restore' : `FAILED  dotnet tool restore: ${tools.stderr}`);
if (tools.status !== 0) process.exitCode = 1; // keep reporting the prerequisites, but fail the setup

const prerequisites = [
  ['node', ['--version'], 'Node.js 24+'],
  ['dotnet', ['--version'], '.NET 10 SDK'],
  ['openspec', ['--version'], 'OpenSpec CLI (npm i -g @fission-ai/openspec)'],
  ['codex', ['--version'], 'Codex CLI, for the checkers'],
];
for (const [cmd, args, what] of prerequisites) {
  const r = runSync(cmd, args, { shell: true });
  console.log(`${r.status === 0 ? 'ok     ' : 'MISSING'} ${what}: ${(r.stdout || r.stderr).trim().split('\n')[0]}`);
}
console.log(`${dockerIsRunning() ? 'ok     ' : 'MISSING'} Docker Desktop running (needed by start, check, e2e)`);
