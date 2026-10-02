import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { contractPath, activeChangeDir } from '../lib/contract.mjs';

function repo({ activeWithContract = [], activeWithout = [], archived = [] } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-'));
  const mk = (rel, file) => {
    fs.mkdirSync(path.join(root, rel), { recursive: true });
    if (file) fs.writeFileSync(path.join(root, rel, file), 'openapi: 3.1.1');
  };
  mk('openspec/contracts', 'openapi.yaml');
  activeWithContract.forEach((c) => mk(`openspec/changes/${c}/contracts`, 'openapi.yaml'));
  activeWithout.forEach((c) => mk(`openspec/changes/${c}`));
  archived.forEach((c) => mk(`openspec/changes/archive/${c}/contracts`, 'openapi.yaml'));
  return root;
}

test('with no active change, the canonical contract is used', () => {
  const root = repo({ archived: ['2026-10-01-add-mvp1-core-tracking'] });
  assert.equal(contractPath(root), path.join(root, 'openspec', 'contracts', 'openapi.yaml'));
});

test("an active change that carries a contract overrides the canonical one", () => {
  const root = repo({ activeWithContract: ['add-tags'] });
  assert.equal(contractPath(root), path.join(root, 'openspec', 'changes', 'add-tags', 'contracts', 'openapi.yaml'));
});

test('an active change without a contract leaves the canonical one in force', () => {
  const root = repo({ activeWithout: ['fix-typo'] });
  assert.equal(contractPath(root), path.join(root, 'openspec', 'contracts', 'openapi.yaml'));
});

test('two active changes that both carry a contract are an error', () => {
  const root = repo({ activeWithContract: ['a', 'b'] });
  assert.throws(() => contractPath(root), /more than one active change/i);
});

test('the active change directory is found, archives excluded', () => {
  const root = repo({ activeWithout: ['add-tags'], archived: ['old'] });
  assert.equal(activeChangeDir(root), path.join(root, 'openspec', 'changes', 'add-tags'));
  assert.equal(activeChangeDir(repo()), null);
});
