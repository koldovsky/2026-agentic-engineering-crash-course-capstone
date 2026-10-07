import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, applyRange, rowsFor, switchTab, pageRows, activeAlert } from '../evidence/mockup/dashboard-model.mjs';
test('global filter updates both datasets inclusively', () => {
  const s = createState(); applyRange(s, '2026-09-09', '2026-09-11');
  assert.deepEqual(rowsFor(s, 'overview').map(r => r.date), ['2026-09-09', '2026-09-11']);
  assert.equal(rowsFor(s, 'changes').length, 4);
  assert.ok(rowsFor(s, 'changes').every(r => ['2026-09-09', '2026-09-11'].includes(r.date)));
});
test('refresh resets active and hidden tab pagination and selection', () => {
  const s = createState();
  Object.values(s.views).forEach(v => { v.page = 2; v.selected = 'selected'; });
  switchTab(s, 'changes'); applyRange(s, '2026-09-09', '2026-09-11');
  Object.values(s.views).forEach(v => assert.deepEqual(v, { page: 1, selected: null }));
  assert.equal(s.tab, 'changes');
});
test('incomplete range cannot refresh or change either tab state', () => {
  const s = createState(); s.views.changes.page = 2;
  const before = structuredClone(s);
  assert.equal(applyRange(s, '', '2026-09-11'), 'incomplete');
  assert.equal(applyRange(s, '2026-09-09', ''), 'incomplete');
  assert.deepEqual(s, before);
});
test('invalid and reversed ranges cannot refresh', () => {
  const s = createState(); const before = structuredClone(s);
  for (const [from, to] of [['2026-09-20', '2026-09-01'], ['2026-02-30', '2026-09-30']]) {
    assert.equal(applyRange(s, from, to), 'invalid'); assert.deepEqual(s, before);
  }
});
test('switching tabs preserves range without another refresh', () => {
  const s = createState(); applyRange(s, '2026-09-09', '2026-09-11');
  switchTab(s, 'changes'); switchTab(s, 'overview');
  assert.equal(s.refreshCount, 1);
  assert.deepEqual(s.range, { from: '2026-09-09', to: '2026-09-11' });
});
test('quick7 filters both tabs; custom range clears quick mode', () => {
  const s = createState(); applyRange(s, '2026-09-24', '2026-09-30', 'quick7');
  assert.equal(rowsFor(s, 'overview').length, 1); assert.equal(rowsFor(s, 'changes').length, 2);
  applyRange(s, '2026-09-09', '2026-09-11'); assert.equal(s.mode, 'custom');
});
test('dated alert is intentionally separate from filtered normal rows', () => {
  const s = createState(); applyRange(s, '2026-09-09', '2026-09-11');
  assert.ok(activeAlert.date < s.range.from); assert.equal(activeAlert.name, 'Pipeline Orbit');
  assert.ok(rowsFor(s, 'overview').every(r => r.date >= s.range.from));
});
test('pagination changes displayed records; empty range yields no rows', () => {
  const s = createState(); const first = pageRows(s, 'changes').map(r => r.id);
  s.views.changes.page = 2; assert.ok(pageRows(s, 'changes').every(r => !first.includes(r.id)));
  applyRange(s, '2026-10-01', '2026-10-02');
  assert.equal(pageRows(s, 'overview').length, 0); assert.equal(pageRows(s, 'changes').length, 0);
});
