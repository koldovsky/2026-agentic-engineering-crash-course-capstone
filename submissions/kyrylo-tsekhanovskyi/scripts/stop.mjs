// Stops the stack started by `npm run start`, including Aspire's detached dcp processes, which survive
// when the AppHost is killed from a tool instead of Ctrl+C.
//
//   node scripts/stop.mjs [--dry-run]
//
// First the AppHost is terminated, so Aspire can shut down gracefully (it stops the Api and removes the
// session containers; the data volume stays). Whatever is still running after 20 s is killed.
import { listProcesses, selectStackProcesses } from './lib/processes.mjs';

const GRACE_MS = 20_000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function tryKill(pid, signal) {
  try {
    process.kill(pid, signal);
  } catch {
    // already gone
  }
}

const snapshot = listProcesses();
const found = selectStackProcesses(snapshot);
if (!found.all.length) {
  console.log('The BOMKeeper stack is not running.');
  process.exit(0);
}
for (const p of snapshot.filter((p) => found.all.includes(p.pid))) {
  console.log(`${String(p.pid).padStart(7)}  ${p.name.padEnd(22)} ${p.cmd.slice(0, 110)}`);
}
if (process.argv.includes('--dry-run')) process.exit(0);

found.graceful.forEach((pid) => tryKill(pid, 'SIGTERM'));
const deadline = Date.now() + GRACE_MS;
let left = selectStackProcesses(listProcesses()).all;
while (left.length && found.graceful.length && Date.now() < deadline) {
  await sleep(1_000);
  left = selectStackProcesses(listProcesses()).all;
}

left.forEach((pid) => tryKill(pid, 'SIGKILL'));
await sleep(1_000);
left = selectStackProcesses(listProcesses()).all;
if (left.length) {
  console.error(`Still running: ${left.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('Stopped.');
}
