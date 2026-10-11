## Ім'я

<!-- ВПИШИ СПРАВЖНЄ ІМ'Я ДЛЯ СЕРТИФІКАТА -->

## Проєкт

**Doučko** — домашній репетитор з математики для дитини в 6 класі чеської школи. Вона розв'язує задачі
з робочого зошита свого класу: сама, з батьком онлайн (він в Україні й читає український переклад поруч
із чеським текстом) або з батьком поруч. Відповіді перевіряються автоматично і не розкривають ключ.
Задачі мама вносить у базу з завантажених сторінок зошита (PDF поруч із формою), збирає їх у місії, а
дитина проходить місії, отримує XP і ранги. AI в MVP свідомо немає, його додам після.

**Де код:** три окремі репозиторії (multi-repo + OpenSpec stores, бета):
- [NatSjm/doucko-docs](https://github.com/NatSjm/doucko-docs): вимоги, specs, контракт API, ADR, план, QA-пакет, харнес фабрики
- [NatSjm/doucko-backend](https://github.com/NatSjm/doucko-backend): Kotlin · Spring Boot 4.1 · Postgres
- [NatSjm/doucko-frontend](https://github.com/NatSjm/doucko-frontend): React · Vite · TypeScript

У цій гілці лише [`submissions/doucko/README.md`](submissions/doucko/README.md) з картою репозиторіїв,
станом і командами запуску.

**Стан: MVP завершено.** Усі 9 слайсів плану ([mvp-capability-plan.md](https://github.com/NatSjm/doucko-docs/blob/main/docs/mvp-capability-plan.md))
реалізовані в обох код-репо, кожен пройшов рев'ю й smoke на реальному стеку. Далі були фази фабрики:
Phase 5 (ізольований e2e-стек і Playwright без моків), Phase 6 (QA proof pack:
[acceptance report](https://github.com/NatSjm/doucko-docs/blob/main/docs/qa/mvp-acceptance-report.md), матриця трасування),
Phase 7 (release review всієї історії). Release-перевірка між репо: усі 64 вимоги MVP (48 FR + 16 NFR)
PASS ([D 4b621b0](https://github.com/NatSjm/doucko-docs/commit/4b621b0)). Зараз іде UAT: перший запис
від реального користування — кнопку «Publish» важко знайти ([UAT-1](https://github.com/NatSjm/doucko-docs/blob/main/docs/qa/uat/uat-round-1.md)).

## Відео-демо (1–2 хв)

**Посилання:** https://drive.google.com/file/d/16230eg8Wbxv79KfxyV-sv34odxT2V0YU/view

Відео теж зроблене агентно: Playwright-сценарій
[`record-full-demo.mjs`](https://github.com/NatSjm/doucko-frontend/blob/main/scripts/record-full-demo.mjs)
([субтитри](https://github.com/NatSjm/doucko-frontend/blob/main/docs/qa/full-demo/full-demo.srt)) проходить застосунок на ізольованому e2e-стеку
(адмін вносить задачу й місію → дитина її проходить), а потім показує репозиторії. Підписи українською
накладаються на сторінку під час запису.

## Застосовані практики Agentic Engineering

Скорочення: **D** = doucko-docs, **B** = doucko-backend, **F** = doucko-frontend.

- [x] **Project Factory**. Узяла за основу [koldovsky/project-factory](https://github.com/koldovsky/project-factory)
  @ `0d7286a1` і адаптувала під multi-repo з OpenSpec stores. Що взято, що змінено руками і що відкинуто,
  описано в [D/factory/UPSTREAM.md](https://github.com/NatSjm/doucko-docs/blob/main/factory/UPSTREAM.md).
  Хеш-лок харнесу: [factory-lock.json](https://github.com/NatSjm/doucko-docs/blob/main/factory-lock.json).
  Встановлення: [D fa9674d](https://github.com/NatSjm/doucko-docs/commit/fa9674d), [B 38b56c8](https://github.com/NatSjm/doucko-backend/commit/38b56c8), [F ab84763](https://github.com/NatSjm/doucko-frontend/commit/ab84763).
  Руками додано: `factory.config.json` для трьох репо, `check-workspace.mjs` (traceability між репо),
  читач JaCoCo для coverage-ratchet на Maven, `mvnw.mjs`. Пройдено всі фази фабрики 0–7 з гейтами G0–G8.
  Сам харнес я лагодила протягом проєкту, коли він помилявся (PD-1…PD-16, див. нижче).

- [x] **Контекст-інженерія**.
  - **Статичний контекст.** `CLAUDE.md` = `@AGENTS.md` у кожному репо: [D](https://github.com/NatSjm/doucko-docs/blob/main/AGENTS.md),
    [B](https://github.com/NatSjm/doucko-backend/blob/main/AGENTS.md), [F](https://github.com/NatSjm/doucko-frontend/blob/main/AGENTS.md).
    Що в них: протокол handoff (спершу прочитати `docs/current-state.md`, план і spec слайса); правила
    коректності домену (жодного сирого 500, ключ відповіді не витікає на клієнт, UNPARSEABLE не забирає
    спробу, XP лише додається); test-first з `// @trace FR-x`; заборона комітити дані, що ідентифікують
    дитину (NFR-3), і вміст зошита (NFR-4); блок уроків фабрики (vacuous pass ≠ PASS тощо).
  - **Динамічний контекст.** PostToolUse-hook на `Edit|Write` ([B/.claude/settings.json](https://github.com/NatSjm/doucko-backend/blob/main/.claude/settings.json),
    [hooks-post-edit.mjs](https://github.com/NatSjm/doucko-backend/blob/main/scripts/hooks-post-edit.mjs)) запускає
    ktlint/ESLint на змінений файл і повертає exit 2, тож агент виправляє помилку в тому ж циклі.
    Pre-commit ([hooks-pre-commit.mjs](https://github.com/NatSjm/doucko-backend/blob/main/scripts/hooks-pre-commit.mjs)) ловить секрети
    й порушення NFR-3/NFR-4 і перегенеровує trace-звіти. Handoff між вікнами агента йде через `docs/current-state.md` у кожному репо.
  - **Правило змінилося, агент поводиться інакше.** Виправлення фіксую в `retro/corrections` і реєстрі
    [process-defects.json](https://github.com/NatSjm/doucko-docs/blob/main/docs/qa/process-defects.json):
    - **COR-1 → PD-1.** В агентських шелах `mvnw.cmd` не запускався (`NoDefaultCurrentDirectoryInExePath`).
      [correction](https://github.com/NatSjm/doucko-docs/blob/main/retro/corrections/001-harness-maven-launcher-fails-in-agent-shells-wit.correction.json) →
      фікс [D f3ece43](https://github.com/NatSjm/doucko-docs/commit/f3ece43) → перевстановлення [B 8dd1ec3](https://github.com/NatSjm/doucko-backend/commit/8dd1ec3) →
      [proof](https://github.com/NatSjm/doucko-docs/blob/main/docs/qa/evidence/pd-mvnw-shim-proof.md).
    - **COR-2 → PD-8.** `gate-status` показував G2 PASS, хоча specs ще не було жодного (vacuous pass).
      Фікс [D edc3f19](https://github.com/NatSjm/doucko-docs/commit/edc3f19), [proof](https://github.com/NatSjm/doucko-docs/blob/main/docs/qa/evidence/pd-8-g2-vacuous-pass-proof.md).
    - **PD-15.** Планка «нуль знахідок рев'ю» не сходилася: фронтенд слайсу 1 пройшов 10 раундів рев'ю.
      Я змінила правило на «major виправлені, решта з письмовими disposition»
      ([D 5a7c4f9](https://github.com/NatSjm/doucko-docs/commit/5a7c4f9)). Після цього слайси 2–9 закривалися
      одним раундом рев'ю і одним fix-комітом.
    - **PD-16.** Гейт G5 дивився лише на coverage, а e2e в батареї був на моках. Тобто G5 міг позеленіти, хоча
      реальний стек жодного разу не запускався. Це знайшов рецензент Phase 5 (critical F12). Новий чек
      `check-e2e-stack` приймає лише повний прогін на реальному стеку на чистому коміті, що збігається з HEAD
      ([D f04f481](https://github.com/NatSjm/doucko-docs/commit/f04f481),
      [proof](https://github.com/NatSjm/doucko-docs/blob/main/docs/qa/evidence/pd-16-e2e-stack-gate-proof.md):
      застарілий, «брудний», звужений або порожній прогін дає NOT-EARNED).
      Встановлено в [F 28478f9](https://github.com/NatSjm/doucko-frontend/commit/28478f9) і [B c3a0454](https://github.com/NatSjm/doucko-backend/commit/c3a0454).
  - **Чесно:** самі `AGENTS.md` після встановлення не змінювалися. Правила еволюціонували через
    скрипти фабрики й реєстр PD, а не через текст AGENTS.md.

- [x] **Цикли (loop engineering)**. Свій раннер workflow [D/scripts/run-workflow.mjs](https://github.com/NatSjm/doucko-docs/blob/main/scripts/run-workflow.mjs)
  ([e974fc1](https://github.com/NatSjm/doucko-docs/commit/e974fc1)) запускає headless-кроки `claude -p` з лімітами
  `--max-budget-usd` на агента і `--max-total-usd` на прогін. Workflow:
  [spec-pipeline](https://github.com/NatSjm/doucko-docs/blob/main/.claude/workflows/spec-pipeline.js),
  [spec-crosscheck](https://github.com/NatSjm/doucko-docs/blob/main/.claude/workflows/spec-crosscheck.js),
  [contract-review](https://github.com/NatSjm/doucko-docs/blob/main/.claude/workflows/contract-review.js),
  [review-gate](https://github.com/NatSjm/doucko-backend/blob/main/.claude/workflows/review-gate.js) (find → adversarial verify → report → persist),
  vision-verify, trajectory-eval. Кожен прогін зберігається в `trace/workflow-runs/*.json` з кроками і вартістю.
  - spec-pipeline: 22 кроки, $13.06, переписав 7 baseline specs ([прогін](https://github.com/NatSjm/doucko-docs/blob/main/trace/workflow-runs/20261003-043657-spec-pipeline.json)).
  - Цикл рев'ю контракту API: **57 → 31 → 20 → 18** знахідок за 4 раунди
    ([раунд 1](https://github.com/NatSjm/doucko-docs/blob/main/trace/workflow-runs/20261003-053111-contract-review.json)).
    У раунді 3 знайшовся blocker: `uniqueItems: true` змушував генератор видати невпорядкований `Set`
    для впорядкованого списку задач місії. **Зупинилась** на v0.5, яку так і не пройшла чисто
    ([review-findings.json](https://github.com/NatSjm/doucko-docs/blob/main/openspec/changes/archive/2026-10-03-add-api-contract-v0/review-findings.json)).
    Повторне рев'ю перед релізом я не запускала, це відкритий пункт.
  - Що в циклах ламалося (усе є в run-файлах): відповідь без JSON за схемою (→ PD-13,
    [D d89b46e](https://github.com/NatSjm/doucko-docs/commit/d89b46e)), timeout 20 хв, ліміт сесії, зупинки на бюджеті
    (рев'ю Phase 5 фронтенду — на $20, 10 з 88 кроків не виконались; trajectory-eval фронтенду — на $6 після 6 з 36 оцінок).
    Крок persist мав лише read-only інструменти й звітував «ok», нічого не записавши (→ PD-14).
  - **Trajectory-eval** (агент оцінює, як агент пройшов процес): бекенд 35 з 44 оцінок PASS, найслабше —
    порядок кроків у слайсі 1 (29/100) і в Phase 5 (35/100)
    ([звіт](https://github.com/NatSjm/doucko-backend/blob/main/docs/qa/trajectory-eval-report.md)).
  - Загальна вартість прогонів: docs $31.72, backend $130.31, frontend $187.00 — разом ≈ $349.

- [x] **Верифікація**. Одна команда в кожному репо: `npm run qa:verify` (+ `npm run gate:status`).
  - Backend: **813 unit + 163 integration**, 0 failures, coverage lines 99.3 / branches 91.1, Overall: Pass.
    [Звіт](https://github.com/NatSjm/doucko-backend/blob/main/docs/qa/automated-verification-latest.md).
  - Frontend: lint, typecheck, **679 unit** (coverage 100%), **634 e2e** у chromium/msedge/firefox (+2 flaky), build,
    Overall: Pass. [Звіт](https://github.com/NatSjm/doucko-frontend/blob/main/docs/qa/automated-verification-latest.md).
  - **Реальний стек без моків:** 7 наскрізних сценаріїв (адмін вносить задачу → дитина розв'язує, черга скарг,
    статистика) у трьох браузерах, **21 passed** ([e2e-stack-latest.md](https://github.com/NatSjm/doucko-frontend/blob/main/docs/qa/e2e-stack-latest.md)).
    33 записи-кліпи, кожен з assert на свою FR ([recordings-report](https://github.com/NatSjm/doucko-frontend/blob/main/docs/qa/recordings-report.md)),
    a11y: 15 маршрутів × світла/темна тема, 0 serious ([a11y-report](https://github.com/NatSjm/doucko-frontend/blob/main/docs/qa/a11y-report.json)).
  - **Червоне → зелене окремими комітами:** [B f7a7cfd](https://github.com/NatSjm/doucko-backend/commit/f7a7cfd) «(red)» →
    [B aedd85f](https://github.com/NatSjm/doucko-backend/commit/aedd85f) ([red-run](https://github.com/NatSjm/doucko-backend/blob/main/docs/qa/evidence/release-red-run.md)).
    Цікаво, що червоні тести впали не так, як передбачало рев'ю: замість 500 була 200 на відповідь і 409 на текст задачі.
    Раніше red-прогони фіксувались як файли-докази: [B slice3](https://github.com/NatSjm/doucko-backend/blob/main/docs/qa/evidence/slice3-red-run.md)
    (219 з 224 червоних), [F slice5](https://github.com/NatSjm/doucko-frontend/blob/main/docs/qa/evidence/slice5-red-run.md) (143 з 305).
  - Golden table для перевірки відповідей: 212 кейсів ([B 0120326](https://github.com/NatSjm/doucko-backend/commit/0120326)),
    рев'ю додало ще 5 ([B f26150d](https://github.com/NatSjm/doucko-backend/commit/f26150d)),
    [таблиця](https://github.com/NatSjm/doucko-backend/blob/main/src/test/resources/checking/golden-table.jsonl).
  - **Баг, який не зловили тести:** відновлення старішого дампа БД втрачало таблиці новішої міграції. Знайшов його
    smoke на реальному стеку після слайсу 7 ([B 4828464](https://github.com/NatSjm/doucko-backend/commit/4828464),
    [evidence](https://github.com/NatSjm/doucko-backend/blob/main/docs/qa/evidence/fix-restore-schema-drift.md)).
  - **Чесно:** RED-прогін слайсу 1 фронтенду я не записала; спершу був waiver, потім я його формально прийняла як
    власниця ([F 3e0f02d](https://github.com/NatSjm/doucko-frontend/commit/3e0f02d)). Product-evals (G6) немає:
    у MVP немає AI, тож eval-ratchet лишається PLANNED.

- [x] **maker ≠ checker**. Субагенти-рецензенти [code-reviewer](https://github.com/NatSjm/doucko-backend/blob/main/.claude/agents/code-reviewer.md),
  [security-reviewer](https://github.com/NatSjm/doucko-backend/blob/main/.claude/agents/security-reviewer.md),
  [spec-compliance-auditor](https://github.com/NatSjm/doucko-backend/blob/main/.claude/agents/spec-compliance-auditor.md),
  на фронті ще `vision-judge` (дивиться на скриншоти) і `eval-judge`. Кожну знахідку перевіряє окремий verifier. Що вони знайшли:
  - **Слайс 3, answer-key oracle.** Приклад формату відповіді в підказці міг показати правильне значення (FR-27).
    Виправлено в [B f26150d](https://github.com/NatSjm/doucko-backend/commit/f26150d) і [B 6343ca7](https://github.com/NatSjm/doucko-backend/commit/6343ca7).
  - **Слайс 5 бекенд, critical.** Неякірне правило `.gitignore` `storage/` ховало єдиний адаптер FileStoragePort,
    тож з чистого checkout застосунок не стартував. Виправлено в [B 3738bfe](https://github.com/NatSjm/doucko-backend/commit/3738bfe).
  - **Слайс 6 фронтенд.** «Publish» був активний при незбережених змінах, тож публікувалась стара версія ([F fcaf268](https://github.com/NatSjm/doucko-frontend/commit/fcaf268)).
    Саме цей фікс зробив кнопку неактивною до збереження, і тепер на UAT я сама скаржусь, що її важко знайти (UAT-1).
  - **Слайс 9 бекенд.** Дитина бачила початковий вердикт «неправильно» поруч із переоціненим «правильно» ([B 2dfbb77](https://github.com/NatSjm/doucko-backend/commit/2dfbb77)).
  - **vision-judge** знайшов те, що пропустили assert-и: після публікації місії редактор показував її задачі як «Draft»
    ([red-run](https://github.com/NatSjm/doucko-frontend/blob/main/docs/qa/evidence/phase6-red-run.md),
    [vision-report](https://github.com/NatSjm/doucko-frontend/blob/main/docs/qa/vision-report.md)).
  - **Release review.** Бекенд: 30 знахідок, major — символ NUL у відповіді дитини доходив до Postgres і давав сирий 500
    ([findings](https://github.com/NatSjm/doucko-backend/blob/main/openspec/changes/archive/2026-10-09-release-review-api/review-findings.json)).
    Фронтенд: 22 minor, 3 виправлено ([F ab782c1](https://github.com/NatSjm/doucko-frontend/commit/ab782c1)), але частину лінз обрізав ліміт бюджету.
  - **Повторюваний патерн:** агент позначав задачі як виконані без артефакту (smoke слайсу 4, «qa:verify green» слайсу 5,
    Phase 5 F09/F17, Phase 6 F18). Щоразу це ловив окремий рецензент, а не правило в AGENTS.md.

- [x] **Специфікації наперед (SDD)**. OpenSpec у мультирепо-режимі (stores, бета): store `doucko`
  живе в docs, а код-репо підключають його як submodule `contract/` і посилаються read-only. Порядок комітів:
  specs [D 896fc0a](https://github.com/NatSjm/doucko-docs/commit/896fc0a) (03.10 05:44) →
  контракт v0 [D e112add](https://github.com/NatSjm/doucko-docs/commit/e112add) → 4 раунди рев'ю →
  план слайсів [D 38527fb](https://github.com/NatSjm/doucko-docs/commit/38527fb) →
  checkpoint 2 [D b619b0f](https://github.com/NatSjm/doucko-docs/commit/b619b0f) →
  перший код: [F 7f06645](https://github.com/NatSjm/doucko-frontend/commit/7f06645) (03.10 20:12), [B 69ea343](https://github.com/NatSjm/doucko-backend/commit/69ea343) (04.10).
  Кожен слайс — окрема OpenSpec-зміна (`implement-*`) з proposal/design/tasks, що архівується після рев'ю.
  - **Специфікацію змінила реальність.** Перший запуск генератора на контракті показав, що 3 описи
    в YAML flow-mapping розсипалися на зайві ключі. Звідси контракт 0.5.1
    ([D 4c87d67](https://github.com/NatSjm/doucko-docs/commit/4c87d67),
    [proposal](https://github.com/NatSjm/doucko-docs/blob/main/openspec/changes/archive/2026-10-03-fix-contract-flow-descriptions/proposal.md)).
    Слайс 6 закрив FR-12 у плані, але дитячі сценарії FR-12 потребували ендпоінтів слайсу 7. Рецензент це зловив,
    і план змінено: DoD слайсу 7 покриває ці сценарії ([D 0168eba](https://github.com/NatSjm/doucko-docs/commit/0168eba)).
  - **Чесно:** `proposal/design/tasks` для кожного слайсу комітились разом із кодом слайсу, а не окремим
    комітом перед ним.

- [ ] **Журнал рівнів довіри**: окремо не вела. Найближче до нього — реєстр PD і waivers.

## Інструменти та MCP

- **Claude Code** (desktop app, Code tab), моделі Claude Opus. Headless `claude -p` у власному
  раннері workflow.
- **OpenSpec 1.13** (CLI + skills `openspec-propose/apply/archive/...`, мультирепо stores, бета).
- **Субагенти:** requirements-analyst, spec-writer, capability-implementer, test-engineer, code-reviewer,
  security-reviewer, spec-compliance-auditor, qa-documenter, vision-judge, eval-judge, process-auditor.
- **Hooks:** PostToolUse lint, git pre-commit/commit-msg (секрети, NFR-3/4, трейлер `Slice:`).
- **Перевірки:** Vitest, Playwright (+ axe для a11y), JUnit/Testcontainers, JaCoCo, ktlint, ESLint, Docker Compose e2e-стек.
- MCP-сервери в розробці не використовувала.

## Що вирішувала я, а що агент

**Вирішувала я:**
- Продукт і обсяг: для кого застосунок, три режими (сама / батько онлайн з українським перекладом / батько поруч),
  MVP без AI, приватність дитини і заборона комітити вміст зошита.
- Стек і архітектуру: Kotlin + Spring Boot, React + Vite, три репозиторії зі спільним контрактом
  ([ADR-0001](https://github.com/NatSjm/doucko-docs/blob/main/docs/adr/0001-stack-kotlin-maven-react-vite.md),
  [ADR-0002](https://github.com/NatSjm/doucko-docs/blob/main/docs/adr/0002-multi-repo-openspec-store-and-factory-harness.md)).
  Spring Boot 4.1 замість 3.x, бо підтримка 3.x скінчилася ([ADR-0003](https://github.com/NatSjm/doucko-docs/blob/main/docs/adr/0003-spring-boot-4-and-scaffold-toolchain.md)).
- Чекпоінти: scope ([checkpoint 1](https://github.com/NatSjm/doucko-docs/blob/main/docs/qa/checkpoint-1-scope-signoff.md)),
  план ([checkpoint 2](https://github.com/NatSjm/doucko-docs/blob/main/docs/qa/checkpoint-2-plan-signoff.md):
  спершу «approve with changes», потім прийняла CA-D22), рішення по відкритих питаннях у
  [requirements.md §6.5–6.7](https://github.com/NatSjm/doucko-docs/blob/main/docs/requirements.md).
- Коли харнес помилявся, вирішувала, лагодити фабрику чи обходити: PD-9 «fix the harness»,
  PD-14 «fix in factory», нова планка рев'ю PD-15, real-stack гейт PD-16. Прийняла waiver COR-1. Свідомо не
  перезапускала рев'ю після 3-го раунду фіксів на бекенді й записала це.
- UAT: сама користуюся застосунком і записую, що незручно (UAT-1).

**Робив агент:** вимоги з мого PRD, specs, контракт OpenAPI, план слайсів, тести (спершу червоні), реалізацію,
рев'ю окремими агентами, виправлення за рев'ю, e2e-стек, QA-пакет, handoff у `current-state.md` і сценарій демо-відео.

**Де я втручалась і що пішло не так:**
- Фронтенд слайсу 1 крутився 10 раундів рев'ю (major: 7 → 11 → 7 → 4 → 1 → 2 → 4 → 4 → 0 → 0), прогони падали
  на бюджеті й таймаутах. Я зупинила цикл і змінила критерій виходу (PD-15).
- Агент неодноразово позначав задачі як виконані без доказу. Правило «done-claims-need-evidence» в AGENTS.md було,
  але агент його порушував. Ловили це окремі рецензенти, тому рев'ю окремим агентом у мене обов'язкове для кожного слайсу.
- Гейти давали зелений там, де нічого не перевірялось: G2 без specs (PD-8), G5 без реального стеку (PD-16).
  Довелося лагодити самі вимірювачі.
- Що лишилось відкритим: контракт v0.5 не пройшов чисте рев'ю; бекап файлового сховища (PDF, картинки) не
  покритий NFR-10; частину рев'ю й оцінок обрізав бюджет; acceptance report ще не підписаний.

## Перевірка

```bash
# у кожному з трьох репо
npm ci
npm run qa:verify
npm run gate:status
# backend: npm run verify (Maven); frontend: npm run test:e2e:stack (реальний стек: up → seed → Playwright → down)
```

```
backend   qa:verify — Overall result: Pass   (813 unit + 163 integration, 0 failures)
frontend  qa:verify — Overall result: Pass (1 member(s) PLANNED, not yet due: eval-ratchet)
          unit: 679 passed · coverage 100% · e2e: 634 passed (chromium, msedge, firefox)
          e2e-stack (real backend + Postgres): 21 passed, 0 failed
docs      check-workspace --release --strict-tests: PASS (64 requirements, 0 warnings)
gate-status: backend PASS · frontend PASS · docs PASS
```
