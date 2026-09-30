#!/usr/bin/env node
/**
 * Copies MCP keys from .env into .claude/settings.local.json.
 *
 * Claude Code does not read .env. Its MCP config expands ${VAR} from the environment of
 * the process that launched it, which means a key exported in one terminal is invisible
 * to a session started from the editor. The `env` block in settings.local.json is read
 * whatever the launch path, and that file is gitignored, so the key never reaches the
 * repository.
 *
 * Cursor needs none of this for stdio servers — `envFile` in .cursor/mcp.json points at
 * .env directly. Its remote servers still read the shell environment.
 *
 * Usage: npm run mcp:sync
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const KEYS = ['CONTEXT7_API_KEY'];
const ENV_FILE = '.env';
const SETTINGS = '.claude/settings.local.json';

if (!existsSync(ENV_FILE)) {
  console.error(`No ${ENV_FILE}. Copy .env.example to .env and fill in the keys.`);
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(ENV_FILE, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=');
      if (i === -1) return null;
      const key = line.slice(0, i).trim();
      const value = line.slice(i + 1).split('#')[0].trim().replace(/^["']|["']$/g, '');
      return [key, value];
    })
    .filter(Boolean),
);

mkdirSync('.claude', { recursive: true });
const settings = existsSync(SETTINGS) ? JSON.parse(readFileSync(SETTINGS, 'utf8')) : {};
settings.env ??= {};

const copied = [];
const missing = [];
const placeholder = [];

for (const key of KEYS) {
  const value = env[key];
  if (!value) {
    missing.push(key);
  } else if (/^your-|^\.\.\.$|^<.*>$/.test(value)) {
    placeholder.push(key);
  } else {
    settings.env[key] = value;
    copied.push(key);
  }
}

writeFileSync(SETTINGS, `${JSON.stringify(settings, null, 2)}\n`);

console.log(`${SETTINGS} updated.`);
console.log(`  copied:      ${copied.join(', ') || '—'}`);
if (placeholder.length) console.log(`  placeholder: ${placeholder.join(', ')} — still the example value`);
if (missing.length) console.log(`  missing:     ${missing.join(', ')} — not present in ${ENV_FILE}`);
console.log('\nRestart the Claude Code session for the new values to take effect.');
