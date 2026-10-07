import { createState, applyRange, rowsFor, pageRows, switchTab, activeAlert, pageSize } from './dashboard-model.mjs';
import { diagnose } from './business-diagnostics.mjs';
const loadJson = async url => { const response = await fetch(url); if (!response.ok) throw new Error('Diagnostic configuration unavailable'); return response.json(); };
const diagnosticConfig = Promise.all([loadJson('./business-policy.json'), loadJson('../../factory/schemas/business-diagnostic.schema.json')]);
const state = createState();
const byId = id => document.getElementById(id);
function render() {
  const runs = rowsFor(state, 'overview');
  byId('runs').textContent = runs.length;
  byId('success').textContent = runs.filter(row => row.success).length;
  byId('changes').textContent = rowsFor(state, 'changes').length;
  byId('applied-range').textContent = `${state.range.from} — ${state.range.to} · оновлень: ${state.refreshCount}`;
  byId('range-caption').textContent = `Застосований період: ${state.range.from} — ${state.range.to}`;
  byId('chart').innerHTML = [0, 1, 2, 3].map(index => {
    const count = runs.filter(row => Math.min(3, Math.floor((Number(row.date.slice(-2)) - 1) / 7)) === index).length;
    return `<div class="bar-wrap"><i class="bar green" style="height:${count * 20}%"></i><i class="bar blue" style="height:${count * 10}%"></i><span class="bar-label">Тиждень ${index + 1}</span></div>`;
  }).join('');
  for (const tab of ['overview', 'changes']) {
    const view = state.views[tab];
    const body = tab === 'overview' ? 'run-table' : 'change-table';
    byId(body).innerHTML = pageRows(state, tab).map(row => {
      const cells = tab === 'overview'
        ? `<td>Pipeline ${row.name}</td><td>${row.date}</td><td><span class="pill ${row.success ? 'success' : 'failed'}">${row.success ? 'Успішно' : 'Завершено з помилкою'}</span></td>`
        : `<td>${row.id}</td><td>${row.date}</td><td>${row.entity}</td><td>${row.field}</td>`;
      return `<tr tabindex="0" data-id="${row.id}" class="selectable ${view.selected === row.id ? 'selected' : ''}">${cells}</tr>`;
    }).join('') || '<tr><td colspan="4">За цей період записів немає</td></tr>';
    byId(body).querySelectorAll('[data-id]').forEach(row => {
      const select = () => { view.selected = row.dataset.id; render(); };
      row.addEventListener('click', select);
      row.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); }
      });
    });
    const prefix = tab === 'overview' ? '' : 'change-';
    byId(`${prefix}page-label`).textContent = `Сторінка ${view.page}`;
    byId(`${prefix}selection`).textContent = view.selected ? `Вибрано: ${view.selected}` : 'Нічого не вибрано';
    byId(`${prefix}prev-page`).disabled = view.page === 1;
    byId(`${prefix}next-page`).disabled = view.page * pageSize >= rowsFor(state, tab).length;
    byId(`panel-${tab}`).hidden = state.tab !== tab;
    byId(`tab-${tab}`).setAttribute('aria-selected', String(state.tab === tab));
    byId(`tab-${tab}`).tabIndex = state.tab === tab ? 0 : -1;
  }
  byId('active-alert').textContent = `${activeAlert.name} · Потребує уваги · початок ${activeAlert.date} (поза звітним періодом)`;
  document.querySelectorAll('.quick').forEach(button => button.classList.toggle('active', state.mode === `quick${button.dataset.days}`));
}
function applyDates(mode = 'custom') {
  const result = applyRange(state, byId('date-from').value, byId('date-to').value, mode);
  byId('status').className = result === 'applied' ? 'status ok' : 'status warn';
  byId('status').textContent = result === 'applied'
    ? 'Глобальний фільтр застосовано до обох вкладок · сторінки та вибір скинуто'
    : result === 'incomplete' ? 'Неповний діапазон: оновлення не виконується.' : 'Некоректний діапазон: оновлення не виконується.';
  render();
}
for (const tab of ['overview', 'changes']) {
  byId(`tab-${tab}`).addEventListener('click', () => { switchTab(state, tab); render(); });
  byId(`tab-${tab}`).addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next = event.key === 'Home' ? 'overview' : event.key === 'End' ? 'changes' : tab === 'overview' ? 'changes' : 'overview';
      switchTab(state, next); render(); byId(`tab-${next}`).focus();
    }
  });
  const prefix = tab === 'overview' ? '' : 'change-';
  byId(`${prefix}prev-page`).addEventListener('click', () => { state.views[tab].page -= 1; render(); });
  byId(`${prefix}next-page`).addEventListener('click', () => { state.views[tab].page += 1; render(); });
}
document.querySelectorAll('.quick').forEach(button => button.addEventListener('click', () => {
  byId('date-from').value = button.dataset.days === '7' ? '2026-09-24' : '2026-09-01';
  byId('date-to').value = '2026-09-30'; applyDates(`quick${button.dataset.days}`);
}));
byId('date-from').addEventListener('change', () => applyDates());
byId('date-to').addEventListener('change', () => applyDates());
byId('reset-demo').addEventListener('click', () => {
  Object.assign(state, createState());
  byId('date-from').value = state.range.from; byId('date-to').value = state.range.to;
  byId('status').className = 'status ok'; byId('status').textContent = 'Демо скинуто · глобальний фільтр за 30 днів';
  byId('diagnostic-empty').hidden = false; byId('diagnostic-result').hidden = true;
  byId('diagnostic-empty').textContent = 'Запустіть аналіз обраного синтетичного сценарію.';
  byId('analyze-issue').textContent = 'Проаналізувати alert'; render();
});
byId('analyze-issue').addEventListener('click', async () => {
  byId('analyze-issue').disabled = true;
  try {
    const [policy, schema] = await diagnosticConfig;
    const cases = {
      identity: { invariants: ['IDENTITY-MULTIPLE-CANDIDATES'], affected_count: 3 },
      cardinality: { invariants: ['CARDINALITY-DROP'], affected_count: 240 },
      missing: { invariants: [], affected_count: 0 }
    };
    const input = { correlation_id: 'SYN-RUN-017', policy_version: 1, ...cases[byId('diagnostic-case').value] };
    const result = diagnose(input, policy, schema);
    for (const [id, value] of Object.entries({ category: result.category, impact: result.business_impact, count: result.affected_count ?? 'unknown', confidence: `${result.confidence} · evidence coverage`, evidence: result.evidence.join(', '), action: `${result.recommended_action} · retry: ${result.retry} · human review: ${result.human_review_required}` })) byId(`diagnostic-${id}`).textContent = String(value);
    byId('diagnostic-empty').hidden = true; byId('diagnostic-result').hidden = false;
    byId('analyze-issue').textContent = 'Аналіз готовий';
  } catch (error) {
    byId('diagnostic-result').hidden = true; byId('diagnostic-empty').hidden = false;
    byId('diagnostic-empty').textContent = `STOP: ${error.message}`;
  } finally { byId('analyze-issue').disabled = false; }
});
byId('diagnostic-case').addEventListener('change', () => {
  byId('diagnostic-result').hidden = true; byId('diagnostic-empty').hidden = false;
  byId('diagnostic-empty').textContent = 'Сценарій змінено; запустіть новий аналіз.';
  byId('analyze-issue').textContent = 'Проаналізувати alert';
});
render();
