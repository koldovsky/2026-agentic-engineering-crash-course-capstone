// Decides which sides the Stop / SubagentStop hook checks.
// - Only an identified maker is checked, and only on its own side, so a finished maker is never blocked
//   by the other maker's unfinished (deliberately red) work.
// - The main session's Stop is never checked: it runs while the makers are still building and testing
//   (locked DLLs), and the orchestrator runs the full `npm run check` explicitly at each sync point.
// - Unknown or unidentified subagents are not checked either: with no owner there is no fair side.
import fs from 'node:fs';
import path from 'node:path';

const OWN_SIDE = { 'be-maker': 'be', 'fe-maker': 'fe' };

export function sidesToCheck(agent, changed, event = 'SubagentStop') {
  if (event === 'Stop') return [];
  const own = OWN_SIDE[agent];
  return own && changed[own] ? [own] : [];
}

// Claude Code does not always put the subagent type in the hook input; it does write it to
// `subagents/agent-<id>.meta.json` next to the subagent transcript ({"agentType": "be-maker"}).
export function resolveAgentType(payload) {
  if (payload.agent_type) return payload.agent_type;
  const transcript = payload.agent_transcript_path;
  if (!transcript) return null;
  const meta = path.join(path.dirname(transcript), `${path.basename(transcript, '.jsonl')}.meta.json`);
  try {
    return JSON.parse(fs.readFileSync(meta, 'utf8')).agentType || null;
  } catch {
    return null;
  }
}
