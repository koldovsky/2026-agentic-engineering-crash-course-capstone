# Capstone — Oleksandr Prokopenko

**Проєкт:** сайт-портфоліо для фотографа: публічні сторінки (огляд, сесії, «Про мене», замовлення зйомки), адмінка (сесії з завантаженням фото, порядок, публікація, заявки, переклад тексту через ШІ), сповіщення в Telegram, нічні резервні копії в Cloudflare R2. Next.js 16 + Spring Boot 4.1 (Java 25) + Postgres 18 + Caddy, Docker Compose на VPS, деплой через GitHub Actions.

Код продукту лишився в приватному репозиторії (там дані реальної людини). Тут лежить знеособлена частина, яка показує **як** проєкт будувався: каркас агентів і сирі докази з репозиторію. Ім'я фотографа, домен, адресу сервера й шляхи на моєму комп'ютері замінено.

## Що тут лежить

| Шлях | Що це |
|---|---|
| [`AGENTS.md`](./AGENTS.md), [`CLAUDE.md`](./CLAUDE.md) | Правила для агентів (статичний контекст) |
| [`.claude/agents/`](./.claude/agents/) | 12 субагентів: ті, що будують, і окремі ті, що перевіряють |
| [`.claude/workflows/`](./.claude/workflows/) | Багатоагентні сценарії: review-gate, eval-suite, vision-verify, spec-pipeline, trajectory-eval, uat-triage |
| [`.claude/skills/project-factory/`](./.claude/skills/project-factory/) | Project Factory: фази 0–8, ворота G0–G8 |
| [`.claude/settings.json`](./.claude/settings.json) | Хук після кожного редагування і заборони для агентів |
| [`scripts/`](./scripts/), [`.githooks/`](./.githooks/) | Детермінований цикл: перевірки `check-*.mjs`, хуки комітів і пушу, ворота `gate-status.mjs` |
| [`evidence/`](./evidence/) | Сирі виводи з репозиторію проєкту (знеособлені) |

## Практики і докази

**Контекст-інженерія.** [`AGENTS.md`](./AGENTS.md) — правила модулів, правила коректності, вивчені з помилок «уроки» (наприклад, «PASS на порожніх доказах — це NOT-EARNED»), розділ «Lean mode», який я дописав, коли перевірок стало забагато. Динамічний контекст: хук [`scripts/hooks-post-edit.mjs`](./scripts/hooks-post-edit.mjs) після кожного редагування і `docs/current-state.md` як передача між сесіями. Правило, що спрацювало: агент спробував змінити запечатаний `deploy.yml`, і pre-push відмовив («gate-bearing file drift … with NO commit … Refs: PD-n») — довелося оформити зміну як пропозицію PD-47 на моє схвалення ([`evidence/commit-log-excerpt.txt`](./evidence/commit-log-excerpt.txt)).

**Цикли.** [`.githooks/`](./.githooks/) + [`scripts/hooks-pre-push.mjs`](./scripts/hooks-pre-push.mjs) запускають перевірки на кожному коміті й пуші; [`scripts/hooks-battery-stamp.mjs`](./scripts/hooks-battery-stamp.mjs) не пускає деплой без свіжого прогону; [`scripts/gate-status.mjs`](./scripts/gate-status.mjs) рахує ворота. Агенти ганялися до зеленого через цикл «знахідки рев'ю → агент-виправник → повторна перевірка». Фінальний прогін воріт: [`evidence/gate-status-final.txt`](./evidence/gate-status-final.txt) (G0–G8 PASS).

