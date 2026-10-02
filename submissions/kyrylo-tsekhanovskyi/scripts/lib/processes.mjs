// Finds the processes of the running BOMKeeper stack (`npm run start`).
//
// Aspire's root `dcp start-apiserver` is detached from the AppHost and only watches it through
// `--monitor <pid>`; the dashboard, the Api launcher and the Api hang below that dcp. So the stack is:
// the AppHost and its `dotnet run` launcher, the dcp roots that monitor our AppHost (or whose monitored
// process is gone, i.e. orphans), every descendant of those, and any orphaned BOMKeeper.Api.
import { spawnSync } from 'node:child_process';

const APPHOST = /BOMKeeper\.AppHost/i;
const API_NAME = /^BOMKeeper\.Api(\.exe)?$/i;
const APPHOST_NAME = /^BOMKeeper\.AppHost(\.exe)?$/i;
const DCP_ROOT = /\bstart-apiserver\b/;
const MONITOR = /--monitor (\d+)/;

export function selectStackProcesses(processes) {
  const byPid = new Map(processes.map((p) => [p.pid, p]));
  const isAppHost = (p) => APPHOST.test(p.name) || APPHOST.test(p.cmd);

  const roots = processes.filter((p) => {
    if (isAppHost(p) || API_NAME.test(p.name)) return true;
    if (!/^dcp(\.exe)?$/i.test(p.name) || !DCP_ROOT.test(p.cmd)) return false;
    const monitored = byPid.get(Number(MONITOR.exec(p.cmd)?.[1]));
    return !monitored || isAppHost(monitored);
  });

  const children = new Map();
  for (const p of processes) children.set(p.ppid, [...(children.get(p.ppid) ?? []), p.pid]);
  const all = new Set();
  const pending = roots.map((p) => p.pid);
  while (pending.length) {
    const pid = pending.pop();
    if (all.has(pid)) continue;
    all.add(pid);
    pending.push(...(children.get(pid) ?? []));
  }

  const sorted = [...all].sort((a, b) => a - b);
  const graceful = processes.filter((p) => APPHOST_NAME.test(p.name)).map((p) => p.pid);
  return { graceful: graceful.filter((pid) => all.has(pid)).sort((a, b) => a - b), all: sorted };
}

// Snapshot of the OS process table as { pid, ppid, name, cmd }.
export function listProcesses() {
  if (process.platform === 'win32') {
    const ps = spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Compress',
      ],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
    return JSON.parse(ps.stdout || '[]').map((p) => ({
      pid: p.ProcessId,
      ppid: p.ParentProcessId,
      name: p.Name ?? '',
      cmd: p.CommandLine ?? '',
    }));
  }
  const ps = spawnSync('ps', ['-eo', 'pid=,ppid=,comm=,args='], { encoding: 'utf8' });
  return ps.stdout
    .split('\n')
    .map((line) => /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(line))
    .filter(Boolean)
    .map(([, pid, ppid, name, cmd]) => ({ pid: +pid, ppid: +ppid, name, cmd }));
}
