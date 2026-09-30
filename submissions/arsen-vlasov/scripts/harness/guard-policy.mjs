/**
 * What the agent is not allowed to do, stated once.
 *
 * Claude Code and Cursor have different hook contracts — one blocks with exit code 2,
 * the other with a JSON permission field — but the policy must not differ between them.
 * The adapters in .claude/hooks/ and .cursor/hooks/ translate; this file decides.
 * Spec: openspec/specs/edit-hooks (the gaps closed on 2026-09-30).
 */

const SECRET_PATHS = [
  /test-data\/users\/static\/(prod|dev)\.json/,
  // .env and every .env.* file, except the template .env.example (it holds no secrets).
  /(^|[\s'"/=])\.env(\.(?!example(?:$|[\s'"]))[\w.-]+)?($|[\s'"])/,
  /\.auth\//,
];

/** Grep and Glob are not covered by Read(...) permission rules, so the guard covers them. */
const STATIC_USERS_FOR_SEARCH = [
  /test-data\/users\/static\/[^\s'"]*\.json\b/,
  /test-data\/users\/static\/?($|[\s'"])/,
];
const SEARCH_TOOLS = new Set(['Grep', 'Glob']);

const PROD_RUN = [/\bENV\s*=\s*['"]?prod\b/i, /--project[= ]prod\b/i];

/** Any path into the journal directory, globs included. The summary commands do not name it. */
const RAW_JOURNAL = [/\.agent-log(\/|$|[\s'"])/];

/** Skipping the git hooks. Quoted text (a commit message) is removed before the match. */
const NO_VERIFY = [/\bgit\s+(commit|push)\b[^|;&\n]*\s--no-verify\b/, /\bgit\s+commit\b[^|;&\n]*\s-[a-zA-Z]*n[a-zA-Z]*\b/];

export const REASONS = {
  prod:
    'Blocked by the harness guard: this would run against prod. ' +
    'Autotests run on stage or dev only — see AGENTS.md, Commands.',
  secret:
    'Blocked by the harness guard: reading a credentials file. ' +
    'Static user keys come from UserManager and passwords from .env.',
  journal:
    'Blocked by the harness guard: raw journal in window. ' +
    'Use `npm run agent:log` — the summary, not .agent-log/ itself.',
  'no-verify':
    'Blocked by the harness guard: this skips the git hooks. ' +
    'Fix what the pre-commit hook reports. Only the human may skip it, in a terminal.',
};

const verdict = (kind) => ({ kind, reason: REASONS[kind] });

/**
 * @param {string} text  every string the tool call carries: command, path, pattern, url
 * @param {string} [toolName]  the tool, when the host tells it (Claude Code does, Cursor does not)
 * @returns {{kind: 'prod'|'secret'|'journal'|'no-verify', reason: string} | null}
 */
export function classify(text, toolName) {
  if (!text) return null;
  if (PROD_RUN.some((re) => re.test(text))) return verdict('prod');
  if (SECRET_PATHS.some((re) => re.test(text))) return verdict('secret');
  if (SEARCH_TOOLS.has(toolName) && STATIC_USERS_FOR_SEARCH.some((re) => re.test(text))) return verdict('secret');
  if (RAW_JOURNAL.some((re) => re.test(text))) return verdict('journal');
  // A git flag acts only in the command arguments. Quoted text and a heredoc body (a commit
  // message) can name the flag without using it.
  const argsOnly = text.replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\1\b/g, '').replace(/"[^"]*"|'[^']*'/g, '""');
  if (NO_VERIFY.some((re) => re.test(argsOnly))) return verdict('no-verify');
  return null;
}

/** Collects every string value in a payload, whatever the host names its fields. */
export function collectStrings(value, depth = 0) {
  if (depth > 6) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap((v) => collectStrings(v, depth + 1));
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap((v) => collectStrings(v, depth + 1));
  }
  return [];
}

const EDITOR_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const EDITOR_ACTION_FIELDS = ['file_path', 'notebook_path'];

/**
 * Returns the strings the guard should actually classify.
 * For editor tools only the path fields count — the content the agent is writing
 * can legitimately mention any protected pattern (documentation, tests, this file)
 * without that constituting a policy violation. For every other tool (Bash, Read,
 * Grep, Glob, WebFetch, ...) we scan the whole payload, because the whole payload
 * is the action.
 */
export function actionStrings(payload) {
  if (!payload || typeof payload !== 'object') return [];
  const input = payload.tool_input ?? payload;
  if (payload.tool_name && EDITOR_TOOLS.has(payload.tool_name)) {
    return EDITOR_ACTION_FIELDS.flatMap((k) => (typeof input[k] === 'string' ? [input[k]] : []));
  }
  return collectStrings(input);
}
