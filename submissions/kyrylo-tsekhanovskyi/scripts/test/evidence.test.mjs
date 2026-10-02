import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tickedCheckTaskIds, missingEvidence } from '../lib/evidence.mjs';

const tasksMd = `## Backend

- [x] 1.1 [checks] Project creation scenarios (BLL unit)
- [x] 1.2 Implement project creation
- [ ] 1.3 [checks] Item quantity validation
- [X] 2.1 [checks] Listing status PATCH (API integration)
  - [x] 2.1.1 [checks] nested sub-task
`;

test('only ticked [checks] tasks are collected', () => {
  assert.deepEqual(tickedCheckTaskIds(tasksMd), ['1.1', '2.1', '2.1.1']);
});

test('tasks without a <id>-red.txt file are reported', () => {
  const files = ['1.1-red.txt', 'notes.md', '2.1.1-red.txt'];
  assert.deepEqual(missingEvidence(tasksMd, files), ['2.1']);
});

test('no ticked checks tasks means nothing is missing', () => {
  assert.deepEqual(missingEvidence('- [ ] 1.1 [checks] x', []), []);
});
