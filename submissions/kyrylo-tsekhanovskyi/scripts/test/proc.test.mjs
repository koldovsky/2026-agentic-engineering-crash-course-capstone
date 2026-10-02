import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../lib/proc.mjs';

const VALUES = ['red', 'filter', 'change'];

test('value options consume the next argument verbatim, even when it starts with dashes', () => {
  const { options, positional } = parseArgs(['fe', '--red', '1.2', '--filter', '--include src/app/items/**'], VALUES);
  assert.deepEqual(positional, ['fe']);
  assert.deepEqual(options, { red: '1.2', filter: '--include src/app/items/**' });
});

test('flags without values are true', () => {
  assert.deepEqual(parseArgs(['be', '--fast'], VALUES).options, { fast: true });
});

test('a value option without a value is an error', () => {
  assert.throws(() => parseArgs(['be', '--red'], VALUES), /--red needs a value/);
});
