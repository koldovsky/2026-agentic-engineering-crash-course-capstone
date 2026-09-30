#!/usr/bin/env node
/**
 * Step 1 of the api-test skill: is the endpoint in docs/references/endpoints.csv?
 *
 *   node .claude/skills/api-test/scripts/endpoint-lookup.mjs <path> [METHOD]
 *
 * <path> may be a template (/users/{userId}) or a concrete path (/users/42); a
 * query string and a trailing slash are ignored. Prints the matching rows as JSON.
 * Exit 0 — found; exit 1 — not in the registry, stop; exit 2 — bad usage.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const REGISTRY = fileURLToPath(new URL('../../../../docs/references/endpoints.csv', import.meta.url));

export function parseRegistry(text) {
  const [header, ...lines] = text.replace(/^\u{FEFF}/u, '').trim().split(/\r?\n/);
  const cols = header.split(',');
  return lines.map((line) => Object.fromEntries(line.split(',').map((v, i) => [cols[i], v.trim()])));
}

const normalize = (p) => p.split('?')[0].replace(/\/+$/, '') || '/';

function matches(template, path) {
  const t = normalize(template).split('/');
  const p = normalize(path).split('/');
  return t.length === p.length && t.every((seg, i) => /^\{.+\}$/.test(seg) || /^\{.+\}$/.test(p[i]) || seg === p[i]);
}

export function lookup(rows, path, method) {
  return rows.filter(
    (r) => matches(r.endpoint, path) && (!method || r.method.toUpperCase() === method.toUpperCase()),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [path, method] = process.argv.slice(2);
  if (!path?.startsWith('/')) {
    console.error('usage: endpoint-lookup.mjs <path starting with /> [METHOD]');
    process.exit(2);
  }
  const found = lookup(parseRegistry(readFileSync(REGISTRY, 'utf8')), path, method);
  if (found.length === 0) {
    console.error(`NOT FOUND: ${method ? method.toUpperCase() + ' ' : ''}${path} is not in docs/references/endpoints.csv. Stop and tell the user.`);
    process.exit(1);
  }
  console.log(JSON.stringify(found.map(({ method: m, endpoint, tags, priority }) => ({ method: m, endpoint, tags, priority })), null, 2));
}
