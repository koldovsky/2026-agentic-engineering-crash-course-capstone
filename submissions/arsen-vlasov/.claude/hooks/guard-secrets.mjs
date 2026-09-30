#!/usr/bin/env node
/**
 * Claude Code adapter for the shared policy in scripts/harness/guard-policy.mjs.
 * Blocks with exit code 2 and prints the reason to stderr; the host surfaces it.
 * The Cursor adapter (.cursor/hooks/guard-secrets.mjs) mirrors the same policy
 * over Cursor's JSON contract — keep both in sync via the policy file, not here.
 */
import { readFileSync } from 'node:fs';
import { classify, actionStrings } from '../../scripts/harness/guard-policy.mjs';

let payload;
try {
  payload = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}
if (!payload || typeof payload !== 'object') process.exit(0);

const verdict = classify(actionStrings(payload).join(' '), payload.tool_name);
if (verdict) {
  process.stderr.write(verdict.reason + '\n');
  process.exit(2);
}
process.exit(0);
