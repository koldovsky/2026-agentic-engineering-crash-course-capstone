// Normalizes hook payloads from Claude Code, Codex and Antigravity (JSON on stdin).
export async function readPayload() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  const p = raw.trim() ? JSON.parse(raw) : {};
  const antigravity = 'toolCall' in p || 'conversationId' in p;
  return {
    raw: p,
    tool: antigravity ? 'antigravity' : 'turn_id' in p ? 'codex' : 'claude',
    antigravity,
    session: p.session_id ?? p.conversationId ?? 'unknown',
    agent: p.agent_type ?? p.agent_id ?? null,
    model: p.model ?? p.modelName ?? null,
    toolName: p.tool_name ?? p.toolCall?.name ?? null,
    toolInput: p.tool_input ?? p.toolCall?.args ?? {},
  };
}
