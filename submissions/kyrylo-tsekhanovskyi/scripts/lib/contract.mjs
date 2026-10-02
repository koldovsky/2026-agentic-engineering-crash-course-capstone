// Locates the OpenAPI contract in force (ADR 0010).
// - Canonical: openspec/contracts/openapi.yaml (what is implemented today).
// - An active change that alters the API carries a full modified copy in its contracts/; while it is
//   active, that copy is what the makers build against. Archiving the change promotes it to canonical.
import fs from 'node:fs';
import path from 'node:path';

function activeChangeDirs(root) {
  const changes = path.join(root, 'openspec', 'changes');
  if (!fs.existsSync(changes)) return [];
  return fs
    .readdirSync(changes, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'archive')
    .map((d) => path.join(changes, d.name));
}

// The single active change, or null (several active changes: the first, sorted by name).
export function activeChangeDir(root) {
  return activeChangeDirs(root).sort()[0] ?? null;
}

export function contractPath(root) {
  const withContract = activeChangeDirs(root)
    .map((dir) => path.join(dir, 'contracts', 'openapi.yaml'))
    .filter((file) => fs.existsSync(file));
  if (withContract.length > 1) {
    throw new Error(`More than one active change carries a contract: ${withContract.join(', ')}`);
  }
  return withContract[0] ?? path.join(root, 'openspec', 'contracts', 'openapi.yaml');
}
