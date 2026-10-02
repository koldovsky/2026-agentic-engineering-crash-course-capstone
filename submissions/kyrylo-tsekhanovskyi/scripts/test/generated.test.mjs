import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isUpToDate } from '../lib/generated.mjs';

function tempFile(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'generated-'));
  const file = path.join(dir, 'schema.d.ts');
  fs.writeFileSync(file, content);
  return file;
}

test('a file that regenerates identically is up to date', async () => {
  const file = tempFile('same');
  assert.equal(await isUpToDate(file, async () => fs.writeFileSync(file, 'same')), true);
});

test('a stale file is reported and left exactly as it was', async () => {
  const file = tempFile('old');
  assert.equal(await isUpToDate(file, async () => fs.writeFileSync(file, 'new')), false);
  assert.equal(fs.readFileSync(file, 'utf8'), 'old');
});

test('a missing file is stale and is not created', async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'generated-')), 'schema.d.ts');
  assert.equal(await isUpToDate(file, async () => fs.writeFileSync(file, 'new')), false);
  assert.equal(fs.existsSync(file), false);
});

test('a failing generator is an error, and the file is restored', async () => {
  const file = tempFile('old');
  await assert.rejects(
    isUpToDate(file, async () => {
      fs.writeFileSync(file, 'partial');
      throw new Error('generator failed');
    }),
    /generator failed/,
  );
  assert.equal(fs.readFileSync(file, 'utf8'), 'old');
});
