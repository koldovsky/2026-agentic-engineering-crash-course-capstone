# Capstone Submission

## Ім'я

**Denys Datsiuk**

## Проєкт

**Safety-Aware Operations Dashboard for an On-Premises Integration Platform**

Приватна .NET-платформа синхронізує дані з кількох систем у локальне сховище, нормалізує та зіставляє сутності, формує прикладні проєкції й виконує додаткову калібрацію. Представлений vertical slice покращує operations dashboard: повний діапазон дат автоматично оновлює таблиці та скидає застарілий UI state, але активні операційні проблеми залишаються видимими незалежно від звітного періоду.

Це не просто ETL або Azure Data Factory pipeline. Система реалізує доменне зіставлення, identity resolution, вирішення конфліктів, ідемпотентність, partial-result handling, audit та operator-facing safety invariants. Production-код і реальні дані не публікуються; PR містить санітизовані артефакти та synthetic evidence.

**Де код:** [`submissions/denys-datsiuk/`](https://github.com/ddatsiuk/2026-agentic-engineering-crash-course-capstone/tree/denys-datsiuk/submissions/denys-datsiuk)

## Відео-демо

**Посилання:** [agentic-engineering-capstone.mp4 — Google Drive](https://drive.google.com/file/d/1R3quKQtJ2n_izeva8XKquGz7CgSPy64w/view?usp=sharing)

Відео зберігається лише зовні; медіафайлів і сценаріїв озвучки в Git немає. Заміна hosted-файлу й фінальна перевірка повного відтворення без авторизації залишаються окремими кроками. URL зберігається через Google Drive `Manage versions`.

## Застосовані практики Agentic Engineering

- [x] **Контекст-інженерія** — [`AGENTS.md`](https://github.com/ddatsiuk/2026-agentic-engineering-crash-course-capstone/blob/denys-datsiuk/submissions/denys-datsiuk/AGENTS.md), [deny та scope controls](https://github.com/ddatsiuk/2026-agentic-engineering-crash-course-capstone/blob/denys-datsiuk/submissions/denys-datsiuk/docs/dotnet-agent-controls.md).
- [x] **Цикли (loop engineering)** — [factory lifecycle та correction loop](https://github.com/ddatsiuk/2026-agentic-engineering-crash-course-capstone/blob/denys-datsiuk/submissions/denys-datsiuk/factory/README.md), [ledger](https://github.com/ddatsiuk/2026-agentic-engineering-crash-course-capstone/blob/denys-datsiuk/submissions/denys-datsiuk/factory/ledger.jsonl).
- [x] **Верифікація** — [verification record](https://github.com/ddatsiuk/2026-agentic-engineering-crash-course-capstone/blob/denys-datsiuk/submissions/denys-datsiuk/docs/verification.md), [eval plan і mutation gates](https://github.com/ddatsiuk/2026-agentic-engineering-crash-course-capstone/blob/denys-datsiuk/submissions/denys-datsiuk/docs/evaluation-plan.md).
- [x] **maker ≠ checker** — [окремі role contracts](https://github.com/ddatsiuk/2026-agentic-engineering-crash-course-capstone/tree/denys-datsiuk/submissions/denys-datsiuk/factory/roles) та [checker report](https://github.com/ddatsiuk/2026-agentic-engineering-crash-course-capstone/blob/denys-datsiuk/submissions/denys-datsiuk/factory/runs/CAP-001/check-report.md).
- [x] **Специфікації наперед (SDD)** — [specification з acceptance scenarios](https://github.com/ddatsiuk/2026-agentic-engineering-crash-course-capstone/blob/denys-datsiuk/submissions/denys-datsiuk/docs/specification.md) і [traceability matrix](https://github.com/ddatsiuk/2026-agentic-engineering-crash-course-capstone/blob/denys-datsiuk/submissions/denys-datsiuk/docs/traceability.md).
- [x] **Журнал рівнів довіри** — [autonomy log](https://github.com/ddatsiuk/2026-agentic-engineering-crash-course-capstone/blob/denys-datsiuk/submissions/denys-datsiuk/docs/autonomy-log.md).
- [x] **Project Factory** — [lights-on factory](https://github.com/ddatsiuk/2026-agentic-engineering-crash-course-capstone/blob/denys-datsiuk/submissions/denys-datsiuk/factory/README.md) з bounded roles, deterministic gates, back pressure і human-controlled release.
- [x] **Reusable skill** — [verify-capstone skill](https://github.com/ddatsiuk/2026-agentic-engineering-crash-course-capstone/blob/denys-datsiuk/submissions/denys-datsiuk/.agents/skills/verify-capstone/SKILL.md).

## Інструменти та MCP

Робота виконувалася з Codex: repository rules, локальні shell-перевірки, browser automation для synthetic UI demo, окремі maker/checker contracts, reusable verification skill, JSON Schema, policy evals і Docker sandbox без мережі. MCP або зовнішнім агентам не надавалися production credentials чи operational data.

## Що вирішував я, а що агент

Я визначив бізнес-проблему, дозволений scope, safety invariant для активних помилок, межу публікації приватного коду та фінальну release authority. Агент дослідив UI/backend/test surface, сформував специфікацію, реалізаційний план, перевірки, synthetic demo й пакет доказів.

Під час роботи я відхилив трактування активного alert як звичайного результату date filter: його навмисно залишено видимим як operational invariant. Також реальні й замазані production screenshots замінено synthetic evidence, а заяви про приватні тести чітко позначено як historical, а не відтворювані з цього PR.

## Перевірка

Public synthetic кейс: обидві вкладки використовують глобальний фільтр дат і скидають navigation state; неповний період не змінює застосовані дані. Вісім model-тестів dashboard і дев'ять тестів виконуваної бізнес-діагностики проходять. UI та evals використовують спільний policy-driven аналізатор зі schema validation; це не приватні .NET-результати й не автономний LLM-агент. Одинадцять Python regression-тестів перевіряють deny/scope, staging, publication tree та TRX-контролі. CI запускається з кореневого workflow; медіа в Git заборонені.

```text
Executable diagnostic evals passed.
Factory integrity checks passed.
Package structure checks passed.
```

Команда: `bash scripts/verify-package.sh`. Для поточної проміжної версії до фінального human media review використовуються явні `ALLOW_VIDEO_TODO=1` та `ALLOW_PENDING_REVIEW=1`; strict gate навмисно залишається red, доки не завершено фінальну перевірку відео та незалежний checker verdict.

Приватний non-live suite під час реалізації: 1,285 passed, 10 live integration tests excluded, 0 failed. Це historical evidence; без приватного репозиторію результат не відтворюється.

## Обмеження

- Production source і diff не публікуються.
- UI regression test є template-focused, а не повним browser E2E.
- Live database integration tests не входили до recorded verification boundary.
