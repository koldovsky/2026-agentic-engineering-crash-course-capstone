import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { diagnose, validateResult } from '../evidence/mockup/business-diagnostics.mjs';
const json = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const policy = json('../evidence/mockup/business-policy.json');
const schema = json('../factory/schemas/business-diagnostic.schema.json');
const input = { correlation_id: 'SYN-RUN-017', policy_version: 1, invariants: ['IDENTITY-MULTIPLE-CANDIDATES'], affected_count: 3 };
const cases = readFileSync(new URL('../factory/evals/business-diagnostics.jsonl', import.meta.url), 'utf8').trim().split('\n').map(JSON.parse);
for (const item of cases) test(`diagnostic eval ${item.case_id} executes input`, () => {
  const actual = diagnose(item.input, policy, schema);
  for (const [key, value] of Object.entries(item.expected)) assert.deepEqual(actual[key === 'allowed_action' ? 'recommended_action' : key], value);
});
test('signals produce different diagnoses, not a static response', () => {
  assert.equal(diagnose(input, policy, schema).category, 'identity_ambiguity');
  assert.equal(diagnose({ ...input, invariants: ['FRESHNESS-EXPIRED'] }, policy, schema).category, 'freshness_violation');
});
test('missing evidence blocks retry and requires human review', () => {
  const result = diagnose({ ...input, affected_count: undefined }, policy, schema);
  assert.equal(result.category, 'insufficient_evidence'); assert.equal(result.retry, 'blocked'); assert.equal(result.human_review_required, true);
});
test('unknown signal reduces coverage and escalates', () => {
  const result = diagnose({ ...input, invariants: [...input.invariants, 'UNKNOWN-SIGNAL'] }, policy, schema);
  assert.equal(result.confidence, 0.5); assert.equal(result.recommended_action, 'escalate_domain_owner'); assert.equal(result.retry, 'blocked');
});
test('conflicting signals, unknown policy and unsafe inputs stop', () => {
  for (const invalid of [{ ...input, policy_version: 99 }, { ...input, correlation_id: 'unsafe' }, { ...input, affected_count: -1 }, { ...input, payload: 'not allowed' }, { ...input, invariants: [...input.invariants, 'CARDINALITY-DROP'] }]) assert.throws(() => diagnose(invalid, policy, schema), /STOP/);
});
test('policy cannot recommend a forbidden action', () => {
  const bad = structuredClone(policy); bad.categories.identity_ambiguity.recommended_action = 'modify_source_record';
  assert.throws(() => diagnose(input, bad, schema), /allowlisted/);
});
test('schema rejects missing, extra and incorrectly typed output', () => {
  const output = diagnose(input, policy, schema);
  const missing = { ...output }; delete missing.evidence;
  for (const bad of [missing, { ...output, confidence: 2 }, { ...output, affected_count: '3' }, { ...output, retry: 'unsafe' }, { ...output, extra: true }]) assert.throws(() => validateResult(bad, schema), /Schema/);
});
