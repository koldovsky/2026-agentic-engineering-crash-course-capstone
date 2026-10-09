## Ім'я

Dmitriy Remarenko

## Проєкт

«Фруктовий сад» — браузерна merge-гра: скидання мишею/дотиком, фізичні зіткнення, 30 фруктів каталогу, очки, пауза, нова гра та локальний рекорд. Без сервера й акаунтів.

**[Грати онлайн](https://dmitryyr.github.io/fruit-merge-capstone/)** · [Порівняти 30 розмірів](https://dmitryyr.github.io/fruit-merge-capstone/?view=sizes).

**Де код:** [окремий репозиторій гри](https://github.com/DmitryyR/fruit-merge-capstone/tree/49bf24572f639c7b4ee20c6223844fb6cc0ca4af). Цей навчальний PR змінює тільки `submissions/dmitry-fruit-merge/README.md`; кореневі файли курсу не змінені.

## Відео-демо (1–2 хв)

**Посилання: [дивитися фінальне відео](https://dmitryyr.github.io/fruit-merge-capstone/capstone.html).**

113.633с, 1920×1080, H.264/AAC, 30fps; український чоловічий синтезований голос Microsoft Ostap та субтитри. [MP4, MP3, SRT — публічні файли](https://github.com/DmitryyR/fruit-merge-capstone/releases/tag/capstone-video-v1).

38.733с фактичного браузерного запису: справжні mouse input→collision→merge→score10, пауза/продовження, перезапуск зі збереженням фактичного рекорду. Початкові високі фрукти підготовлені й явно позначені «Тестовий сценарій». Далі — конкретні правила, код, історичний red/fix/green, свіжий check і незалежне review. [Сценарій і джерела](https://github.com/DmitryyR/fruit-merge-capstone/blob/49bf24572f639c7b4ee20c6223844fb6cc0ca4af/docs/submission/video-script.md), [технічна перевірка відео](https://github.com/DmitryyR/fruit-merge-capstone/blob/49bf24572f639c7b4ee20c6223844fb6cc0ca4af/docs/submission/final-check.md).

## Застосовані практики Agentic Engineering

- [x] **Контекст-інженерія** — [AGENTS.md](https://github.com/DmitryyR/fruit-merge-capstone/blob/49bf24572f639c7b4ee20c6223844fb6cc0ca4af/AGENTS.md) вимагає резервувати обидва ID до зміни світу; [координатор](https://github.com/DmitryyR/fruit-merge-capstone/blob/49bf24572f639c7b4ee20c6223844fb6cc0ca4af/src/game/services/merge-coordinator.ts) це робить, [duplicate/reversed/shared regression](https://github.com/DmitryyR/fruit-merge-capstone/blob/49bf24572f639c7b4ee20c6223844fb6cc0ca4af/tests/integration/merge-coordinator.test.ts) перевіряє відсутність повторних очок. Статичні вимоги відокремлено від динамічних SHA/diff/log.
- [x] **Цикли (loop engineering)** — [фактичний журнал раундів](https://github.com/DmitryyR/fruit-merge-capstone/blob/49bf24572f639c7b4ee20c6223844fb6cc0ca4af/docs/evidence/runs/agent-loop.md): помилка→аналіз→виправлення→повтор, умови зупинки й ревізії. Це історичний виконаний цикл; поточний check одразу green і не видається за новий цикл виправлення.
- [x] **Верифікація** — [свіжий повний check](https://github.com/DmitryyR/fruit-merge-capstone/blob/49bf24572f639c7b4ee20c6223844fb6cc0ca4af/docs/evidence/runs/capstone-final-check.log), [дата/exit/SHA/diff](https://github.com/DmitryyR/fruit-merge-capstone/blob/49bf24572f639c7b4ee20c6223844fb6cc0ca4af/docs/evidence/runs/capstone-final-check.json); 116 тестів. Історичний regression [red](https://github.com/DmitryyR/fruit-merge-capstone/blob/49bf24572f639c7b4ee20c6223844fb6cc0ca4af/docs/evidence/runs/review-physics-red.log)→[fix e77427a](https://github.com/DmitryyR/fruit-merge-capstone/commit/e77427a)→[green](https://github.com/DmitryyR/fruit-merge-capstone/blob/49bf24572f639c7b4ee20c6223844fb6cc0ca4af/docs/evidence/runs/final-check.log).
- [x] **maker ≠ checker** — [новий окремий reviewer](https://github.com/DmitryyR/fruit-merge-capstone/blob/49bf24572f639c7b4ee20c6223844fb6cc0ca4af/docs/reviews/capstone-review.md): read-only аналіз і власні браузерні сценарії, нових findings немає. [Попередній checker](https://github.com/DmitryyR/fruit-merge-capstone/blob/49bf24572f639c7b4ee20c6223844fb6cc0ca4af/docs/reviews/cbcfa7f.md) знайшов P1 колайдера, що підтверджено regression-тестом і виправлено.
- [x] **Специфікації наперед (SDD)** — [docs-only c941d33](https://github.com/DmitryyR/fruit-merge-capstone/commit/c941d33) перед першим кодом; [вимоги](https://github.com/DmitryyR/fruit-merge-capstone/blob/49bf24572f639c7b4ee20c6223844fb6cc0ca4af/docs/requirements.md), [специфікація нових розмірів](https://github.com/DmitryyR/fruit-merge-capstone/blob/49bf24572f639c7b4ee20c6223844fb6cc0ca4af/docs/fruit-size-plan.md). Це перевірена історія, а не документація заднім числом.
- [ ] **Журнал рівнів довіри** — окремою практикою не заявляється.
- [ ] **Project Factory** — не використовувалася; для цього масштабу вистачило специфікацій, правил і перевірок.
- [ ] Інше — не заявляється.

[Повна матриця доказів](https://github.com/DmitryyR/fruit-merge-capstone/blob/49bf24572f639c7b4ee20c6223844fb6cc0ca4af/docs/evidence/index.md).

## Інструменти та MCP

Codex desktop, GitHub connector для читання умов, GitHub CLI для repo/fork/PR/release, PowerShell, Node/npm, TypeScript, Vite, Phaser/Matter, Vitest, Playwright. Imagegen створив графіку; оптимізація WebP виконана за прямим дозволом користувача. Для відео — Python, edge-tts, truststore, FFmpeg; TTS із перевіркою TLS. Окремі reviewer-субагенти.

Застосовані в роботі skills: brainstorming, writing-plans, executing-plans, test-driven-development, frontend-design, systematic-debugging, requesting-code-review, verification-before-completion, imagegen. [Відтворення запису/монтажу](https://github.com/DmitryyR/fruit-merge-capstone/blob/49bf24572f639c7b4ee20c6223844fb6cc0ca4af/docs/submission/video-build.md).

## Що вирішував(ла) я, а що агент

Учасник обрав фруктову гру й 30 фруктів, вимагав план до коду, погодив продовження, надав референси. Конкретні втручання: залишити поточну посудину; дозволити оптимізацію графіки; замінити попередній ріст розмірів на задану геометричну формулу; підготувати українське чоловіче відео й делегувати незалежне рев’ю.

Агент підготував вимоги, код, ресурси, тести, публікацію й відео. Робота не пройшла без проблем: після незалежного review тест підтвердив зменшення колайдера; змінено порядок scale/setCircle. Часову передумову cooldown-тесту виправлено з поясненням у журналі; SVG-генератор захищено від перезапису WebP; для нових розмірів виправлено layout regression. [Розміри до/після](https://github.com/DmitryyR/fruit-merge-capstone/blob/49bf24572f639c7b4ee20c6223844fb6cc0ca4af/docs/evidence/fruit-diameters.md), [журнал розмірів](https://github.com/DmitryyR/fruit-merge-capstone/blob/49bf24572f639c7b4ee20c6223844fb6cc0ca4af/docs/evidence/runs/sizes-work-log.md).

Під час відеопідготовки нових дефектів продукту не знайдено. Сценарій скорочено за фактичною довжиною голосу, запис перевіряє реальний рекорд, для AAC скориговано запас піка. Користувачу не приписується ручне тестування або приймання. [Підтверджені ролі](https://github.com/DmitryyR/fruit-merge-capstone/blob/49bf24572f639c7b4ee20c6223844fb6cc0ca4af/docs/submission/human-agent-roles.md).

## Перевірка

`npm ci` → `npx playwright install chromium` → `npm run check`.

Свіжий локальний прогін 04.10.2026: `ffa173db7db51a364c761de902b6bd7a6f758486`, чисте дерево, exit0. Після нього runtime/ресурси/тести не змінені; додано матеріали, програвач і пакування медіа у Pages.

```text
Unit: 76 passed
Integration: 7 passed
Browser: 33 passed (desktop + touch + production smoke)
CHECK PASSED — types, lint, unit, integration, both builds, browsers, production isolation.
```

Відео повністю декодується без помилок; вимір готового AAC -16.21LUFS/-1.92dBTP, 24 блоки субтитрів за фактичними WordBoundary. [Метадані й обмеження](https://github.com/DmitryyR/fruit-merge-capstone/blob/49bf24572f639c7b4ee20c6223844fb6cc0ca4af/docs/submission/final-check.md).

Не перевірені реальний телефон, Safari/Firefox, довгі партії до rank30 та повна доступність Canvas. Суб’єктивне прослуховування й остаточне приймання — за учасником. PR залишається draft для його перегляду; подання на платформі не виконане, бо адресу завдання не надано. [Залишкові кроки](https://github.com/DmitryyR/fruit-merge-capstone/blob/49bf24572f639c7b4ee20c6223844fb6cc0ca4af/docs/submission/remaining-steps.md).


Публікацію підтверджено: [повний Linux CI і deploy](https://github.com/DmitryyR/fruit-merge-capstone/actions/runs/37210015889), [анонімний playback/seek і SHA-256 файлів](https://github.com/DmitryyR/fruit-merge-capstone/blob/49bf24572f639c7b4ee20c6223844fb6cc0ca4af/docs/evidence/video/public-player.json). Відео відкривається без логіну.
