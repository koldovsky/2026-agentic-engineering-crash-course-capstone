# PR description draft (course template)

Draft written by the Maker from repository evidence only. Fields marked TODO are personal to Mykhailo and are left empty on purpose; do not fill them with agent-written claims about your decisions.

## Ім'я

TODO

## Проєкт

AgentFlow — одна сторінка-лендінг (Next.js, TypeScript, Tailwind) з вісьмома секціями та демо-формою waitlist без бекенду. Побудована за OpenSpec-специфікацією в парі Maker (Claude Code, Sonnet) / Checker (субагент `reviewer`, Opus).

**Де код:** гілка `mykhailo-zanizdra` цього форку (корінь репозиторію).

## Відео-демо (1–2 хв)

**Посилання:** TODO

## Застосовані практики Agentic Engineering

Повна таблиця «практика → доказ → прогалини»: [docs/rubric-audit.md](docs/rubric-audit.md).

- [x] **Контекст-інженерія** — `AGENTS.md`, `PRODUCT_BRIEF.md`, `TECH_STACK.md`, `openspec/config.yaml`; hooks `.claude/hooks/log-action.mjs` і `protect-env.mjs`. Правила, що спрацювали: ревʼю цитують AGENTS.md, і порушення виправлені — `docs/reviews/2026-10-05-pnpm-check-setup-review.md`, `docs/reviews/2026-10-05-waitlist-validation-review.md`. Жива активація hooks — записана заява в `docs/reviews/2026-10-05-workflow-update-review.md` (сирий лог не закомічено); збережені JSON-прогони — синтетичні (`docs/runs/2026-10-04-protect-env.json`).
- [ ] **Цикли (loop engineering)** — не заявляю. Є лише ручні повторні прогони після помилок у тестах (див. нижче), автоматизованого циклу немає.
- [x] **Верифікація** — `pnpm check` (typecheck → lint → Vitest → Playwright, 375 і 1440 px). Червоні прогони: `docs/runs/2026-10-05-waitlist-unit-red.txt` (модуль ще не існував) → `…-unit-green.txt`; `docs/runs/2026-10-05-waitlist-e2e-red.txt` (обрізаний) → `…-waitlist-form-check-pass.txt`; тести після ревʼю частково переписані, тож це не «чисті» пари. Фінал: `docs/runs/2026-10-05-final-check.txt`, `…-audit-check.txt`.
- [x] **maker ≠ checker** — `.claude/agents/reviewer.md`; звіти в `docs/reviews/`: специфікація (1 P2 + 4 P3), чотири зрізи реалізації (7 зауважень), зміна воркфлоу (1 P3), фінальне (1 P3), ревʼю цього аудиту; кожен із резолюцією. Зараз обидві ролі в Claude Code (за затвердженим воркфлоу 2026-10-05), не двоінструментне ревʼю. Раніше (2026-10-04) Codex був Checker для hooks логування і автором diff воркфлоу 24886a0. Частина ідентифікаторів сесій невідома й позначена як unknown.
- [x] **Специфікації наперед (SDD)** — OpenSpec-зміна `agentflow-landing` у коміті 18baac5 до коду (b921515 і далі). Виправлення за ревʼю специфікації внесено до першого коміту й не ревʼюилися повторно, тож в історії git вони не видні — лише в `docs/reviews/2026-10-05-agentflow-spec-review.md`.
- [ ] **Журнал рівнів довіри** — не вівся.
- [ ] **Project Factory** — не використовувався.

### Що пішло не так

Задачі 1.1–1.4 відмічені без збереженого прогону; опечатка в regex тесту; конфлікт локатора `alert` з анонсером маршрутів Next.js; живі регіони форми спершу могли не озвучуватися (виправлено, зі скрінрідером не перевірено); Codex-Checker повернув «changes required» для hooks логування. Деталі й посилання: розділ 3 [docs/rubric-audit.md](docs/rubric-audit.md). TODO (Mykhailo): поясни час комітів — 18baac5 і 93d408e мають однакову мітку 16:45:02, реалізація в історії займає ~15 хвилин.

## Інструменти та MCP

Claude Code (Sonnet — Maker; субагент `reviewer` на Opus — Checker), раніше також Codex (hooks логування, правки воркфлоу, Checker 2026-10-04); OpenSpec CLI (`pnpm exec openspec`), skills `openspec-*`, hooks логування та захисту `.env*`, Playwright (Chromium). TODO: допиши, якщо користувався чимось ще.

## Що вирішував я, а що агент

Агент: специфікація, тести, код, збір доказів, виправлення за зауваженнями Checker. Checker: лише звітував, нічого не правив. У репозиторії зафіксовано затвердження власником продукту: бриф, стек і межі обсягу, а також зміну воркфлоу 2026-10-05.

TODO (Mykhailo): що ти вирішив, зупинив, відкотив або змінив сам. Не залишай поле порожнім.

## Перевірка

```
pnpm check                                         → exit 0 (Vitest: 12 тестів; Playwright: 38 тестів, Chromium 375 і 1440 px)
pnpm build                                         → exit 0
pnpm exec openspec validate agentflow-landing --strict → exit 0
```

Повний вивід: [docs/runs/2026-10-05-audit-check.txt](docs/runs/2026-10-05-audit-check.txt).

Відомі обмеження: візуальну перевірку зробив лише агент (потрібна людська); живі регіони не перевірено зі справжнім скрінрідером.
