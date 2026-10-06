<!--
Заповнений шаблон здачі capstone (за .github/PULL_REQUEST_TEMPLATE.md). Чернетка Maker для перегляду Mykhailo: не закомічена, не запушена.
Посилання вказують лише на файли й коміти, які вже є в origin (гілка mykhailo-zanizdra, HEAD 5dfa1e1). Файли, створені після пушу, названо шляхом без посилання.
Усе, що може дати лише Mykhailo, позначено Mykhailo Zanizdra.
-->

## Ім'я

Mykhailo Zanizdra: справжнє ім'я для сертифіката.

## Проєкт

AgentFlow — вигаданий сервіс для розробки з AI-агентами. Одна сторінка-лендінг (Next.js, TypeScript, Tailwind) із вісьмома секціями та демо-формою waitlist без бекенду: нічого не надсилається й не зберігається. Проєкт навмисно малий: мета — повний інженерний цикл із доказами, а не обсяг продукту.

**Де код:** гілка [`mykhailo-zanizdra`](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/tree/mykhailo-zanizdra) цього форку, проєкт у корені репозиторію. Файли курсу (`README.md`, `RUBRIC.md`, `.github/`) не змінені.

## Відео-демо (1–2 хв)

**Посилання:** https://youtu.be/kBGaF7LfAdw.

## Застосовані практики Agentic Engineering

Повна таблиця «практика → доказ → прогалини» зі свіжими прогонами: `docs/capstone-conditions-evidence.md`. Старіший аудит: [docs/rubric-audit.md](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/blob/mykhailo-zanizdra/docs/rubric-audit.md).

