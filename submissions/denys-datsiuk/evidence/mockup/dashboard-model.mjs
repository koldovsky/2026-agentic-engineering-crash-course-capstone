// Public synthetic fixture; no backend or private application code.
export const runs = Array.from({ length: 12 }, (_, i) => ({
  id: `RUN-${i + 1}`, name: ['Aurora', 'Cedar', 'Delta'][i % 3],
  date: `2026-09-${String(3 + i * 2).padStart(2, '0')}`, success: i % 5 !== 0
}));
export const changes = runs.flatMap((run, i) => [0, 1].map(j => ({
  id: `CHG-${i * 2 + j + 1}`, date: run.date, entity: `Synthetic entity ${i * 2 + j + 1}`,
  field: j ? 'Projection status' : 'Mapping status'
})));
export const activeAlert = { name: 'Pipeline Orbit', date: '2026-08-15' };
export const pageSize = 3;
export function createState() {
  return { tab: 'overview', range: { from: '2026-09-01', to: '2026-09-30' }, mode: 'quick30', refreshCount: 0,
    views: { overview: { page: 1, selected: null }, changes: { page: 1, selected: null } } };
}
function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
}
export function applyRange(state, from, to, mode = 'custom') {
  if (!from || !to) return 'incomplete';
  if (!validDate(from) || !validDate(to) || from > to) return 'invalid';
  state.range = { from, to }; state.mode = mode; state.refreshCount += 1;
  Object.values(state.views).forEach(view => { view.page = 1; view.selected = null; });
  return 'applied';
}
export function rowsFor(state, tab) {
  return (tab === 'overview' ? runs : changes).filter(row => row.date >= state.range.from && row.date <= state.range.to);
}
export function pageRows(state, tab) {
  const start = (state.views[tab].page - 1) * pageSize;
  return rowsFor(state, tab).slice(start, start + pageSize);
}
export function switchTab(state, tab) {
  if (!Object.hasOwn(state.views, tab)) throw new Error('Unknown tab');
  state.tab = tab;
}
