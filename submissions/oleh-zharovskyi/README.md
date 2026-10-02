# AI Vocabulary Learning App with SRS: Oleh Zharovskyi

**Ім'я:** Oleh Zharovskyi  
**Проєкт:** AI Vocabulary Learning App with SRS (Spaced Repetition System)  
**Де код:** [`main` branch](https://github.com/zharovskyi/words-tolearn)  
**Відео-демо (1–2 хв):** [Відео-демо](https://drive.google.com/file/d/1Puvg0CWQmW4MG3eq3qxUqGl4873K8lsz/view?usp=sharing)  
**Посилання:** https://words-tolearn.vercel.app/  

### Застосовані практики Agentic Engineering

- **Контекст-інженерія (правила / AGENTS.md, статичний vs динамічний контекст) — доказ:**  
  Правила для агента лежать у [`AGENTS.md`](https://github.com/zharovskyi/words-tolearn/blob/main/AGENTS.md): стек, практики App Router (Server Actions в окремій папці `actions/`, Server Components за замовчуванням, `"use client"` лише за потреби), без `any`, виправляти помилки TypeScript перед наступним завданням, читати `docs/prd.md` перед схемами. Блок про Next.js у тому ж файлі вимагає читати документацію з `node_modules/next/dist/docs/`. Захист `.env`: [`.claude/settings.json`](https://github.com/zharovskyi/words-tolearn/blob/main/.claude/settings.json) (заборона `Read(.env)`) та [`.claudeignore`](https://github.com/zharovskyi/words-tolearn/blob/main/.claudeignore).  
  Де правила справді спрацювали: (1) `actions/` — усі Server Actions у [`actions/word-actions.ts`](https://github.com/zharovskyi/words-tolearn/blob/main/actions/word-actions.ts), а не всередині компонентів; (2) `"use client"` лише у 4 компонентах: `AddWordForm`, `ReviewCard`, `WordActions`, `NavLinks` (решта сторінок серверні); (3) перед написанням сторінок агент прочитав `docs/connection.md` та `mutating-data.md` з `node_modules/next/dist/docs/`, тому сторінки, що читають базу, починаються з `await connection()` ([`app/page.tsx`](https://github.com/zharovskyi/words-tolearn/blob/main/app/page.tsx)); (4) `docs/prd.md` прочитано перед пропозицією та схемою ([`e27514b`](https://github.com/zharovskyi/words-tolearn/commit/e27514b), [`09ca8c6`](https://github.com/zharovskyi/words-tolearn/commit/09ca8c6)); (5) `.env` агент не читав: ключ і URL діагностувалися скриптом, що друкує лише довжину й префікс значення. Заблокованої дії в журналі немає: правило не довелося примусово застосовувати.  
  Чесно про розбіжності: не створено `loading.tsx` та `error.tsx`, яких вимагає `AGENTS.md`; назви полів схеми відрізняються від названих у правилі (відповідність задокументована в `AGENTS.md`). Динамічного контексту (hook або MCP) немає; роль динамічного контексту виконували `tasks.md`, стан Git і вивід `npm run verify`.  
  Коміти: [`e6c86ed`](https://github.com/zharovskyi/words-tolearn/commit/e6c86ed) (PRD та правила), [`e27514b`](https://github.com/zharovskyi/words-tolearn/commit/e27514b) (`.claude/settings.json`, `.claudeignore`), [`806beee`](https://github.com/zharovskyi/words-tolearn/commit/806beee) (Server Actions в `actions/`), [`0ee2969`](https://github.com/zharovskyi/words-tolearn/commit/0ee2969) (`connection()` у сторінках).

- **Цикли (loop engineering) замість покрокового промптингу — доказ:**  
  Цикл — це команда `npm run verify` (`prisma validate`, `prisma generate`, `tsc --noEmit`, `lint`, Vitest, `next build`), яку агент запускав після кожної зміни й повторював «запуск → помилка → виправлення», доки код виходу не ставав 0. Записані прогони з ітераціями у [`docs/loop-log.md`](https://github.com/zharovskyi/words-tolearn/blob/main/docs/loop-log.md): додавання Vitest — 3 ітерації ([`51bd843`](https://github.com/zharovskyi/words-tolearn/commit/51bd843): відсутній модуль, конфлікт `@types/node`, зелений прогін), підтримка Turso — 3 ітерації ([`ab48c41`](https://github.com/zharovskyi/words-tolearn/commit/ab48c41): помилка типу TS2345, правило ESLint про хуки, зелений прогін), fail-safe — 2 ітерації ([`aaa415a`](https://github.com/zharovskyi/words-tolearn/commit/aaa415a): помилка TS1501, зелений прогін). У журналі також є вивід прогону, зробленого в кінці роботи.  
  Обмеження: цикл запускає сам агент у межах однієї сесії, а не автоматичний hook чи окремий харнес, і він охоплює лише «зроби так, щоб перевірки пройшли». Що будувати далі, вирішували кроки користувача.

- **Верифікація (тести / evals / перевірки) — доказ:**  
  Кількість тестів зросла з 16 до 95 (8 тестових файлів). Інтеграційні тести працюють на тимчасовій базі SQLite, яка створюється з реальних міграцій для кожного тестового файлу, тому `dev.db` не зачіпається. AI-крок тестується з мокнутою моделлю. Окремо проведено мутаційну перевірку вручну: 6 навмисних поломок (інтервал, порядок черги, перевірка «ще не час», причина архівації, захист від дублікатів, кількість прикладів), кожну з яких виявив хоча б один тест. Також перевірено, що production-збірка (`.next/static`) не містить API-ключів.  
  Коміти: [`51bd843`](https://github.com/zharovskyi/words-tolearn/commit/51bd843) (перші 12 тестів логіки SRS), [`eff5ca1`](https://github.com/zharovskyi/words-tolearn/commit/eff5ca1) (інтеграційні тести, 76 тестів), [`ab48c41`](https://github.com/zharovskyi/words-tolearn/commit/ab48c41) та [`aaa415a`](https://github.com/zharovskyi/words-tolearn/commit/aaa415a) (тести Turso-URL і fail-safe, разом 87), [`6fe7e52`](https://github.com/zharovskyi/words-tolearn/commit/6fe7e52) (регресійні тести за результатами рев'ю, разом 95).

- **maker ≠ checker (окремий агент або прохід на рев'ю) — доказ:**  
  Три проходи перевірки. (1) Окремий прохід рев'ю: навичка `/code-review` (рівень high) у відокремленому контексті, який не бачив розмови, де писався код, прочитав готовий код і знайшов 4 проблеми. Maker перевірив кожну знахідку в коді (3 підтвердилися, 1 частково: одна деталь була хибною) і виправив усі чотири: слова, що застрягали в `PENDING`, гонка при автокорекції написання, картка повторення, що лишала відкриту відповідь, і міграція Turso без транзакції. Додано 3 регресійні тести, які падають на старому коді та проходять на новому. Повний запис: [`docs/code-review.md`](https://github.com/zharovskyi/words-tolearn/blob/main/docs/code-review.md). (2) Другий прохід рев'ю: файл агента-рецензента [`.claude/agents/reviewer.md`](https://github.com/zharovskyi/words-tolearn/blob/main/.claude/agents/reviewer.md) (лише читання, без права редагувати й читати `.env`). Він нічого важливого не знайшов і назвав 3 дрібні зауваження; одне перевірено й виправлено (дата в архіві не враховувала `APP_TIMEZONE`), два перевірено й свідомо не виправлено з поясненням. Дослівний вивід і рішення: [`docs/reviewer-output.md`](https://github.com/zharovskyi/words-tolearn/blob/main/docs/reviewer-output.md). Чесно: сесія, що створила файл агента, ще не завантажила його, тому ті самі інструкції дослівно передано загальному субагенту. (3) Ручна перевірка користувачем: наскрізне тестування UI в браузері (додавання слів, генерація ШІ, кнопки повторення, навігація, архів), створення ключа Gemini API та бази Turso, ухвалення рішень за пропозиціями агента. Обмеження: рев'юер працює на тій самій моделі (лише в новому контексті) і код не запускав.  
  Коміти: [`034201d`](https://github.com/zharovskyi/words-tolearn/commit/034201d) (агент-рецензент і його вивід), [`6fe7e52`](https://github.com/zharovskyi/words-tolearn/commit/6fe7e52) (виправлення за результатами рев'ю), [`137a81d`](https://github.com/zharovskyi/words-tolearn/commit/137a81d) (етап 8 у журналі: ручне E2E-тестування користувачем).

- **Специфікації наперед (SDD) — доказ:**  
  Розробку почато з OpenSpec-зміни `add-vocabulary-srs-core` (proposal, design, 4 специфікації, tasks), яку було створено до написання коду. Вимоги, додані під час реалізації (автокорекція написання, навігація й сторінка «How it works», порядок забутих слів у черзі), занесено до специфікацій уже після реалізації, під час синхронізації. Зміну провалідовано через `openspec validate --strict` і заархівовано як `2026-10-01-add-vocabulary-srs-core`; у `openspec/specs/` тепер 5 специфікацій.  
  Коміти: [`e27514b`](https://github.com/zharovskyi/words-tolearn/commit/e27514b) (пропозиція, дизайн, специфікації, завдання), [`137a81d`](https://github.com/zharovskyi/words-tolearn/commit/137a81d) (синхронізація, валідація, архівація).

- **Журнал рівнів довіри — доказ:**  
  Файл `docs/trust_journal.md` містить 12 етапів розробки з рівнем довіри (від Medium до High), обґрунтуванням, хешами комітів і обмеженнями. Зокрема в ньому зафіксовано інцидент, коли тестовий скрипт агента видалив слово користувача з локальної бази.  
  Коміти: [`2c876f2`](https://github.com/zharovskyi/words-tolearn/commit/2c876f2) (створення журналу), [`fab294e`](https://github.com/zharovskyi/words-tolearn/commit/fab294e) (етапи 2–3), [`8631181`](https://github.com/zharovskyi/words-tolearn/commit/8631181) (етапи 4–7), [`137a81d`](https://github.com/zharovskyi/words-tolearn/commit/137a81d) (етапи 8–9), [`eff5ca1`](https://github.com/zharovskyi/words-tolearn/commit/eff5ca1) (етап 10), [`6fe7e52`](https://github.com/zharovskyi/words-tolearn/commit/6fe7e52) (етап 11: незалежне рев'ю).

- **Project Factory — доказ:**  
  Не застосовувався: `/project-factory:init` не запускався, структуру проєкту створено з `create-next-app` та вручну. Практика необов'язкова.

- **Інше — доказ:**  
  Безпека й надійність: перевірка збірки на витік ключів, fail-safe в `lib/db.ts` (у production без `DATABASE_URL_LIBSQL` застосунок кидає зрозумілу помилку, а не переходить на локальний файл; перевірено запуском production-сервера з URL і без нього), підтримка Turso (libSQL) для хмарної бази, автокорекція написання слів із захистом від підміни слова (відстань редагування).  
  Коміти: [`aaa415a`](https://github.com/zharovskyi/words-tolearn/commit/aaa415a) (fail-safe), [`ab48c41`](https://github.com/zharovskyi/words-tolearn/commit/ab48c41) (Turso), [`27320f9`](https://github.com/zharovskyi/words-tolearn/commit/27320f9) (автокорекція).  
  Відомий відхід від `AGENTS.md`: правило вимагає полів `nextReviewDate` (DateTime), `intervalLevel` (Int) і `contextSentences` (JSON), а в схемі вони називаються `dueDate` (рядок `YYYY-MM-DD` у часовому поясі застосунку, щоб інтервали в днях не залежали від UTC і літнього часу), `level` та окрема таблиця `Example` (по одному рядку на речення з порядком `position`). Це відповідність за змістом, а не за назвами; її задокументовано в `AGENTS.md`.

### Інструменти та MCP
Next.js 16.3.8 (App Router), React 19, TypeScript, Tailwind CSS 4, SQLite, Turso (libSQL), Prisma 7.10.0, Vitest 5, Vercel AI SDK, Google Gemini API (`@ai-sdk/google`, модель `gemini-3.5-flash-lite`), OpenSpec CLI, Claude Code (розширення VS Code). MCP-сервери не використовувались.

### Що вирішував(ла) я, а що агент
- **Я (Людина / Checker) — конкретні рішення:**
  - ідея продукту, `docs/prd.md` і правила в `AGENTS.md` ([`e6c86ed`](https://github.com/zharovskyi/words-tolearn/commit/e6c86ed));
  - вибір моделі: агент запропонував Anthropic за замовчуванням, я обрав Google Gemini, спочатку 2.0 Flash, потім `gemini-3.5-flash-lite` ([`e27514b`](https://github.com/zharovskyi/words-tolearn/commit/e27514b), припущення A5 в `design.md`);
  - порядок робіт: спершу «Retry» і «Delete», потім архів; окремо замовив навігацію в шапці та сторінку «How it works» ([`ce7f64e`](https://github.com/zharovskyi/words-tolearn/commit/ce7f64e), [`1ce51b7`](https://github.com/zharovskyi/words-tolearn/commit/1ce51b7));
  - автокорекція написання: з двох запропонованих варіантів обрав автоматичне виправлення з показом змін ([`27320f9`](https://github.com/zharovskyi/words-tolearn/commit/27320f9));
  - Turso для production, локальна файлова база для розробки без перенесення 5 локальних слів; сам вимагав fail-safe у production ([`ab48c41`](https://github.com/zharovskyi/words-tolearn/commit/ab48c41), [`aaa415a`](https://github.com/zharovskyi/words-tolearn/commit/aaa415a));
  - створення ключа Gemini і бази Turso, ручне наскрізне тестування в браузері (етап 8 журналу, [`137a81d`](https://github.com/zharovskyi/words-tolearn/commit/137a81d)); саме ручний тест показав, що в повторенні «лишається одне слово» (це пояснив агент, потім знайдено і справжній баг із відкритою відповіддю, [`6fe7e52`](https://github.com/zharovskyi/words-tolearn/commit/6fe7e52));
  - рівні довіри для етапів 1–3; рішення, що вважати завершеним.
- **Агент (Claude Code / Maker):** вибір стабільної Prisma 7.10.0 замість release candidate 8.0, схема бази й міграція, Server Actions, логіка SRS, інтеграція Gemini, інтерфейс, скрипт `npm run verify`, 79 нових тестів і ручна мутаційна перевірка, `scripts/turso-migrate.ts`, fail-safe в `lib/db.ts`, OpenSpec-документи, README, журнал довіри (рівні для етапів 4–7 і 9–12 запропонував агент), агент-рецензент і журнал циклу.

#### Що пішло не так (помилки агента)
- **Застарілі припущення про моделі.** Агент закладав Anthropic, потім Gemini 2.0 Flash як типову. Модель `gemini-1.5-flash`, яку я ставив у `.env`, повернула 404; актуальні ідентифікатори агент перевірив списком моделей для мого ключа.
- **Видалив мої дані.** Тестовий скрипт агента закінчувався `deleteMany()` і стер слово, яке я додав у локальну базу. Це записано в журналі довіри (етап 4); відтоді скрипти видаляють лише власні записи.
- **Баги, пропущені автором.** Незалежне рев'ю знайшло 4 проблеми в готовому коді: слова, що застрягали в `PENDING`, гонка при автокорекції, картка повторення з відкритою відповіддю після «Forgot», міграція Turso без транзакції ([`6fe7e52`](https://github.com/zharovskyi/words-tolearn/commit/6fe7e52)).
- **Хибне твердження в звіті.** Агент назвав розбіжність схеми з `AGENTS.md` «свідомим відходом», хоча правило тоді не зіставлялося зі схемою; після того, як я попросив усе зробити коректно, відповідність задокументовано ([`06255bd`](https://github.com/zharovskyi/words-tolearn/commit/06255bd)).
- **Неточності в першій версії звіту:** версія Next.js 15 замість 16.3.8, неправильна кількість тестів, «CI/CD», якого немає, і заява про Project Factory; усе виправлено перед здачею.
- **Дрібні збої:** кілька прогонів `verify` падали на типах і правилах ESLint (див. `docs/loop-log.md`); два рази перевірка підсвічування меню давала хибний негатив через неправильний `grep`.

### Перевірка
```text
$ npm run verify
prisma validate      -> The schema at prisma/schema.prisma is valid
prisma generate      -> Prisma Client generated
tsc --noEmit         -> без помилок
eslint               -> без помилок
vitest run           -> Test Files 8 passed (8); Tests 95 passed (95)
next build           -> Compiled successfully; TypeScript пройдено
exit code            -> 0

Тести за файлами:
  actions/word-actions.integration.test.ts   30
  lib/srs/review.integration.test.ts         21
  lib/ai/enrich.test.ts                      13
  lib/srs/schedule.test.ts                   12
  lib/db-config.test.ts                       8
  lib/text.test.ts                            4
  lib/words.test.ts                           4
  lib/libsql-url.test.ts                      3

Перевірено на коміті 6fe7e52 (виправлення за результатами рев'ю); git status — чисто
https://words-tolearn.vercel.app/ -> HTTP 200
```