- [x] **Контекст-інженерія** (правила / `AGENTS.md`, статичний vs динамічний контекст) — доказ:
  - Статичний: [`AGENTS.md`](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/blob/mykhailo-zanizdra/AGENTS.md) (правила проєкту додано в коміті [61b2981](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/commit/61b2981): спершу специфікація, межі обсягу, `pnpm check`, Definition of Done; заборона чіпати `.env*` додана раніше, у [c5695a6](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/commit/c5695a6)), [`PRODUCT_BRIEF.md`](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/blob/mykhailo-zanizdra/PRODUCT_BRIEF.md), [`TECH_STACK.md`](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/blob/mykhailo-zanizdra/TECH_STACK.md).
  - Правило спрацювало: рецензент позначив порушення правила, виправлено — [рев'ю налаштування `pnpm check`](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/blob/mykhailo-zanizdra/docs/reviews/2026-10-05-pnpm-check-setup-review.md) (задачі відмічені без збереженого прогону).
  - Динамічний: hooks [`log-action.mjs`](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/blob/mykhailo-zanizdra/.claude/hooks/log-action.mjs) і [`protect-env.mjs`](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/blob/mykhailo-zanizdra/.claude/hooks/protect-env.mjs). Живий журнал станом на 2026-10-06: 349 завершених дій у 10 сесіях (`pnpm agent:log`; вивід: [2026-10-06-conditions-agent-log-summary.txt](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/blob/mykhailo-zanizdra/docs/runs/2026-10-06-conditions-agent-log-summary.txt)). Синтетичні самотести окремо: [2026-10-04-protect-env.json](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/blob/mykhailo-zanizdra/docs/runs/2026-10-04-protect-env.json). Сирий журнал у git-ignore. **Прогалина:** збереженого прикладу живої заблокованої дії немає.
- [x] **Верифікація** (тести / evals / перевірки) — доказ:
  - Одна команда `pnpm check`: typecheck → lint → Vitest (15 тестів) → Playwright (58 тестів, Chromium 375 і 1440 px). Деталі в розділі «Перевірка» нижче.
  - Червоне → зелене для другої зміни: [polish-red.txt](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/blob/mykhailo-zanizdra/docs/runs/2026-10-05-polish-red.txt) (до коду падали 3 юніт- і 10 E2E-тестів) → [polish-green.txt](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/blob/mykhailo-zanizdra/docs/runs/2026-10-05-polish-green.txt) (exit 0). Коміти: [e5b9ab7](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/commit/e5b9ab7), [c231505](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/commit/c231505).
  - **Прогалини:** червоне видно за збереженими файлами, а не за історією git (тести й код в одному коміті); пари першого циклу неідеальні; CI немає; один тест нестабільний (див. нижче).
- [x] **maker ≠ checker** (окремий агент або прохід на рев'ю) — доказ: субагент-рецензент [`.claude/agents/reviewer.md`](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/blob/mykhailo-zanizdra/.claude/agents/reviewer.md) (Opus, лише читає); 13 звітів станом на 5dfa1e1 у [`docs/reviews/`](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/tree/mykhailo-zanizdra/docs/reviews), у кожному резолюція. Зауваження змінили роботу, приклади: [рев'ю специфікації](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/blob/mykhailo-zanizdra/docs/reviews/2026-10-05-agentflow-spec-review.md) (1 P2 + 4 P3), [рев'ю реалізації другої зміни](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/blob/mykhailo-zanizdra/docs/reviews/2026-10-05-polish-implementation-review.md) (8 зауважень, 3 з них P2), [аудит RUBRIC](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/blob/mykhailo-zanizdra/docs/reviews/2026-10-05-rubric-audit-review.md) (11). Раніше (2026-10-04) Codex був Checker для hooks і повернув «changes required» ([звіт](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/blob/mykhailo-zanizdra/docs/reviews/2026-10-04-logging-hooks-review.md)). **Прогалина:** зараз обидві ролі виконує Claude Code (затверджений воркфлоу), це не рев'ю двома інструментами; частину ідентифікаторів сесій позначено unknown.
- [x] **Специфікації наперед (SDD)** — доказ: OpenSpec-зміна `agentflow-landing` закомічена в [18baac5](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/commit/18baac5) до коду фічі ([b921515](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/commit/b921515) і далі). Специфікацію змінили, бо реальність не збіглася: друга зміна `polish-waitlist-and-faq` ([2a44921](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/commit/2a44921), до її коду) править заархівовані вимоги в [`openspec/specs/`](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/tree/mykhailo-zanizdra/openspec/specs). **Прогалина:** скафолд ([4666845](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/commit/4666845)) старіший за специфікацію.

## Інструменти та MCP

- **Claude Code**, Sonnet 5.5 — Maker (специфікація, тести, код, докази). Субагент `reviewer` на Opus — Checker.
- **Codex** — перші правки воркфлоу й hooks логування: hooks, захист `.env*`, diff воркфлоу, зроблений Codex і перевірений у [24886a0](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/commit/24886a0) (за [звітом](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/blob/mykhailo-zanizdra/docs/reviews/2026-10-05-workflow-update-review.md)), Checker для hooks 2026-10-04.
- **OpenSpec** CLI (`pnpm exec openspec`) і skills `openspec-*`; hooks логування та захисту `.env*`; Vitest, Playwright (Chromium), Zod.
- **MCP:** у репозиторії власних MCP-серверів немає (`.mcp.json` відсутній); окремих MCP для проєкту не заявляється. У живому журналі видно виклики `mcp__hearthbot__*`: це канал чату проєкту, через який агент спілкувався з Mykhailo, а не інструмент розробки.

## Що вирішував я, а що агент

**Агент (Claude Code, Sonnet) зробив:** специфікації, тести, код, збір доказів, виправлення за зауваженнями. **Checker** лише звітував і нічого не правив.

**Що вирішувала людина (з повідомлень Mykhailo в чаті проєкту та з репозиторію):**
- Бриф, стек, межі обсягу й зміна воркфлоу 2026-10-05 (Claude Code виконує обидві ролі) затверджені власником продукту: [PRODUCT_BRIEF.md](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/blob/mykhailo-zanizdra/PRODUCT_BRIEF.md).
- Чотири «go» 2026-10-05 між 13:41 і 14:07 UTC; роботу агента запущено лише після них. Першим повідомленням додано «я сам потім запушу нехай будуть локально»; гілку пушить Mykhailo («я сам запушу», 20:27 UTC).
- Специфікація другої зміни (`polish-waitlist-and-faq`: очищення помилки форми й анімація FAQ) пройшла окреме рев'ю Checker, а реалізація пішла після слова «далі» (20:17 UTC, чат проєкту).
- Mykhailo Zanizdra: підтверди, що ця зміна виникла з твого власного огляду сторінки (помилка не зникала, FAQ без анімації); це записано лише в нотатках агентів.
- Mykhailo Zanizdra: що зупинено, відкочено або вирішено інакше самостійно; схвалення нових залежностей для `pnpm check`, якщо хочеш його назвати; пояснення часу комітів (див. нижче).

**Що пішло не так (реальне, зі збережених доказів):**
- Задачі 1.1–1.4 агент відмітив без збереженого прогону ([рев'ю](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/blob/mykhailo-zanizdra/docs/reviews/2026-10-05-pnpm-check-setup-review.md)).
- Помилки в тестах: опечатка в regex, конфлікт локатора `alert` з анонсером маршрутів Next.js; обидві виправив Maker.
- Живі регіони форми спершу могли не озвучуватись (P2, виправлено; зі справжнім скрінрідером не перевірено).
- Друга зміна: формулювання специфікації («коротка» анімація, «жодної іншої анімації») були нетестовними (два P2); рев'ю реалізації повернуло звіт як неповний через прогалини в доказах; припущення, що `getAnimations()` показує перехід FAQ, було хибним ([діагностика](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/blob/mykhailo-zanizdra/docs/runs/2026-10-05-polish-getanimations-diagnostic.txt)).
- Перевірка 2026-10-06: тест FAQ у `tests/e2e/landing.spec.ts:134-139` один раз упав (exit 1 на mobile-375), далі 2 прогони `pnpm check` і 5 прогонів E2E пройшли. Причина не з'ясована: таймінг тесту або справжня рідкісна помилка на 375 px. Тест не змінювався, щоб позеленіти.
- Історія виглядає закомічена пакетами: [18baac5](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/commit/18baac5) і [93d408e](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/commit/93d408e) мають однакову мітку 16:45:02, а [e5b9ab7](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/commit/e5b9ab7), [c231505](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/commit/c231505), 7521cb6 і 5dfa1e1 лежать у межах трьох секунд (23:25:33–23:25:36 за локальним часом). Mykhailo Zanizdra: пояснення.
- Візуальну перевірку обох ширин робив лише агент; людської перевірки не записано. Mykhailo Zanizdra.

## Перевірка

Команда: `pnpm check` (typecheck → lint → Vitest → Playwright, Chromium 375 і 1440 px). Свіжий вивід 2026-10-06 на HEAD 5dfa1e1 (повний вивід: [2026-10-06-conditions-check-run2-pass.txt](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/blob/mykhailo-zanizdra/docs/runs/2026-10-06-conditions-check-run2-pass.txt); раніше збережений повний вивід тієї самої кодової бази: [polish-green.txt](https://github.com/mykhailo-zanizdra-dev/2026-agentic-engineering-crash-course-capstone/blob/mykhailo-zanizdra/docs/runs/2026-10-05-polish-green.txt)):

```
pnpm check                                          → exit 0 у 2 з 3 прогонів;
                                                      Vitest: 15 тестів, Playwright: 58 тестів
                                                      (перший прогін: exit 1, 1 впав, 57 пройшли:
                                                       [mobile-375] landing.spec.ts:107 FAQ marker rotates…)
pnpm test:e2e ×5                                    → 58 пройшли щоразу
pnpm build                                          → exit 0
pnpm exec openspec validate --all --strict          → exit 0, 2 специфікації пройшли
pnpm hooks:selftest                                 → exit 0, 47 пройшли (синтетичні дані, не жива активація)
```
