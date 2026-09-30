#!/usr/bin/env node
/**
 * SessionStart hook: prints the newest block of docs/logs/session-notes.md, so a new or compacted
 * session continues from its "Start from" line. Claude Code adds stdout to the context.
 * Spec: openspec/specs/edit-hooks ("A session starts from the last notes"). Always exits 0.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NOTES = 'docs/logs/session-notes.md';

/** The first "## " section, up to the next one. An empty string when there is none. */
export function newestBlock(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.startsWith('## '));
  if (start < 0) return '';
  const next = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  return `${lines.slice(start, next < 0 ? lines.length : next).join('\n').trim()}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const file = join(process.env.CLAUDE_PROJECT_DIR ?? process.cwd(), NOTES);
    const block = existsSync(file) ? newestBlock(readFileSync(file, 'utf8')) : '';
    if (block) {
      process.stdout.write(`The newest block of ${NOTES}. Continue from its "Start from" line:\n\n${block}`);
    }
  } catch {
    // A notes problem must never stop a session from starting.
  }
  process.exit(0);
}
