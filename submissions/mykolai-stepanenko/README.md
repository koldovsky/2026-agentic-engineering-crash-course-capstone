## Автор

Ім'я: Mykolai Stepanenko
Відео: https://youtu.be/Vf6wBwYW52o
Опис застосованих практик Agentic Engineering:
1. Контекст-інженерія
2. Цикли (loop engineering)
3. Верифікація
4. maker != checker
5. Специфікації наперед SDD

## Інструкція по запуску проекту

**Мають бути вільні порти**:
- 6379
- 5173
- 3306
- 8080

Проект можна відкрити за посиланням http://localhost:8080/

Для запуску проекту виконати команди:
```bash
docker compose up -d
docker exec -it mykolai-stepanenko-app-1 composer install
docker compose exec node npm install
docker compose exec node npm run build
```

## Журнал рівнів довіри
Можна знайти за посиланням [docs/autonomy-log.md](./docs/autonomy-log.md)

## Опис застосованих практик
### Контекст-інженерія

#### Статичний контекст - CLAUDE.md та AGENTS.md
Розробка велась за допомогою Claude Code, тому створений [CLAUDE.md](./CLAUDE.md). Але також створений універсальний [AGENTS.md](./AGENTS.md) і клод його імпортує.
В цьому файлі описано стек, інструкцію агенту як запустити проект та опис harness. Цей файл створився ще з самого початку, на етапі, 
коли агент створював проект (інстал фреймворку, докеризація etc). Це як початкова інструкція по надання контексту, яким має бути проект

#### Статичний контекст - rules
Я створив правило [./.claude/rules/services-layered-architecture.md](./.claude/rules/services-layered-architecture.md).
Це динамічне правило, яке спрацьовує коли агент редагує сервіси [./app/Services](./app/Services). Описує правила архітектури та проектування коду - має бути багатошарова архітектура.
На основі цього агент згенерував правильний код, який можна побачити в коміті `f2d119f7`. Можна побачити виклики правила в [./.agent-log/actions.jsonl](./.agent-log/actions.jsonl) в ts `2026-09-27T18:42:40.915Z`

#### Динамічний контекст - skills
Я створив власний скіл [./.claude/skills/git-commit/SKILL.md](./.claude/skills/git-commit/SKILL.md) та підключив пул скілів від Laravel Boost.
Мій власний скіл використовується вручну та субагентом. Він дивиться поточні зміни в git та генерує назву коміту.

#### Динамічний контекст - hooks
Мій власний хук `PostToolUse` та `Stop`, який запускає команду phpstan - статичний аналіз коду PHP та його адаптація під Laravel - Larastan.
Докази викликів можна побачити в [./.agent-log/actions.jsonl](./.agent-log/actions.jsonl), де ts `2026-09-30T18:57:58Z` (PostToolUse) та `2026-09-30T18:58:07Z` (Stop)

Також в мене є хук, який запускає тести PHPUnit [./.claude/hooks/tests.sh](./.claude/hooks/tests.sh).
Подивитись його виклики можна в `2026-09-29T20:41:04Z` -> `2026-09-29T20:41:29Z` -> `2026-09-29T20:41:34Z`

#### Динамічний контекст - MCP
Я встановив MCP від Laravel - Laravel Boost, який надає контекст застосунку https://laravel.com/framework/docs/boost

### Цикли loop engineering
Скрипт [./.claude/hooks/phpstan.sh](./.claude/hooks/phpstan.sh) запускає статичний аналізатор коду phpstan (в мене встановлена адаптація під laravel - larastan) та блокується через stop hook, поки перевірка не пройде успішно.
Докази - я особисто вручну зробив зміни в коді, які порушують правила phpstan в коміті `99556177`.
На наступному циклі агента він отримав помилку в ts `2026-09-27T21:00:01Z` та виправив її з першої спроби в ts `2026-09-27T21:00:16Z` (див. [./.agent-log/actions.jsonl](./.agent-log/actions.jsonl))

Також лише з 2 ітерації виправився код, щоб задовольнити тести PHPUnit, що можна побачити в ts `2026-09-29T20:41:04Z` -> `2026-09-29T20:41:29Z` -> `2026-09-29T20:41:34Z`

### Верифікація
Запускаю тести PHPUnit через хуки `PostToolUse` та `Stop` [./.claude/hooks/tests.sh](./.claude/hooks/tests.sh).
Доказ червоного тесту - ts `2026-09-29T20:41:29Z`. Доказ зеленого тесту `2026-09-29T20:41:34Z`

### Maker != Checker
Maker - головний агент, який працює за специфікаціями `open-spec`. Checker - субагент, який пише та запускає тести та працює за принципом TDD [./.claude/agents/laravel-tester.md](./.claude/agents/laravel-tester.md).
Доказ виклику цього субагента можна побачити в ts `2026-09-29T20:41:40.191Z` [./.agent-log/actions.jsonl](./.agent-log/actions.jsonl)

Субагенти [./.claude/agents/git-committer.md](./.claude/agents/git-committer.md) та [./.claude/agents/commit-verifier.md](./.claude/agents/commit-verifier.md) запускаються для генерації опису та створення коміту (maker).
Другий субагент (checker) перевіряє створення нового коміту за останні 10 хв та відсутність незакомічених змін в активній гілці git.

### Специфікації наперед (SDD)
Всього я створив 4 специфікацїі для написання бізнес логіки та побудови UI:ª
1. [./openspec/changes/add-btc-uah-price](./openspec/changes/add-btc-uah-price) (створення спеки - коміт `4e9b8df6`, реалізація - коміт `f2d119f7`)
2. [./openspec/changes/add-vue-frontend](./openspec/changes/add-vue-frontend) (створення спеки коміт `a140de32`, реалізація в тому ж коміті `a140de32`)
3. [./openspec/changes/add-theme-toggle](./openspec/changes/add-theme-toggle) (створення спеки коміт `89dda7f4`, реалізація в тому ж коміті `89dda7f4`)
4. [./openspec/changes/add-provider-selection](./openspec/changes/add-provider-selection) (створення спеки коміт `a56e6c1e`, реалізація в тому ж коміті `6f6db7b7`)
