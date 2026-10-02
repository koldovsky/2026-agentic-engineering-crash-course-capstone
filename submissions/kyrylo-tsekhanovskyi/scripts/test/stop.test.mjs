import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sidesToCheck, resolveAgentType } from '../lib/stop.mjs';

const both = { be: true, fe: true };

test('a maker subagent is checked only on its own side', () => {
  assert.deepEqual(sidesToCheck('be-maker', both, 'SubagentStop'), ['be']);
  assert.deepEqual(sidesToCheck('fe-maker', both, 'SubagentStop'), ['fe']);
});

test('a maker with no changes on its side is not checked', () => {
  assert.deepEqual(sidesToCheck('be-maker', { be: false, fe: true }, 'SubagentStop'), []);
});

test('unknown or unidentified subagents are never checked (no cross-maker blocking)', () => {
  assert.deepEqual(sidesToCheck('Explore', both, 'SubagentStop'), []);
  assert.deepEqual(sidesToCheck(null, both, 'SubagentStop'), []);
});

test("the main session's Stop is never checked (it would race the makers' builds)", () => {
  assert.deepEqual(sidesToCheck(null, both, 'Stop'), []);
});

test('the agent type comes from agent_type when present', () => {
  assert.equal(resolveAgentType({ agent_type: 'fe-maker' }), 'fe-maker');
});

test("otherwise it is read from the subagent transcript's .meta.json", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'subagents-'));
  fs.writeFileSync(path.join(dir, 'agent-ae59.meta.json'), JSON.stringify({ agentType: 'be-maker' }));
  const transcript = path.join(dir, 'agent-ae59.jsonl');
  assert.equal(resolveAgentType({ agent_type: '', agent_id: 'ae59', agent_transcript_path: transcript }), 'be-maker');
});

test('without any agent information the type is null', () => {
  assert.equal(resolveAgentType({ agent_type: '' }), null);
  assert.equal(resolveAgentType({ agent_id: 'x', agent_transcript_path: '/nowhere/agent-x.jsonl' }), null);
});
