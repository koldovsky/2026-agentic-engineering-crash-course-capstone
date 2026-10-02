import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectStackProcesses } from '../lib/processes.mjs';

const DCP = 'C:\\nuget\\aspire.hosting.orchestration.win-x64\\13.5.4\\tools\\dcp.exe';
const ROOT = 'D:\\repo\\submissions\\kyrylo-tsekhanovskyi\\backend\\src';

// Shape of a real `npm run start` on Windows (2026-09-30), plus unrelated processes.
const running = [
  { pid: 30996, ppid: 22728, name: 'dotnet.exe', cmd: 'dotnet.exe MSBuild.dll /nodemode:1 /nodeReuse:true' },
  { pid: 13692, ppid: 11628, name: 'node.exe', cmd: 'node.exe npm-cli.js run start' },
  { pid: 13292, ppid: 15312, name: 'dotnet.exe', cmd: 'dotnet  run --project backend/src/BOMKeeper.AppHost' },
  { pid: 11292, ppid: 13292, name: 'BOMKeeper.AppHost.exe', cmd: `"${ROOT}\\BOMKeeper.AppHost\\bin\\Debug\\net10.0\\BOMKeeper.AppHost.exe"` },
  { pid: 11764, ppid: 27220, name: 'dcp.exe', cmd: `${DCP} start-apiserver --monitor 11292 --kubeconfig x` },
  { pid: 3020, ppid: 11764, name: 'dcp.exe', cmd: `${DCP} run-controllers --kubeconfig x` },
  { pid: 25596, ppid: 3020, name: 'dotnet.exe', cmd: 'dotnet exec Aspire.Dashboard.dll' },
  { pid: 26520, ppid: 3020, name: 'dotnet.exe', cmd: `dotnet run --project ${ROOT}\\BOMKeeper.Api\\BOMKeeper.Api.csproj --no-build` },
  { pid: 8792, ppid: 26520, name: 'BOMKeeper.Api.exe', cmd: `"${ROOT}\\BOMKeeper.Api\\bin\\Debug\\net10.0\\BOMKeeper.Api.exe"` },
  { pid: 2688, ppid: 3020, name: 'dcp.exe', cmd: `${DCP} monitor-container --containerID 2c9a --monitor 3020` },
  // Another Aspire app that is alive: must never be touched.
  { pid: 40000, ppid: 1, name: 'Other.AppHost.exe', cmd: 'Other.AppHost.exe' },
  { pid: 40001, ppid: 1, name: 'dcp.exe', cmd: `${DCP} start-apiserver --monitor 40000 --kubeconfig y` },
  { pid: 40002, ppid: 40001, name: 'dcp.exe', cmd: `${DCP} run-controllers --kubeconfig y` },
];

test('selects the AppHost, its launcher, its dcp tree, the dashboard and the Api', () => {
  const { graceful, all } = selectStackProcesses(running);
  assert.deepEqual(graceful, [11292]);
  assert.deepEqual(all, [2688, 3020, 8792, 11292, 11764, 13292, 25596, 26520]);
});

test('never selects unrelated processes or another app', () => {
  const { all } = selectStackProcesses(running);
  for (const pid of [30996, 13692, 40000, 40001, 40002]) assert.ok(!all.includes(pid), `pid ${pid}`);
});

test('after the AppHost is gone, its orphaned dcp tree and Api are still selected', () => {
  const orphans = running.filter((p) => ![13292, 11292].includes(p.pid));
  const { graceful, all } = selectStackProcesses(orphans);
  assert.deepEqual(graceful, []);
  assert.deepEqual(all, [2688, 3020, 8792, 11764, 25596, 26520]);
});

test('nothing running means nothing selected', () => {
  assert.deepEqual(selectStackProcesses(running.filter((p) => p.pid >= 40000 || p.pid === 30996)), {
    graceful: [],
    all: [],
  });
});