**Верифікація.** Тест спочатку червоний, потім зелений: [`evidence/red-before-fix.txt`](./evidence/red-before-fix.txt) → [`evidence/green-after-fix.txt`](./evidence/green-after-fix.txt) (виправлення рев'ю для резервних копій: 18 нових тестів падали, потім 455 з 455 зелені). Повний прогін: [`evidence/final-test-run.md`](./evidence/final-test-run.md) — frontend 990, backend unit 1003, БД 554, e2e 954 у трьох браузерах. Evals (рубрика 0–100, окремий суддя): [`evidence/eval-results.json`](./evidence/eval-results.json) — 50 кейсів якості текстів помилок і перекладу.

**maker ≠ checker.** Будували `capability-implementer` / `test-engineer`, перевіряли окремі `code-reviewer`, `security-reviewer`, `eval-judge`, `vision-judge` ([`.claude/agents/`](./.claude/agents/)). Приклад знахідок: [`evidence/review-findings-session-admin.json`](./evidence/review-findings-session-admin.json) — 4 major (зокрема «деплой поклав би сайт: бекенд не стартує без теки drafts») і 10 minor, усі виправлені. Візуальний суддя дивився на знімки екранів і відхиляв їх: [`evidence/vision-verdicts.md`](./evidence/vision-verdicts.md).

**Специфікації наперед (SDD).** Кожна частина продукту — зміна OpenSpec (proposal, design, tasks, spec) перед кодом. Приклад специфікації: [`evidence/spec-example-booking-requests.md`](./evidence/spec-example-booking-requests.md). Порядок комітів однієї частини (спека → тести → код → рев'ю → архів): [`evidence/commit-order-backups-slice.txt`](./evidence/commit-order-backups-slice.txt).

**Project Factory.** Запускав `/project-factory:init`, далі вів проєкт фазами 0–8 через ворота. Що я змінив руками: «Lean mode» в `AGENTS.md`; час CI скоротив з 19 хв до ~1 хв (важкі тести — локально); перевірку перед деплоєм з 43 хв до одного швидкого тесту. Звіт приймання: [`evidence/acceptance-report.md`](./evidence/acceptance-report.md).

## Що вирішував я, а що агент

Агент: писав специфікації, тести, код, рев'ю, деплоїв, ганяв перевірки, будував паралельно кілька частин у git worktree.

Я:
- обирав стек, сервер, сторонні сервіси; давав доступи й ключі;
- відкидав надмірні перевірки (CI 19 хв і 43-хвилинна перевірка перед деплоєм — «unacceptable»), увів «легкий режим»;
- приймав рішення по дизайну після перегляду живого сайту: більші фото в переглядачі, макет огляду як у сесій, вирівнювання кутів фото, адмінка відкривається одразу на списку сесій, коротший текст видалення;
- підписував вимоги і план (G1, G3), схвалював зміни запечатаних перевірок (PD-31, PD-47, PD-48, PD-49), погоджував відмови від вимог (waivers) — наприклад, швидкість завантаження на телефоні 2.6–3.1 с замість 2.5 с.

Де агент помилявся, а я або перевірка це ловили:
- агент сказав, що R2 нічого не видаляє сам, а в налаштуваннях бакета було правило «видаляти все через 30 днів», яке він же раніше порадив. Я це помітив — записано як корекція: [`evidence/correction-COR-1.json`](./evidence/correction-COR-1.json);
- новий крок деплою «з'їв» решту скрипта через stdin, і нові образи не стартували — це спіймала перевірка після деплою, сайт лишився на старій версії;
- репетиція відновлення з бекапу не могла стартувати так, як була описана — виявилось лише на реальному прогоні;
- злиття двох гілок загубило дужку в CSS, і стилі адмінки перестали діяти — знайшов рев'юер;
- мої власні заміри швидкості на живому сайті засипали чат помилок хибними сповіщеннями — я спитав, агент знайшов причину і виправив фільтр;
- агент намагався видалити тестові дані з живої бази — система дозволів заблокувала, я видалив сам.

## Перевірка

```
node scripts/gate-status.mjs
```

Вивід фінального прогону — [`evidence/gate-status-final.txt`](./evidence/gate-status-final.txt). Скрипти тут для показу; запускаються вони в повному репозиторії проєкту, де є код і тести.
