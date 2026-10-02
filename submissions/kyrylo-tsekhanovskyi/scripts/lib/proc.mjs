// Process and path helpers shared by the scripts. Everything resolves from the submission root,
// so the scripts work no matter which directory a tool starts them from.
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Local calendar date (YYYY-MM-DD); UTC would log yesterday's date after local midnight.
export const today = () => new Date().toLocaleDateString('sv-SE');

// Runs a shell command, streams its output (unless quiet) and also returns it.
export function run(command, { cwd = ROOT, quiet = false, input } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, { cwd, shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    const onData = (stream) => (chunk) => {
      output += chunk;
      if (!quiet) stream.write(chunk);
    };
    child.stdout.on('data', onData(process.stdout));
    child.stderr.on('data', onData(process.stderr));
    if (input !== undefined) child.stdin.write(input);
    child.stdin.end();
    child.on('close', (exitCode) => resolve({ exitCode: exitCode ?? 1, output }));
  });
}

export function runSync(command, args, options = {}) {
  // With a shell, pass one command string: separate args + shell:true is deprecated (DEP0190).
  if (options.shell) return spawnSync([command, ...args].join(' '), { cwd: ROOT, encoding: 'utf8', ...options });
  return spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', ...options });
}

export function dockerIsRunning() {
  return runSync('docker', ['info', '--format', '{{.ServerVersion}}'], { shell: true }).status === 0;
}

// Parses options: names listed in `valueOptions` take the next argument verbatim (even if it starts
// with dashes, e.g. `--filter "--include src/**"`); any other `--name` is a boolean flag.
export function parseArgs(argv, valueOptions = []) {
  const options = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const name = arg.slice(2);
    if (!valueOptions.includes(name)) {
      options[name] = true;
    } else if (i + 1 < argv.length) {
      options[name] = argv[++i];
    } else {
      throw new Error(`--${name} needs a value`);
    }
  }
  return { options, positional };
}

export function tail(text, lines = 40) {
  return text.trimEnd().split(/\r?\n/).slice(-lines).join('\n');
}
