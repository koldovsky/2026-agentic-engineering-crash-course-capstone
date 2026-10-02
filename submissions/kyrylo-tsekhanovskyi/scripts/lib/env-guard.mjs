// Detects access to .env* files (secrets) in tool input. Only the exact `.env.example` template is allowed.
//
// Best effort against DIRECT access, not a sandbox: it catches literal names in any letter case (Windows
// resolves `.ENV` to `.env`), suffixes (`.env+backup`, `.env{,.local}`), redirection (`<.env`) and dotfile
// globs that can match a .env file (`.e*`, `.[e]nv`, `.e{nv,x}`). Commands that read everything
// (`grep -r . `, `Get-Content *`) cannot be caught by inspecting the command line.
const BOUNDARY = `\\s"'\`=:(/\\\\<>;|&,`;
const LITERAL = new RegExp(
  `(?:^|[${BOUNDARY}])\\.env(?!\\.example(?=$|[${BOUNDARY})]))[^${BOUNDARY})]*`,
  'i',
);
const GLOB_CHARS = /[*?[{]/;
const SAMPLE_NAMES = ['.env', '.env.local', '.env.production', '.env.development'];

// Keys that carry what a tool writes (file content, edit text), not where it reads or writes.
const CONTENT_KEYS = /content|string|source|edits|description|prompt|instruction/i;

function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') re += '.*';
    else if (c === '?') re += '.';
    else if (c === '[') {
      const end = glob.indexOf(']', i + 1);
      if (end === -1) re += '\\[';
      else {
        re += `[${glob.slice(i + 1, end).replace(/\\/g, '\\\\')}]`;
        i = end;
      }
    } else if (c === '{') {
      const end = glob.indexOf('}', i + 1);
      if (end === -1) re += '\\{';
      else {
        re += `(?:${glob
          .slice(i + 1, end)
          .split(',')
          .map((alt) => alt.replace(/[.+^$()|\\]/g, '\\$&'))
          .join('|')})`;
        i = end;
      }
    } else re += c.replace(/[.+^$()|\\\]}]/g, '\\$&');
  }
  return new RegExp(`^${re}$`, 'i');
}

// A dotfile glob (the basename starts with '.') that could expand to a .env file.
function globMatchesEnvFile(token) {
  const base = token.split(/[/\\]/).pop();
  if (!base.startsWith('.') || !GLOB_CHARS.test(base)) return false;
  try {
    const re = globToRegExp(base);
    return SAMPLE_NAMES.some((name) => re.test(name));
  } catch {
    return true; // an unparsable dotfile glob is treated as dangerous
  }
}

export function mentionsEnvFile(text) {
  const s = String(text);
  if (LITERAL.test(s)) return true;
  return s.split(/[\s"'`=:(<>;|&]+/).some(globMatchesEnvFile); // no ',' split: it belongs to {a,b}
}

// Judges a tool call by its targets (paths, glob patterns, shell commands), so writing a document
// that merely mentions .env files is allowed.
export function envAccessInToolInput(toolInput) {
  return Object.entries(toolInput ?? {})
    .filter(([key]) => !CONTENT_KEYS.test(key))
    .some(([, value]) => mentionsEnvFile(typeof value === 'string' ? value : JSON.stringify(value)));
}
