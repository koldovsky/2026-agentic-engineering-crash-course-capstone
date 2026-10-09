<!-- Pull Request description, written to the course template (.github/PULL_REQUEST_TEMPLATE.md).
     Paste everything below this comment into the PR. -->

## Ім'я

Ivan Mykhalevych (Іван Михалевич)

## Проєкт

**Java Interview Prep** — тренажер для підготовки до співбесід із Java: три рівні (junior, middle, senior), 120 запитань із поясненнями, тест із 12 випадкових запитань, розбір помилок і панель прогресу, українською та англійською. Можна вправлятися як гість (дані в браузері) або з акаунтом (прогрес на сервері).

**Де код:** гілка `ivan-mykhalevych` цього форку, тека [`submissions/ivan-mykhalevych/`](https://github.com/Mychalevytsh/2026-agentic-engineering-crash-course-capstone/tree/ivan-mykhalevych/submissions/ivan-mykhalevych)

## Відео-демо (1–2 хв)

**Посилання:** https://youtu.be/N_428fi8u04

## Застосовані практики Agentic Engineering

Хеші комітів нижче — з повної історії, збереженої в тезі `full-history` (усі червоні й зелені кроки); сама гілка зібрана у фазові коміти з тим самим вмістом. Коміт відкривається за адресою `https://github.com/Mychalevytsh/2026-agentic-engineering-crash-course-capstone/commit/<хеш>`.

- [x] **Контекст-інженерія** (правила / `AGENTS.md`, статичний vs динамічний контекст) — доказ: [`AGENTS.md`](https://github.com/Mychalevytsh/2026-agentic-engineering-crash-course-capstone/blob/ivan-mykhalevych/submissions/ivan-mykhalevych/AGENTS.md) з головним правилом KISS (`b9f8acd`) і правилом читати довгий Definition of Done лише на вимогу, щоб не роздувати статичний контекст (`804315f`). Динамічний контекст — скіли, що підвантажуються лише для відповідної роботи: `vercel-react-best-practices` (`7006599`) і власний `self-documenting-code` (`8bcb154`), після якого агент переписав код без коментарів (`40d0ef5`). Детермінований запобіжник — хук `.githooks/pre-commit` (`024c65f`) запускає `npm run check`; коміт із навмисно зламаним тестом було заблоковано (вивід у [`docs/capstone-dod.md`](https://github.com/Mychalevytsh/2026-agentic-engineering-crash-course-capstone/blob/ivan-mykhalevych/submissions/ivan-mykhalevych/docs/capstone-dod.md)).
- [x] **Цикли (loop engineering)** замість покрокового промптингу — доказ: скрипт циклу [`scripts/review-loop.sh`](https://github.com/Mychalevytsh/2026-agentic-engineering-crash-course-capstone/blob/ivan-mykhalevych/submissions/ivan-mykhalevych/scripts/review-loop.sh) (`npm run loop -- <шляхи>`): гейт `npm run check` → рев'юер лише з правом читання → окремий агент-виправник, доки гейт зелений і немає знахідок high/medium, не більше 3 проходів. Лог прогону: [`docs/loop-log.md`](https://github.com/Mychalevytsh/2026-agentic-engineering-crash-course-capstone/blob/ivan-mykhalevych/submissions/ivan-mykhalevych/docs/loop-log.md) — на `src/server` ітерація 1 знайшла баг R26 (413 замість 404/405), виправник додав тест і виправлення, ітерація 2 — PASS, 296/296, цикл зупинився «converged after 1 fix pass» (`db4cb3f`). Раніше — ручне коло `bc0c207` і знахідка → тест, що падає → виправлення (`5150634` → `a902b4b`, `049bd39` → `48d6a42`).
- [x] **Верифікація** (тести / evals / перевірки) — доказ: кожен зріз — спершу червоний коміт із тестом, що падає, потім реалізація: стан тесту `d5be5f3` → `9ecbb1d`, розбір помилок і перемішування `d27d97d` → `361332d`, пул із 120 запитань `ec8a03b` → `ad68e10`, сесії `c86ab08` → `f85697a`, HTTP API `623e1be` → `622e388`. Статистичні тести банку запитань не дають вгадати правильну відповідь за довжиною чи позицією. Підсумок — 294 тести в 29 файлах (вивід нижче), `next build` проходить.
- [x] **maker ≠ checker** (окремий агент або прохід на рев'ю) — доказ: субагент-рев'юер лише з правом читання [`.claude/agents/reviewer.md`](https://github.com/Mychalevytsh/2026-agentic-engineering-crash-course-capstone/blob/ivan-mykhalevych/submissions/ivan-mykhalevych/.claude/agents/reviewer.md) (`b47bbf8`), його знахідки виправлені в `bc0c207`. Незалежні QA-агенти тестували застосунок як чорну скриньку в браузері ([`docs/qa-plan.md`](https://github.com/Mychalevytsh/2026-agentic-engineering-crash-course-capstone/blob/ivan-mykhalevych/submissions/ivan-mykhalevych/docs/qa-plan.md)): перший прогін 10/10 і дві дрібні знахідки, виправлені в `19945a7`. Окремі агенти перевірили безпеку акаунтів (без критичних знахідок), факти в 120 запитаннях (`b72e0b8`) і українську мову (`e264fca`).
- [x] **Специфікації наперед (SDD)** — доказ: [`docs/spec.md`](https://github.com/Mychalevytsh/2026-agentic-engineering-crash-course-capstone/blob/ivan-mykhalevych/submissions/ivan-mykhalevych/docs/spec.md) — вимоги R1–R28 писалися до коду, кожна зміна має запис у журналі змін (наприклад, v0.15 — пул запитань, v0.18 — акаунти) і червоний тест перед кодом. План [`docs/plan-gap-fixes.md`](https://github.com/Mychalevytsh/2026-agentic-engineering-crash-course-capstone/blob/ivan-mykhalevych/submissions/ivan-mykhalevych/docs/plan-gap-fixes.md): спершу спек v0.23 (`3dfb2ed`), потім `49369f4` → `8de089d`. Наприкінці спек переписано з коду (v1.0), і тепер він — єдине джерело правди: спочатку спек, потім тест, потім код. OpenSpec свідомо не використовувався: для маленького проєкту вистачило markdown (KISS).
- [ ] **Журнал рівнів довіри** — не використовувався.
- [ ] **Project Factory** — не використовувався (KISS, проєкт малий).
- [x] Інше: **Definition of Done з доказами** — доказ: [`docs/capstone-dod.md`](https://github.com/Mychalevytsh/2026-agentic-engineering-crash-course-capstone/blob/ivan-mykhalevych/submissions/ivan-mykhalevych/docs/capstone-dod.md) — кожен пункт позначено лише з комітом або виводом команди.
- [x] Інше: **зворотна звірка спеку з кодом** — доказ: опис, складений лише з коду, порівняли зі спеком; п'ять неописаних поведінок записали в спек (v0.21), а варті виправлення закрили за планом (v0.22–v0.23). Фінальний спек v1.0 звірено з кодом скриптом (константи, API, ключі сховища, команди).

## Інструменти та MCP

- **Claude Code** (десктопний застосунок), моделі Claude Sonnet 5.5 (більша частина роботи) і Opus 5.5 (наприкінці).
- **MCP:** лише вбудовані інструменти застосунку — браузерна панель для перевірки застосунку і QA. Спроба через розширення Chrome не вдалася (Chrome не був підключений), зовнішніх MCP-серверів не було.
- **Skills:** `vercel-react-best-practices` (зі skills.sh) і власний `self-documenting-code`.
- **Hooks:** git pre-commit, що запускає `npm run check` (лінтер, типи, тести).
- **Субагенти:** рев'юер лише з правом читання, QA-агенти в браузері, перевірка безпеки акаунтів, фактчек запитань, вичитка української.
- **Стек:** Next.js 16, React 19, TypeScript strict, Tailwind 4, Vitest; сервер на вбудованих `node:sqlite` і `node:crypto`, без нових залежностей.

## Що вирішував(ла) я, а що агент

**Вирішував я:**
- Ідею (змінив її на самому початку) й обсяг: тренажер, а не симулятор; три рівні; KISS як головне правило; код без коментарів.
- Помітив, що правильна відповідь часто найдовша, і попросив переписати відповіді — звідси статистичні тести «без підказки».
- Попросив українську мову; обрав справжні акаунти з бекендом в окремій гілці й вирішив її злити.
- Скільки процесу: мало субагентів і увага до витрат токенів; незалежний QA у справжньому браузері; задокументований виняток `RED_COMMIT=1` замість обходу хука.
- Правило джерела правди: спершу документацію переписали з коду, далі спек — єдине джерело правди.
- Головна сторінка має вміщатися на екрані ноутбука 15,6" без прокрутки; випадні меню мають бути читабельними.
- Зібрати історію у фази й зберегти повну червоно-зелену історію в тезі `full-history`; не пушити й не відкривати PR без мого слова.

**Робив агент:** писав спек, тести й код; 120 запитань, пояснення й переклади; запускав перевірки та прогони в браузері; створив хук, рев'юера, скіл і виправлення.

**Де я втручався і що пішло не так:**
- Агент один раз обійшов хук через `--no-verify` без дозволу (`c55fbca`). Я це зупинив: з'явився задокументований виняток `RED_COMMIT=1` (`11d2f3e`) і заборона `--no-verify` в `AGENTS.md`.
- Перша переробка відповідей перестаралася: правильна відповідь майже ніколи не була найдовшою — протилежна підказка. Тому в тестах є і верхні, і нижні межі.
- Рев'юер і QA знайшли те, що я пропустив: двозначні варіанти, втрату фокусу клавіатури, переповнення шапки з довгим ім'ям. Слабкий контраст кнопок у світлій темі знайшла окрема перевірка контрасту. Перевірка безпеки знайшла читання тіла запиту без обмеження і відсутню обробку помилок сервера. Усе виправлено через тести, що падають.
- `npm install` упав на конфлікті залежностей (`@types/node` 20 і Vitest 5) — перейшли на `@types/node` 24.
- Головна сторінка потребувала прокрутки на ноутбуці — переробили після мого зауваження.
- Не перевірено: зчитувачі екрана та браузери, крім Chromium. Український текст вичитував інший агент, а не професійний редактор.

## Перевірка

```
$ cd submissions/ivan-mykhalevych && npm run check
 Test Files  29 passed (29)
      Tests  294 passed (294)
```

Запуск: `npm install && npm run dev`, далі відкрити http://localhost:3000.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
