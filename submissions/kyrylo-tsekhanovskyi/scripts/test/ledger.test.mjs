import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { escapeCell, appendTableRow, parseReviewSummary, unresolvedReviews } from '../lib/ledger.mjs';

const ledger = `# Reviews

| Date | Scope |
|---|---|
| _none yet_ | |

Notes below the table.
`;

test('escapeCell flattens newlines and escapes pipes', () => {
  assert.equal(escapeCell('a | b\nc'), 'a \\| b c');
});

test('the first row replaces the placeholder row', () => {
  const out = appendTableRow(ledger, ['2026-09-29', 'harness']);
  assert.match(out, /\|---\|---\|\n\| 2026-09-29 \| harness \|\n\nNotes below/);
  assert.doesNotMatch(out, /_none yet_/);
});

test('later rows are appended after the last row', () => {
  const once = appendTableRow(ledger, ['d1', 's1']);
  const twice = appendTableRow(once, ['d2', 's2']);
  assert.match(twice, /\| d1 \| s1 \|\n\| d2 \| s2 \|\n\nNotes/);
});

test('the SUMMARY line is parsed', () => {
  const r = parseReviewSummary('blah\nSUMMARY: P0=0 P1=2 P2=1 P3=0 VERDICT=changes-requested\n');
  assert.deepEqual(r, { counts: { P0: 0, P1: 2, P2: 1, P3: 0 }, verdict: 'changes-requested' });
});

test('without a SUMMARY line, [Pn] tags are counted and the verdict is derived from them', () => {
  assert.deepEqual(parseReviewSummary('- [P1] Missing test\n- [P2] Naming\n- [P1] Leak'), {
    counts: { P0: 0, P1: 2, P2: 1, P3: 0 },
    verdict: 'changes-requested (derived)',
  });
  assert.equal(parseReviewSummary('- [P2] Naming\n- [P3] nit').verdict, 'approve (derived)');
  assert.equal(parseReviewSummary('I did not find any issues in these changes.').verdict, 'approve (derived)');
});

test('clean results in the Codex native format are recognized', () => {
  for (const text of [
    'No actionable findings.',
    'The patch is correct.',
    '{"findings":[],"overall_correctness":"patch is correct","overall_explanation":"ok"}',
  ]) {
    assert.equal(parseReviewSummary(text).verdict, 'approve (derived)', text);
  }
});

test('findings in the Codex native JSON format are counted', () => {
  const r = parseReviewSummary(
    '{"findings":[{"title":"[P1] Leak","priority":1},{"title":"[P2] Naming","priority":2}],"overall_correctness":"patch is incorrect"}',
  );
  assert.deepEqual(r, { counts: { P0: 0, P1: 1, P2: 1, P3: 0 }, verdict: 'changes-requested (derived)' });
});

test('output that is neither a summary, findings nor an explicit clean result is unrecognized', () => {
  assert.equal(parseReviewSummary('I could not access the repository.').verdict, 'unrecognized');
});

const reviews = `| Date | Scope | Reviewer | Model / effort | Findings | Verdict | Report | Resolution |
|---|---|---|---|---|---|---|---|
| 2026-09-29 | harness | harness-checker | m | 0/2/5/0 | x | [r](a.md) | fixed |
| 2026-09-30 | be | be-checker | m | 0/1/0/0 | x | [r](b.md) |  |
`;

test('review rows without a Resolution are reported', () => {
  assert.deepEqual(unresolvedReviews(reviews), ['2026-09-30 be (be-checker)']);
  assert.deepEqual(unresolvedReviews('| a | b |\n|---|---|\n| _none yet_ | |\n'), []);
});

test('concurrent ledger writers do not lose rows', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-'));
  const file = path.join(dir, 'ledger.md');
  fs.writeFileSync(file, ledger);
  const lib = pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'ledger.mjs')).href;
  const writers = Array.from({ length: 6 }, (_, i) => {
    const code = `import { appendRowToFile } from ${JSON.stringify(lib)}; appendRowToFile(${JSON.stringify(file)}, ['w${i}', 'x']);`;
    return new Promise((resolve) => spawn(process.execPath, ['--input-type=module', '-e', code]).on('close', resolve));
  });
  const codes = await Promise.all(writers);
  assert.deepEqual(codes, [0, 0, 0, 0, 0, 0]);
  const rows = fs.readFileSync(file, 'utf8').match(/^\| w\d \|/gm) ?? [];
  assert.equal(rows.length, 6);
  fs.rmSync(dir, { recursive: true, force: true });
});
