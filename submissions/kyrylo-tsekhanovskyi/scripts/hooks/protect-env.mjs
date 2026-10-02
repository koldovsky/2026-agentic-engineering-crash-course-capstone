// PreToolUse hook: denies any tool call that reads, writes or runs a command on a .env file.
// Wired in .claude/settings.json, .codex/hooks.json and .agents/hooks.json (Antigravity).
import { readPayload } from './payload.mjs';
import { envAccessInToolInput } from '../lib/env-guard.mjs';

const payload = await readPayload();
if (envAccessInToolInput(payload.toolInput)) {
  const reason = '.env files hold secrets and are off-limits to agents (AGENTS.md). Use .env.example for templates.';
  const output = payload.antigravity
    ? { decision: 'deny', reason }
    : {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: reason,
        },
      };
  process.stdout.write(JSON.stringify(output));
}
