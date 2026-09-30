# Commit log of the capstone branch

The repository is private, so this file has `git log --stat main..HEAD` in order, oldest first.
The commit hashes in the README refer to this file.

## 3a77f59 2026-09-29 chore(harness): вернуть .claude/ и .cursor/ в git, восстановить харнесс

```text
На main харнесс для Claude не работал: .claude/ и .cursor/ были в .gitignore,
.claude/rules/ пустая, скиллы пустые, settings.json отсутствовал.

- правила: 22 симлинка .claude/rules/*.md -> .cursor/rules/*.mdc (включая date-helper)
- скиллы и .cursor/{hooks,mcp}.json взяты из 789573c; хуки и правила на диске новее — оставлены дисковые
- хуки перенесены из settings.local.json в отслеживаемый settings.json (без дубля)
- .gitignore игнорирует только settings.local.json и .cursor/debug.log
- docs: план capstone, журнал автономности, baseline контекста

Проверка: npm run check exit 0; hooks:selftest 37/37.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 .claude/hooks/guard-secrets.mjs                    |  24 ++
 .claude/hooks/log-action.mjs                       |  41 +++
 .claude/rules/activity-calendar-conventions.md     |   1 +
 .claude/rules/admin-panel-create-admin-user.md     |   1 +
 .claude/rules/admin-panel-dedicated-admin-user.md  |   1 +
 .claude/rules/admin-panel-student-emails.md        |   1 +
 .claude/rules/admin-panel-tables.md                |   1 +
 .claude/rules/admin-panel-user-keys.md             |   1 +
 .claude/rules/api-test.md                          |   1 +
 .claude/rules/auth-and-sessions.md                 |   1 +
 .claude/rules/autotest-tags-and-allure.md          |   1 +
 .claude/rules/code-quality.md                      |   1 +
 .claude/rules/date-helper-seconds-to-ms.md         |   1 +
 .claude/rules/karpathy-guidelines.md               |   1 +
 .claude/rules/no-hardcoded-waits.md                |   1 +
 .claude/rules/page-object-size.md                  |   1 +
 .claude/rules/page-objects-conventions.md          |   1 +
 .claude/rules/playwright-specs-no-expect.md        |   1 +
 .claude/rules/pro-trading-autotests.md             |   1 +
 .claude/rules/pro-trading-subscriptions-api.md     |   1 +
 .claude/rules/project-base.md                      |   1 +
 .claude/rules/readability-for-everyone.md          |   1 +
 .claude/rules/test-naming-no-tc-ids.md             |   1 +
 .claude/rules/test-user-lifecycle.md               |   1 +
 .claude/settings.json                              |  71 +++++
 .claude/skills/agent-log-report/SKILL.md           |  56 ++++
 .claude/skills/agent-log-report/scripts/report.mjs | 123 ++++++++
 .claude/skills/api-test/SKILL.md                   | 177 +++++++++++
 .claude/skills/writing-autotests-from-tc/SKILL.md  | 341 +++++++++++++++++++++
 .cursor/hooks.json                                 |  17 +
 .cursor/hooks/guard-secrets.mjs                    |  30 ++
 .cursor/mcp.json                                   |  35 +++
 .cursor/rules/activity-calendar-conventions.mdc    |  65 ++++
 .cursor/rules/admin-panel-create-admin-user.mdc    |  30 ++
 .cursor/rules/admin-panel-dedicated-admin-user.mdc |  69 +++++
 .cursor/rules/admin-panel-student-emails.mdc       |  28 ++
 .cursor/rules/admin-panel-tables.mdc               | 101 ++++++
 .cursor/rules/admin-panel-user-keys.mdc            |  36 +++
 .cursor/rules/api-test.mdc                         |  44 +++
 .cursor/rules/auth-and-sessions.mdc                |  90 ++++++
 .cursor/rules/autotest-tags-and-allure.mdc         |  37 +++
 .cursor/rules/code-quality.mdc                     |  62 ++++
 .cursor/rules/date-helper-seconds-to-ms.mdc        |  26 ++
 .cursor/rules/karpathy-guidelines.mdc              |  75 +++++
 .cursor/rules/no-hardcoded-waits.mdc               |  80 +++++
 .cursor/rules/page-object-size.mdc                 |  55 ++++
 .cursor/rules/page-objects-conventions.mdc         |  58 ++++
 .cursor/rules/playwright-specs-no-expect.mdc       |  42 +++
 .cursor/rules/pro-trading-autotests.mdc            | 160 ++++++++++
 .cursor/rules/pro-trading-subscriptions-api.mdc    |  69 +++++
 .cursor/rules/project-base.mdc                     |  22 ++
 .cursor/rules/readability-for-everyone.mdc         |  37 +++
 .cursor/rules/test-naming-no-tc-ids.mdc            |  30 ++
 .cursor/rules/test-user-lifecycle.mdc              | 132 ++++++++
 .gitignore                                         |   6 +-
 AGENTS.md                                          |   3 +-
 docs/autonomy-log.md                               |  36 +++
 docs/capstone-plan.md                              | 149 +++++++++
 docs/context-log.md                                |  29 ++
 59 files changed, 2504 insertions(+), 4 deletions(-)
```

## c6cb469 2026-09-29 chore(harness): диета контекста — AGENTS.md как карта, правило → скилл, без Firecrawl

```text
- AGENTS.md 212 → 82 строки: команды, definition of done, границы, «куда смотреть»;
  устройство харнесса переехало в docs/harness.md
- karpathy-guidelines: always-правило → проектный скилл
- date-helper-seconds-to-ms: alwaysApply false, Cursor грузит его по **/*.ts
- Firecrawl убран из .mcp.json, .cursor/mcp.json и mcp:sync
- CLAUDE.md: # Compact instructions

Always-loaded: 14 751 → 6 811 байт; /context memory files 4.1k → 2.2k.
Firecrawl на машине автора остался: те же серверы есть в user-scope ~/.claude.json
(найдено замером /context, записано в docs/context-log.md).

Проверка: npm run check exit 0.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 .claude/rules/karpathy-guidelines.md               |   1 -
 .../skills/karpathy-guidelines/SKILL.md            |   3 +-
 .claude/skills/writing-autotests-from-tc/SKILL.md  |   2 +-
 .cursor/mcp.json                                   |   8 -
 .cursor/rules/date-helper-seconds-to-ms.mdc        |   2 +-
 .mcp.json                                          |   7 -
 AGENTS.md                                          | 201 ++++-----------------
 CLAUDE.md                                          |   6 +
 docs/autonomy-log.md                               |   6 +-
 docs/context-log.md                                |  19 +-
 docs/harness.md                                    | 149 +++++++++++++++
 scripts/harness/sync-mcp-env.mjs                   |   2 +-
 12 files changed, 218 insertions(+), 188 deletions(-)
```

## 1ecfe4a 2026-09-29 feat(skills): ui-autotest, api-test с lookup-скриптом, новый bug-report

```text
- writing-autotests-from-tc → ui-autotest; §12: check → зелёный прогон на stage →
  мутация (тест обязан упасть на своей проверке) → таблица «шаг TC → should*»
- api-test: шаг 1 — scripts/endpoint-lookup.mjs (exit 1, если эндпоинта нет в реестре);
  §9 — мутационный прогон; число эндпоинтов исправлено на 143
- bug-report: scripts/collect-evidence.mjs сжимает allure-results/ до последнего реального
  прогона каждого упавшего теста; триаж product / test / env / flake через --repeat-each=3;
  поиск дублей в Jira только на чтение; черновик по template.md в docs/bugs/

Первая версия collect-evidence давала 0 падений при 112 — skipped-результаты перекрывали
настоящие; исправлено до коммита. npm run check падал на двух regex в новых скриптах — исправлено.

Проверка: npm run check exit 0; hooks:selftest — all passed.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 .claude/skills/api-test/SKILL.md                   |  34 ++++--
 .../skills/api-test/scripts/endpoint-lookup.mjs    |  48 +++++++++
 .claude/skills/bug-report/SKILL.md                 |  76 +++++++++++++
 .../skills/bug-report/scripts/collect-evidence.mjs | 117 +++++++++++++++++++++
 .claude/skills/bug-report/template.md              |  40 +++++++
 .../SKILL.md                                       |  27 ++++-
 AGENTS.md                                          |   3 +-
 docs/autonomy-log.md                               |   5 +
 docs/harness.md                                    |  13 +--
 9 files changed, 346 insertions(+), 17 deletions(-)
```

## bd6147f 2026-09-29 spec(jenkins-verify): OpenSpec 1.13.2 и предложение add-jenkins-verify — до кода

```text
- @fission-ai/openspec 1.13.2 (--save-exact), openspec init --tools none:
  без сгенерированных скиллов, чтобы не раздувать контекст
- proposal, spec (5 требований, 13 сценариев WHEN/THEN), design, tasks
- ключевые сценарии: 0 выполненных тестов → NOT-EARNED, а не PASS;
  падение из known-failures не красит сборку; токен в тексте ошибки редактируется

Проверка: openspec validate add-jenkins-verify --strict → valid. Кода ещё нет.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 openspec/changes/add-jenkins-verify/.openspec.yaml |   2 +
 openspec/changes/add-jenkins-verify/design.md      |  42 +
 openspec/changes/add-jenkins-verify/proposal.md    |  38 +
 .../specs/jenkins-verify/spec.md                   | 102 +++
 openspec/changes/add-jenkins-verify/tasks.md       |  20 +
 openspec/changes/archive/.gitkeep                  |   0
 openspec/config.yaml                               |  32 +
 openspec/specs/.gitkeep                            |   0
 package-lock.json                                  | 987 ++++++++++++++++++++-
 package.json                                       |   1 +
 10 files changed, 1220 insertions(+), 4 deletions(-)
```

## 9c4cc05 2026-09-29 test(jenkins-verify): 13 тестов по сценариям спеки — красные

```text
Фикстуры в scripts/ci/fixtures/ придуманы вручную (demo-tests, jenkins.example.test),
реальных данных нет. harness:test добавлен в npm run check.

Красный прогон: npm run harness:test → exit 1,
ERR_MODULE_NOT_FOUND scripts/ci/jenkins-report.mjs — реализации ещё нет.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 openspec/changes/add-jenkins-verify/tasks.md |   6 +-
 package.json                                 |   5 +-
 scripts/ci/fixtures/aborted.json             |  11 +
 scripts/ci/fixtures/bearer-in-error.json     |  43 ++
 scripts/ci/fixtures/fixed-and-stale.json     |  77 ++++
 scripts/ci/fixtures/green.json               | 637 +++++++++++++++++++++++++++
 scripts/ci/fixtures/known-failures.json      |  20 +
 scripts/ci/fixtures/known-only.json          | 534 ++++++++++++++++++++++
 scripts/ci/fixtures/many-failures.json       | 287 ++++++++++++
 scripts/ci/fixtures/new-among-known.json     | 290 ++++++++++++
 scripts/ci/fixtures/no-report.json           |  11 +
 scripts/ci/fixtures/running.json             |  11 +
 scripts/ci/fixtures/zero-executed.json       | 247 +++++++++++
 scripts/ci/jenkins-report.test.mjs           | 120 +++++
 14 files changed, 2294 insertions(+), 5 deletions(-)
```

## c9fe9a2 2026-09-29 feat(jenkins-verify): реализация по спеке — 13/13 зелёные, скилл, spec:check в check

```text
- scripts/ci/jenkins-report.mjs: чистое verdict() + форматтер (редакция Bearer, 15 строк)
  + CLI: <job> [n|last] или --from <файл>; exit 0 PASS / 1 FAIL / 2 NOT-EARNED / 3 доступ
- ci/known-failures.json — пустой ratchet; добавлять записи решает человек
- .claude/skills/jenkins-verify/SKILL.md: что делать с каждым вердиктом; новое падение → bug-report
- npm run check: + spec:check (openspec validate --all --strict) и harness:test

Мутация «0 выполненных тестов → PASS» поймана двумя тестами, откат → 13/13.
Реальность против design.md: переменные JENKINS_* нашлись только с config/.env; живой прогон
упал на UND_ERR_CONNECT_TIMEOUT — Jenkins недоступен из сети агента. Задачи 3.2–3.3 открыты.

Проверка: npm run check exit 0 (spec:check 1/1, harness:test 13/13); hooks:selftest all passed.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 .claude/skills/jenkins-verify/SKILL.md        |  54 +++++++++
 AGENTS.md                                     |   2 +
 ci/known-failures.json                        |   1 +
 docs/autonomy-log.md                          |   1 +
 docs/harness.md                               |   3 +-
 openspec/changes/add-jenkins-verify/design.md |   6 +
 openspec/changes/add-jenkins-verify/tasks.md  |  10 +-
 package.json                                  |   5 +-
 scripts/ci/jenkins-report.mjs                 | 153 ++++++++++++++++++++++++++
 9 files changed, 227 insertions(+), 8 deletions(-)
```

## c399103 2026-09-29 chore: убрать FIRECRAWL_API_KEY из шаблона

```text
.env.example | 5 -----
 1 file changed, 5 deletions(-)
```

## d37ad84 2026-09-29 spec(jenkins-verify): источник данных — Allure-плагин, а не JUnit; broken = failure

```text
Первый живой прогон (VPN): все три джоба → NOT-EARNED «no test report».
Причина: /testReport → 404, джобы публикуют только Allure (/allure/data/suites.json).
Вердикт был верным по спеке (зелёный stage-api-tests #117 не назван PASS), но бесполезным.

- spec: новый сценарий «broken считается как failed»
- design: раздел Data source (suites.json + test-cases/<uid>.json для печатаемых падений),
  идентичность теста = путь spec › название, маппинг статусов Allure
- tasks: группа 4 — фикстура Allure, красные тесты конвертации, реализация

Кода в этом коммите нет.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 docs/autonomy-log.md                               |  2 ++
 openspec/changes/add-jenkins-verify/design.md      | 31 +++++++++++++++-------
 .../specs/jenkins-verify/spec.md                   |  5 ++++
 openspec/changes/add-jenkins-verify/tasks.md       |  6 +++++
 4 files changed, 35 insertions(+), 9 deletions(-)
```

## ba2cc0c 2026-09-29 test(jenkins-verify): конвертация Allure suites.json — 3 новых теста, красные

```text
Фикстура allure-suites.json повторяет форму data/suites.json плагина (придумана вручную):
проекты chromium/api, spec, вложенные describe, статусы passed/failed/broken/skipped/unknown.

harness:test → 13 pass, 3 fail (fromAllure ещё не существует).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 openspec/changes/add-jenkins-verify/tasks.md |   4 +-
 scripts/ci/fixtures/allure-build.json        | 124 +++++++++++++++++++++++++++
 scripts/ci/fixtures/allure-suites.json       | 114 ++++++++++++++++++++++++
 scripts/ci/jenkins-report.test.mjs           |  33 +++++++
 4 files changed, 273 insertions(+), 2 deletions(-)
```

## 77711a0 2026-09-29 feat(jenkins-verify): Allure-плагин как источник — живые вердикты по трём джобам

```text
- fromAllure(): data/suites.json → нейтральная форма отчёта; broken = FAILED, unknown = SKIPPED
- живой режим читает /allure/data/suites.json; текст ошибки — из test-cases/<uid>.json,
  только для печатаемых новых падений (не больше 15 запросов)
- офлайн-файл принимает { build, allure } наравне с { build, report }

Живой прогон (openspec/changes/add-jenkins-verify/live-run.md, обезличен):
  stage-api-tests #117             PASS  — executed 22, failed 0
  lms-stage-regression-tests #415  FAIL  — 5 new из 392
  admin-stage-regression-tests #181 FAIL — 2 new из 62 (+19 skipped; совпадает со сводкой Allure)
До перехода на Allure те же сборки давали NOT-EARNED.

Проверка: npm run check exit 0 (harness:test 16/16, spec:check 1/1).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 openspec/changes/add-jenkins-verify/live-run.md | 51 +++++++++++++++++++++++++
 openspec/changes/add-jenkins-verify/tasks.md    |  4 +-
 scripts/ci/jenkins-report.mjs                   | 37 ++++++++++++++++--
 3 files changed, 86 insertions(+), 6 deletions(-)
```

## 23eaed2 2026-09-29 chore(openspec): архив add-jenkins-verify → openspec/specs/jenkins-verify

```text
openspec archive: 5 требований перенесены в основную спеку; tasks 1–4 закрыты.
Пути к спеке в jenkins-report.mjs и тестах обновлены.

Проверка: npm run check exit 0 (spec:check — spec/jenkins-verify, harness:test 16/16).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 docs/autonomy-log.md                               |   2 +-
 .../2026-09-29-add-jenkins-verify}/.openspec.yaml  |   0
 .../2026-09-29-add-jenkins-verify}/design.md       |   0
 .../2026-09-29-add-jenkins-verify}/live-run.md     |   0
 .../2026-09-29-add-jenkins-verify}/proposal.md     |   0
 .../specs/jenkins-verify/spec.md                   |   0
 .../2026-09-29-add-jenkins-verify}/tasks.md        |   2 +-
 openspec/specs/jenkins-verify/spec.md              | 106 +++++++++++++++++++++
 scripts/ci/jenkins-report.mjs                      |   2 +-
 scripts/ci/jenkins-report.test.mjs                 |   2 +-
 10 files changed, 110 insertions(+), 4 deletions(-)
```

## bded737 2026-09-29 feat(agents): spec-reviewer (maker ≠ checker) + контроль с подложенными дефектами

```text
- .claude/agents/spec-reviewer.md: только чтение, модель sonnet; сначала ожидания по TC,
  потом код; матрица «шаг → assertion file:line», нарушения правил, ACCEPT/CHANGES/REJECT;
  запрет открывать файлы с учётками
- ui-autotest §12.5: перед «готово» — ревью spec-reviewer
- ui-autotest §5: caseId в ссылке AIO — внутренний id, не номер ключа (caseId=130 → PRJ-TC-84,
  PRJ-TC-130 — чужой кейс); ключ — от человека, по названию или со скриншота в Chrome;
  требования — через requirements → Jira story

Доказательства в docs/reviews/:
- контроль: копия спеки с 4 дефектами (TC id в названии, expect, waitForTimeout, удалён шаг 3)
  → найдены 4/4, REJECT
- реальная mentor-stats-filters.spec.ts, два прогона (по инструкции и типизированным субагентом)
  → оба CHANGES: не проверяется «за выбранный период» в шагах 2 и 3; рецензент опроверг
  догадку автора «проверяются 2 фильтра из 6»
- проблема: во втором прогоне рецензент сослался на stage.json:161 — файл с учётками

Проверка: npm run check exit 0.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 .claude/agents/spec-reviewer.md                    | 79 +++++++++++++++++++
 .claude/skills/ui-autotest/SKILL.md                | 49 +++++++++---
 AGENTS.md                                          |  2 +-
 docs/autonomy-log.md                               |  1 +
 docs/harness.md                                    |  9 ++-
 .../reviews/2026-09-29-control-planted-defects.txt |  6 ++
 docs/reviews/2026-09-29-control-review.md          | 34 +++++++++
 docs/reviews/2026-09-29-control-spec.ts.txt        | 53 +++++++++++++
 .../2026-09-29-mentor-stats-filters-review.md      | 88 ++++++++++++++++++++++
 9 files changed, 306 insertions(+), 15 deletions(-)
```

## 3c84a31 2026-09-29 spec(jenkins-verify): stale — только для записей своего джоба

```text
Живой прогон с первыми тремя записями known-failures (решение человека: 2 × PRJ-4825,
1 × PRJ-6768) показал: общий файл на три джоба делает чужие записи «stale — remove».
Совет удалить их был бы вредным.

- новое изменение scope-known-failures-by-job: MODIFIED requirement, сценарий «запись
  другого джоба не stale»
- ci/known-failures.json: три записи; PRJ-4825 в Jira закрыт — это указано в reason

Кода нет. openspec validate --strict: valid.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 ci/known-failures.json                             | 21 +++++++++++-
 .../scope-known-failures-by-job/.openspec.yaml     |  2 ++
 .../changes/scope-known-failures-by-job/design.md  | 10 ++++++
 .../scope-known-failures-by-job/proposal.md        | 31 +++++++++++++++++
 .../specs/jenkins-verify/spec.md                   | 40 ++++++++++++++++++++++
 .../changes/scope-known-failures-by-job/tasks.md   | 12 +++++++
 6 files changed, 115 insertions(+), 1 deletion(-)
```

## dc7bbb9 2026-09-29 test(jenkins-verify): запись другого джоба не должна быть stale — красный

```text
harness:test → 16 pass, 1 fail (verdict ещё не знает про job).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 openspec/changes/scope-known-failures-by-job/tasks.md |  4 ++--
 scripts/ci/jenkins-report.test.mjs                    | 16 ++++++++++++++++
 2 files changed, 18 insertions(+), 2 deletions(-)
```

## c4cd38c 2026-09-29 feat(jenkins-verify): stale считается только по записям своего джоба

```text
verdict(build, report, known, job); CLI передаёт job (аргумент или URL сборки).
ci/known-failures.json: поле job у трёх записей; формат записи в скилле обновлён.

Живой прогон: lms #415 FAIL (3 new, 2 known, 0 stale), admin #181 FAIL (1 new, 1 known, 0 stale);
до правки каждый джоб объявлял записи соседа stale.
Проверка: npm run check exit 0, harness:test 17/17.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 .claude/skills/jenkins-verify/SKILL.md                | 5 +++--
 ci/known-failures.json                                | 3 +++
 openspec/changes/scope-known-failures-by-job/tasks.md | 6 +++---
 scripts/ci/jenkins-report.mjs                         | 9 +++++----
 4 files changed, 14 insertions(+), 9 deletions(-)
```

## 6d97d7d 2026-09-29 chore(openspec): архив scope-known-failures-by-job

```text
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 .../2026-09-29-scope-known-failures-by-job}/.openspec.yaml    |  0
 .../2026-09-29-scope-known-failures-by-job}/design.md         |  0
 .../2026-09-29-scope-known-failures-by-job}/proposal.md       |  0
 .../specs/jenkins-verify/spec.md                              |  0
 .../2026-09-29-scope-known-failures-by-job}/tasks.md          |  0
 openspec/specs/jenkins-verify/spec.md                         | 11 ++++++++---
 6 files changed, 8 insertions(+), 3 deletions(-)
```

## 1603f42 2026-09-29 fix(allure): linkTestCase больше не ведёт на чужой кейс

```text
Было: linkTestCase(84) → подпись PRJ-TC-84, URL с caseId=84. caseId — внутренний id AIO,
не номер ключа: в Chrome caseId=84 открыл PRJ-TC-40, а PRJ-TC-84 — это caseId=130.
Старый формат URL (plugins/servlet/ac/…) после переезда AIO на Forge открывает пустую страницу.

Стало: linkTestCase(keyNumber, aioCaseId?)
- с aioCaseId — новый формат /jira/apps/…?ac.page=case-steps&ac.params={"caseId":N}
- без него — список кейсов проекта (ac.page=cases, поиск по ключу), а не чужой кейс
- 99 спек без aioCaseId получают безопасную ссылку; две с известным id: PRJ-TC-84 → 130, PRJ-TC-23 → 66
- по ключу AIO ссылку не строит: ac.params={"caseKey":…} открывает форму Create Case

Автоматическое сопоставление ключ → id через REST API AIO не сделано: использование
MCP-токена для прямых вызовов API заблокировано классификатором — решает человек.

Проверка: npm run check exit 0; обе изменённые спеки зелёные на stage (2 passed),
в allure-results ссылки PRJ-TC-84 → caseId 130, PRJ-TC-23 → caseId 66.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 .claude/skills/api-test/SKILL.md                   |  2 +-
 .claude/skills/ui-autotest/SKILL.md                |  7 ++++---
 .../mentor-stats/mentor-stats-filters.spec.ts      |  2 +-
 .../roles/methodist-role-verification.spec.ts      |  2 +-
 utils/helpers/allure-helper.ts                     | 23 ++++++++++++++++------
 5 files changed, 24 insertions(+), 12 deletions(-)
```

## 8730532 2026-09-30 chore(harness): collect-evidence берёт последний упавший шаг; ui-autotest — пользователи и linkTestCase

```text
- collect-evidence.mjs: «failing step» = ПОСЛЕДНИЙ упавший шаг на каждом уровне. Allure помечает
  шаг failed и тогда, когда внутри toPass упала промежуточная попытка, а последняя прошла —
  первый упавший шаг указывал на setup вместо реальной проверки (найдено на PRJ-TC-69)
- ui-autotest §0.6: выделенных менеджеров для admin-panel спеки агент создаёт сам
  (createManager + одноразовая provisioning-спека, ключи в stage.json) — не спрашивает
- ui-autotest §1: linkTestCase в test() или beforeEach, НЕ в beforeAll — Allure вешает ссылку
  только на первый тест воркера (на PRJ-TC-69 у тестов 2 и 3 ссылки не было)

Проверка: npm run check exit 0.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 .claude/skills/bug-report/scripts/collect-evidence.mjs | 11 +++++++----
 .claude/skills/ui-autotest/SKILL.md                    | 15 +++++++++++----
 2 files changed, 18 insertions(+), 8 deletions(-)
```

## 23e0a0d 2026-09-30 test(PRJ-TC-69): статистика менторов — первичный ментор, переназначение, ответы > 10 символов

```text
mentor-stats-calculation.spec.ts, стиль A, 3 сценария; у каждого свой свежий студент с ДЗ:
1. первичный ментор: ДЗ в «Откр.», после закрытия в «Закр.» только у него
2. A ответил → переназначено B → B закрыл: засчитано обоим (PRJ-2288 AC3 и проба stage;
   шаги 8 и 22–24 кейса этому противоречат — кейс правит человек)
3. сообщения по одному: 11 символов — засчитано, ровно 10 — не засчитано (удержание 15 с,
   toPass не доказывает отсутствие), 37 — засчитано. Падает на 10 символах → баг PRJ-6789,
   тест в ci/known-failures.json (admin-stage-regression-tests)
Шаги 13–14 (прошлый месяц) не автоматизированы по решению человека.

Инфраструктура:
- MentorStatsDeltasComponent: shouldSeeStatsDelta (toPass 30 с, explain в тексте ошибки),
  shouldSeeStatsHold; MentorRowStats.answersHomework; страница 300 строк (лимит pom-size)
- хелпер createStudentWithPendingHomework: доступ + поток V2 → вход студента в LMS (прогресс
  курса создаётся первым визитом и появляется через секунды) → полный блок 2 (первое ДЗ)
- AdminUserApiClient.createManager; менеджеры user_TC_69_admin / _mentor_a / _mentor_b
  в stage.json (+21 строка) и в admin-panel-dedicated-admin-user.mdc

Проверка: npm run check exit 0; stage: 1 и 2 зелёные, 3 красный на 10 символах;
мутации M1 (+1→+2) и M2 (закрытие только новому) упали на своих проверках.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 .cursor/rules/admin-panel-dedicated-admin-user.mdc |   1 +
 ci/known-failures.json                             |   7 +
 core/api/admin/admin-user-api.ts                   |  21 ++
 .../mentor-stats/mentor-stats-deltas.component.ts  |  82 ++++++
 .../admin/tabs/mentor-stats/mentor-stats-page.ts   |   4 +
 test-data/users/static/stage.json                  |  21 ++
 .../helpers/mentor-stats-calculation.ts            |  69 +++++
 .../mentor-stats/mentor-stats-calculation.spec.ts  | 324 +++++++++++++++++++++
 utils/types/api/admin/mentor-chat-stats.ts         |   4 +-
 9 files changed, 532 insertions(+), 1 deletion(-)
```

## a6dce0b 2026-09-30 docs(phase7): прогон PRJ-TC-69 через конвейер, ревью, черновик бага PRJ-6789

```text
- docs/reviews/2026-09-29-phase7-gd-tc-69.md: ссылка → ключ по скриншоту, противоречие TC/истории,
  проба stage, 7 красных прогонов по вине агента, мутации, REJECT ревьюера и что с ним сделано,
  граница 10 символов
- docs/bugs/2026-09-30-otvety-dz-10-simvolov.md: черновик, заведён человеком как PRJ-6789
- autonomy-log: строки 7–8, повышение/снижение уровня

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 docs/autonomy-log.md                          |  10 +-
 docs/bugs/2026-09-30-otvety-dz-10-simvolov.md |  60 ++++++++++
 docs/reviews/2026-09-29-phase7-gd-tc-69.md    | 163 ++++++++++++++++++++++++++
 3 files changed, 231 insertions(+), 2 deletions(-)
```

## 6da908d 2026-09-30 chore(harness): правила живут в .claude/rules, .cursor/ снова локальный (git-ignored)

```text
Решение человека (2026-09-30): .cursor/ в .gitignore, ни один файл в нём не удаляется.
Было: .claude/rules/*.md — симлинки на .cursor/rules/*.mdc; без .cursor в git они битые у всех,
кто клонирует (так было на main до фазы 0).

- .claude/rules/*.md: симлинки заменены обычными файлами, побайтно равными .mdc
- .gitignore: .cursor/ и .claude/worktrees/; git rm -r --cached .cursor — только индекс.
  sha256 всех 25 файлов .cursor/** до и после — идентичны
- npm run cursor:sync: копирует .claude/rules → .cursor/rules/*.mdc (перезапись, без удаления);
  --check сообщает о расхождении
- hooks:selftest: при отсутствии .cursor/hooks печатает SKIP вместо падения
- ссылки <rule>.mdc → <rule>.md в правилах, скиллах и сообщениях rules-lint (78 мест);
  CLAUDE.md, AGENTS.md, docs/harness.md: источник истины — .claude/rules

Проверка: npm run check exit 0; hooks:selftest all passed (и с .cursor, и без — SKIP);
cursor:sync --check → in sync.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 .claude/rules/activity-calendar-conventions.md     |  66 ++++++++-
 .claude/rules/admin-panel-create-admin-user.md     |  31 +++-
 .claude/rules/admin-panel-dedicated-admin-user.md  |  71 ++++++++-
 .claude/rules/admin-panel-student-emails.md        |  29 +++-
 .claude/rules/admin-panel-tables.md                | 102 ++++++++++++-
 .claude/rules/admin-panel-user-keys.md             |  37 ++++-
 .claude/rules/api-test.md                          |  45 +++++-
 .claude/rules/auth-and-sessions.md                 |  91 +++++++++++-
 .claude/rules/autotest-tags-and-allure.md          |  38 ++++-
 .claude/rules/code-quality.md                      |  63 +++++++-
 .claude/rules/date-helper-seconds-to-ms.md         |  27 +++-
 .claude/rules/no-hardcoded-waits.md                |  81 ++++++++++-
 .claude/rules/page-object-size.md                  |  56 ++++++-
 .claude/rules/page-objects-conventions.md          |  59 +++++++-
 .claude/rules/playwright-specs-no-expect.md        |  43 +++++-
 .claude/rules/pro-trading-autotests.md             | 161 ++++++++++++++++++++-
 .claude/rules/pro-trading-subscriptions-api.md     |  70 ++++++++-
 .claude/rules/project-base.md                      |  23 ++-
 .claude/rules/readability-for-everyone.md          |  38 ++++-
 .claude/rules/test-naming-no-tc-ids.md             |  31 +++-
 .claude/rules/test-user-lifecycle.md               | 133 ++++++++++++++++-
 .claude/skills/api-test/SKILL.md                   |   4 +-
 .claude/skills/ui-autotest/SKILL.md                |  58 ++++----
 .cursor/hooks.json                                 |  17 ---
 .cursor/hooks/guard-secrets.mjs                    |  30 ----
 .cursor/mcp.json                                   |  27 ----
 .cursor/rules/activity-calendar-conventions.mdc    |  65 ---------
 .cursor/rules/admin-panel-create-admin-user.mdc    |  30 ----
 .cursor/rules/admin-panel-dedicated-admin-user.mdc |  70 ---------
 .cursor/rules/admin-panel-student-emails.mdc       |  28 ----
 .cursor/rules/admin-panel-tables.mdc               | 101 -------------
 .cursor/rules/admin-panel-user-keys.mdc            |  36 -----
 .cursor/rules/api-test.mdc                         |  44 ------
 .cursor/rules/auth-and-sessions.mdc                |  90 ------------
 .cursor/rules/autotest-tags-and-allure.mdc         |  37 -----
 .cursor/rules/code-quality.mdc                     |  62 --------
 .cursor/rules/date-helper-seconds-to-ms.mdc        |  26 ----
 .cursor/rules/no-hardcoded-waits.mdc               |  80 ----------
 .cursor/rules/page-object-size.mdc                 |  55 -------
 .cursor/rules/page-objects-conventions.mdc         |  58 --------
 .cursor/rules/playwright-specs-no-expect.mdc       |  42 ------
 .cursor/rules/pro-trading-autotests.mdc            | 160 --------------------
 .cursor/rules/pro-trading-subscriptions-api.mdc    |  69 ---------
 .cursor/rules/project-base.mdc                     |  22 ---
 .cursor/rules/readability-for-everyone.mdc         |  37 -----
 .cursor/rules/test-naming-no-tc-ids.mdc            |  30 ----
 .cursor/rules/test-user-lifecycle.mdc              | 132 -----------------
 .gitignore                                         |   6 +-
 AGENTS.md                                          |   5 +-
 CLAUDE.md                                          |   4 +-
 docs/harness.md                                    |   7 +-
 package.json                                       |   3 +-
 scripts/harness/sync-cursor.mjs                    |  47 ++++++
 scripts/hooks-selftest.mjs                         |  55 +++----
 scripts/rules-lint.mjs                             |  18 +--
 55 files changed, 1406 insertions(+), 1444 deletions(-)
```

## 1a82fbb 2026-09-30 docs(harness): структура по OpenAI «Harness engineering» — индекс, ARCHITECTURE.md, git-policy

```text
- docs/index.md — точка входа: каждый документ, назначение, дата проверки
- ARCHITECTURE.md — слои (spec → helper → fixture → POM → API client → utils) и направление
  импортов; замерено: page-objects не импортируют core/fixtures, utils импортирует вверх (в техдолг)
- docs/core-beliefs.md — 14 принципов, из которых выводятся правила и проверки
- docs/harness/git-policy.md — что коммитим и что локально (принцип project-factory: доказательства
  в git, игнорируем только личное и временное)
- docs/exec-plans/{active,completed}/ + tech-debt-tracker.md (11 пунктов)
- крупные документы разрезаны за индексами: harness.md → docs/harness/ (5), api-test-strategy
  (293 стр.) → docs/test-strategy/api/ (6), admin-panel-tables (368) → docs/design/admin-panel-tables/ (6)
- логи → docs/logs/, endpoints.csv → docs/references/ (endpoint-lookup обновлён)
- ui-autotest SKILL.md 397 → 213 строк; стили, auth/fixtures, скелет спеки → references/
- все ссылки на старые пути обновлены; проверка относительных ссылок: 0 битых

Перевод на английский и STE100 — следующий этап.
Проверка: npm run check exit 0; hooks:selftest all passed.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 .claude/rules/admin-panel-tables.md                |   2 +-
 .claude/rules/project-base.md                      |   4 +-
 .claude/skills/api-test/SKILL.md                   |  18 +-
 .../skills/api-test/scripts/endpoint-lookup.mjs    |   6 +-
 .claude/skills/ui-autotest/SKILL.md                | 198 +----------
 .../ui-autotest/references/auth-and-fixtures.md    |  90 +++++
 .../skills/ui-autotest/references/spec-skeleton.md |  67 ++++
 .../references/styles-and-parametrisation.md       |  58 ++++
 AGENTS.md                                          |  12 +-
 ARCHITECTURE.md                                    |  49 +++
 CLAUDE.md                                          |   2 +-
 docs/admin-panel-tables.md                         | 368 ---------------------
 docs/api-test-strategy.md                          | 293 ----------------
 docs/bugs/index.md                                 |   8 +
 docs/core-beliefs.md                               |  42 +++
 docs/design/admin-panel-tables/adding-a-page.md    |  53 +++
 docs/design/admin-panel-tables/base-table.md       |  62 ++++
 docs/design/admin-panel-tables/filters.md          |  55 +++
 docs/design/admin-panel-tables/index.md            | 106 ++++++
 docs/design/admin-panel-tables/page-facade.md      |  70 ++++
 .../admin-panel-tables/structure-and-fixture.md    |  37 +++
 docs/{ => design}/autotest-tags-and-allure.md      |   0
 docs/{ => exec-plans/active}/capstone-plan.md      |  12 +-
 docs/exec-plans/tech-debt-tracker.md               |  18 +
 docs/harness.md                                    | 157 ---------
 docs/harness/control.md                            |  42 +++
 docs/harness/git-policy.md                         |  28 ++
 docs/harness/index.md                              |  14 +
 docs/harness/language-and-style.md                 |   9 +
 docs/harness/layers.md                             |  65 ++++
 docs/harness/mcp-and-secrets.md                    |  41 +++
 docs/index.md                                      |  60 ++++
 docs/{ => logs}/autonomy-log.md                    |   4 +-
 docs/{ => logs}/context-log.md                     |   2 +-
 docs/{ => logs}/session-notes.md                   |   0
 docs/{ => references}/endpoints.csv                |   0
 docs/reviews/index.md                              |   7 +
 docs/test-strategy/api/approach.md                 |  48 +++
 docs/test-strategy/api/coverage.md                 |  49 +++
 docs/test-strategy/api/governance.md               |  66 ++++
 docs/test-strategy/api/index.md                    |  37 +++
 docs/test-strategy/api/scope.md                    |  62 ++++
 docs/test-strategy/api/tooling-and-data.md         |  46 +++
 scripts/hooks-selftest.mjs                         |   2 +-
 44 files changed, 1329 insertions(+), 1040 deletions(-)
```

## 2dffaec 2026-09-30 fix(gitignore): logs/ only at the repo root — docs/logs/ is committed evidence

```text
The Logs pattern 'logs/' also matched docs/logs/ (autonomy log, context log, session notes).
The moved files were tracked already, but a new file there would have been ignored,
against docs/harness/git-policy.md. Now '/logs/'.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 .gitignore | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
```

## c70e64c 2026-09-30 chore(skills): vendor ASD-STE100 skill (danyuchn/asd-ste100-skill @ 7d4a135, MIT)

```text
Copied without changes, pinned in .claude/skills/asd-ste100/VENDORED.md, so the team and Cursor
get the same skill. Human's decision (2026-09-30): every harness and doc text passes this skill
after it is created or edited. scripts/ste-lint.py --selftest: OK (Python stdlib only).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 .claude/skills/asd-ste100/LICENSE                  |  21 +
 .claude/skills/asd-ste100/SKILL.md                 | 139 +++++++
 .claude/skills/asd-ste100/VENDORED.md              |  10 +
 .claude/skills/asd-ste100/examples/before-after.md |  92 +++++
 .../asd-ste100/examples/linter-edge-cases.md       |  14 +
 .../skills/asd-ste100/references/writing-rules.md  |  59 +++
 .claude/skills/asd-ste100/scripts/ste-lint.py      | 455 +++++++++++++++++++++
 7 files changed, 790 insertions(+)
```

## c182533 2026-09-30 spec(docs-gates): docs:lint and docs:ste — before the code

```text
7 requirements, 11 WHEN/THEN scenarios: never-empty scope, AGENTS.md ≤ 100 lines, links resolve,
every doc reachable from docs/index.md, no Cyrillic prose (quoted UI strings are data, docs/bugs exempt),
git-ignore policy, STE hard violations ratchet, missing python3 fails instead of passing.
openspec validate --strict: valid. No code yet.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 openspec/changes/add-docs-gates/.openspec.yaml     |   2 +
 openspec/changes/add-docs-gates/design.md          |  33 ++++++
 openspec/changes/add-docs-gates/proposal.md        |  38 +++++++
 .../add-docs-gates/specs/docs-gates/spec.md        | 112 +++++++++++++++++++++
 openspec/changes/add-docs-gates/tasks.md           |  19 ++++
 5 files changed, 204 insertions(+)
```

## 011afe2 2026-09-30 test(docs-gates): 18 tests for docs:lint and docs:ste — red

```text
One test per spec scenario, on in-memory file maps. harness:test → 17 pass, 2 fail
(ERR_MODULE_NOT_FOUND: docs-lint.mjs, docs-ste.mjs do not exist yet).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 openspec/changes/add-docs-gates/tasks.md |   6 +-
 scripts/docs/docs-lint.test.mjs          | 101 +++++++++++++++++++++++++++++++
 scripts/docs/docs-ste.test.mjs           |  50 +++++++++++++++
 3 files changed, 154 insertions(+), 3 deletions(-)
```

## 7e3be2a 2026-09-30 feat(docs-gates): docs:lint + docs:ste в npm run check — baseline «до» перевода и STE

```text
- docs:lint (Node, без зависимостей): AGENTS.md ≤ 100 строк, относительные ссылки, достижимость
  каждого doc из docs/index.md, кириллическая проза (цитаты «…»/`…` — данные; docs/bugs исключён)
  с ratchet-baseline, git-ignore политика через git check-ignore. Каждое падение — с тем, как чинить
- docs:ste: вендорный ste-lint.py (ASD-STE100) на тех же файлах, ratchet жёстких нарушений по файлу;
  без python3 — падение, не PASS
- реальность против спеки: первый прогон показал STE-находки в docs/bugs (русский текст) и в
  openspec/changes/archive (история) — оба исключены из STE, спека и design обновлены до кода

Baseline «до» (2026-09-30): язык — 24 файла, 560 строк прозы; STE — 42 файла, 224 жёстких нарушения.
Мутация: строка кириллицы + «; spin up» в AGENTS.md → оба гейта красные; откат → зелёные.

Проверка: npm run check exit 0; harness:test 36/36.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 .docs-language-baseline.json                       |  26 +++
 .ste-baseline.json                                 |  44 +++++
 openspec/changes/add-docs-gates/design.md          |   6 +
 .../add-docs-gates/specs/docs-gates/spec.md        |  13 +-
 openspec/changes/add-docs-gates/tasks.md           |   8 +-
 package.json                                       |   6 +-
 scripts/docs/docs-lint.mjs                         | 193 +++++++++++++++++++++
 scripts/docs/docs-ste.mjs                          |  76 ++++++++
 scripts/docs/docs-ste.test.mjs                     |  11 +-
 9 files changed, 373 insertions(+), 10 deletions(-)
```

## cdec327 2026-09-30 docs(harness): English + ASD-STE100 for every harness and doc text

```text
Human's decisions (2026-09-30): all harness and doc text is English and passes the asd-ste100
skill; templates are English, bug text in docs/bugs stays Russian.

- 5 maker agents rewrote ~90 files: strict mode for rules, skills, the agent and AGENTS/CLAUDE;
  STE-flavored for docs and openspec. Translated: capstone plan, autonomy log, session notes,
  admin-panel-tables (6 parts), autotest-tags-and-allure, API test strategy (6 parts), bug template.
  Label «Стартовать с» → «Start from» (3 places). docs/references/endpoints.csv: «Сasl» (Cyrillic С) → Casl.
- 2 checker agents (sonnet, read-only) diffed every file against 7e3be2a for meaning changes:
  - checker 1: 6 files with a meaning change or a lost skill trigger; 5 fixed (the "unless" in
    test-user-lifecycle, linkTestCase caseId optional, "check a build number" trigger, "Treat … as
    read-only" instead of a false claim, rule scope in admin-panel-dedicated-admin-user), 1 kept
    (English bug template = human's decision)
  - checker 2: 2 records the agent itself had "fixed" (a stale test count, a wrong belief) —
    restored, with dated notes
- docs-lint: files that drop to 0 are now reported as improved (new test, 37/37)
- baselines lowered: Cyrillic prose 560 lines / 24 files → 0; hard STE 224 / 42 files → 1
  (jenkins-verify: the skill name has "verify", the trigger needs "check" — documented in
  docs/harness/language-and-style.md)

Check: npm run check exit 0 (docs:lint ✓, docs:ste ✓, harness:test 37/37); hooks:selftest passed;
cursor:sync --check in sync; AGENTS.md 89 lines.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 .claude/agents/spec-reviewer.md                    |  48 ++--
 .claude/rules/activity-calendar-conventions.md     |  22 +-
 .claude/rules/admin-panel-create-admin-user.md     |  14 +-
 .claude/rules/admin-panel-dedicated-admin-user.md  |  29 ++-
 .claude/rules/admin-panel-student-emails.md        |   8 +-
 .claude/rules/admin-panel-tables.md                |  40 ++--
 .claude/rules/admin-panel-user-keys.md             |  10 +-
 .claude/rules/api-test.md                          |   8 +-
 .claude/rules/auth-and-sessions.md                 |  30 ++-
 .claude/rules/autotest-tags-and-allure.md          |  28 +--
 .claude/rules/code-quality.md                      |  19 +-
 .claude/rules/date-helper-seconds-to-ms.md         |   2 +-
 .claude/rules/no-hardcoded-waits.md                |  14 +-
 .claude/rules/page-object-size.md                  |   8 +-
 .claude/rules/page-objects-conventions.md          |  24 +-
 .claude/rules/playwright-specs-no-expect.md        |  16 +-
 .claude/rules/pro-trading-autotests.md             |  26 +-
 .claude/rules/pro-trading-subscriptions-api.md     |   6 +-
 .claude/rules/project-base.md                      |  33 ++-
 .claude/rules/readability-for-everyone.md          |  28 +--
 .claude/rules/test-naming-no-tc-ids.md             |   4 +-
 .claude/rules/test-user-lifecycle.md               |  66 ++---
 .claude/skills/agent-log-report/SKILL.md           |  61 ++---
 .claude/skills/api-test/SKILL.md                   |  63 ++---
 .claude/skills/bug-report/SKILL.md                 |  66 ++---
 .claude/skills/bug-report/template.md              |  52 ++--
 .claude/skills/jenkins-verify/SKILL.md             |  34 +--
 .claude/skills/karpathy-guidelines/SKILL.md        |  24 +-
 .claude/skills/ui-autotest/SKILL.md                | 184 +++++++-------
 .../ui-autotest/references/auth-and-fixtures.md    |  26 +-
 .../references/styles-and-parametrisation.md       |  27 ++-
 .docs-language-baseline.json                       |  27 +--
 .ste-baseline.json                                 |  43 +---
 AGENTS.md                                          |  49 ++--
 ARCHITECTURE.md                                    |  12 +-
 CLAUDE.md                                          |  28 ++-
 docs/core-beliefs.md                               |  20 +-
 docs/design/admin-panel-tables/adding-a-page.md    |  42 ++--
 docs/design/admin-panel-tables/base-table.md       |  70 +++---
 docs/design/admin-panel-tables/filters.md          |  32 +--
 docs/design/admin-panel-tables/index.md            |  78 +++---
 docs/design/admin-panel-tables/page-facade.md      |  20 +-
 .../admin-panel-tables/structure-and-fixture.md    |  10 +-
 docs/design/autotest-tags-and-allure.md            | 107 +++++----
 docs/exec-plans/active/capstone-plan.md            | 265 +++++++++++----------
 docs/exec-plans/tech-debt-tracker.md               |   4 +-
 docs/harness/control.md                            |  27 ++-
 docs/harness/git-policy.md                         |   4 +-
 docs/harness/index.md                              |   6 +-
 docs/harness/language-and-style.md                 |  63 ++++-
 docs/harness/layers.md                             |  54 +++--
 docs/harness/mcp-and-secrets.md                    |  24 +-
 docs/index.md                                      |  10 +-
 docs/logs/autonomy-log.md                          |  94 +++++---
 docs/logs/context-log.md                           |  26 +-
 docs/logs/session-notes.md                         |  16 +-
 docs/references/endpoints.csv                      |  10 +-
 docs/reviews/2026-09-29-control-review.md          |  12 +-
 .../2026-09-29-mentor-stats-filters-review.md      |  38 +--
 docs/reviews/2026-09-29-phase7-gd-tc-69.md         |  60 ++---
 docs/test-strategy/api/approach.md                 |  68 +++---
 docs/test-strategy/api/coverage.md                 |  70 +++---
 docs/test-strategy/api/governance.md               |  99 ++++----
 docs/test-strategy/api/index.md                    |  39 +--
 docs/test-strategy/api/scope.md                    |  86 +++----
 docs/test-strategy/api/tooling-and-data.md         |  69 +++---
 openspec/changes/add-docs-gates/design.md          |  11 +-
 openspec/changes/add-docs-gates/proposal.md        |  14 +-
 .../add-docs-gates/specs/docs-gates/spec.md        |   8 +-
 openspec/changes/add-docs-gates/tasks.md           |   4 +-
 openspec/specs/jenkins-verify/spec.md              |  42 ++--
 scripts/docs/docs-lint.mjs                         |  11 +-
 scripts/docs/docs-lint.test.mjs                    |   7 +
 73 files changed, 1490 insertions(+), 1309 deletions(-)
```

## 877b029 2026-09-30 chore(openspec): archive add-docs-gates → openspec/specs/docs-gates

```text
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 .../2026-09-30-add-docs-gates}/.openspec.yaml      |   0
 .../2026-09-30-add-docs-gates}/design.md           |   0
 .../2026-09-30-add-docs-gates}/proposal.md         |   0
 .../specs/docs-gates/spec.md                       |   0
 .../2026-09-30-add-docs-gates}/tasks.md            |   2 +-
 openspec/specs/docs-gates/spec.md                  | 120 +++++++++++++++++++++
 6 files changed, 121 insertions(+), 1 deletion(-)
```

## 18b4f2c 2026-09-30 test(PRJ-TC-69): «Ответы ДЗ» засчитывают сообщения от 10 символов

```text
По уточнению требований в PRJ-6789 граница — ≥10 символов, а не >10.
Тест 3 теперь проверяет: 10 символов засчитываются, 9 — нет.
Запись PRJ-6789 убрана из ci/known-failures.json, черновик бага помечен «не баг».

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 ci/known-failures.json                                 |  7 -------
 docs/bugs/2026-09-30-otvety-dz-10-simvolov.md          |  7 ++++++-
 .../mentor-stats/mentor-stats-calculation.spec.ts      | 18 +++++++++---------
 utils/types/api/admin/mentor-chat-stats.ts             |  2 +-
 4 files changed, 16 insertions(+), 18 deletions(-)
```

## bce7631 2026-09-30 spec(edit-hooks): checks on each edit, commit and session start — before the code

```text
6 requirements, 13 WHEN/THEN scenarios: doc edit → language + STE against baselines (exit 2);
code edit → rules:lint NEW/WORSE + ESLint errors for the file; rules:lint covers untracked files;
guard: journal glob, the env template allowed, Grep/Glob on static users, no-verify; pre-commit:
env files, baselines only shrink, known-failures need a PRJ- issue; SessionStart prints the newest
session-notes block; hooks never break a session. openspec validate --strict: valid. No code yet.

The guard blocked the first try of this commit: its message named the env template file. That is
the false positive this change fixes (tech-debt #6).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 openspec/changes/add-edit-hooks/.openspec.yaml     |   2 +
 openspec/changes/add-edit-hooks/design.md          |  49 ++++++++
 openspec/changes/add-edit-hooks/proposal.md        |  48 ++++++++
 .../add-edit-hooks/specs/edit-hooks/spec.md        | 127 +++++++++++++++++++++
 openspec/changes/add-edit-hooks/tasks.md           |  20 ++++
 5 files changed, 246 insertions(+)
```

## ecaee28 2026-09-30 test(edit-hooks): unit tests and selftest cases — red

```text
14 unit tests (checksFor, docFindings, codeFindings, pre-commit checks, newestBlock, the new guard
rules) → ERR_MODULE_NOT_FOUND (post-edit-check.mjs does not exist yet).
hooks:selftest: 13 new end-to-end cases, 11 red, 2 green on purpose (the env-local block and
git log -n already worked).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 openspec/changes/add-edit-hooks/tasks.md |   6 +-
 scripts/harness/edit-hooks.test.mjs      | 150 +++++++++++++++++++++++++++++++
 scripts/hooks-selftest.mjs               |  32 ++++++-
 3 files changed, 184 insertions(+), 4 deletions(-)
```

## fe74fa0 2026-09-30 feat(edit-hooks): checks on each edit, commit and session start; guard gaps closed

```text
- PostToolUse (Edit|Write|MultiEdit) .claude/hooks/post-edit-check.mjs:
  harness/doc text → language check + ASD-STE100 linter against the baselines;
  specs/POM → rules:lint NEW/WORSE lines of the file + ESLint errors. Findings → exit 2
  (the agent sees them at once). Bad input or a missing tool → exit 0 with a note.
- SessionStart .claude/hooks/session-start.mjs prints the newest session-notes block.
- rules:lint now also checks untracked files: a new spec was invisible to it before its first commit.
- guard: any path into the journal directory (closes the glob bypass), the env template readable,
  Grep/Glob on the static user files blocked, git commit/push --no-verify and commit -n blocked.
  classify(text, toolName); the Cursor adapter still calls classify(text).
- git pre-commit (.githooks/pre-commit → scripts/harness/pre-commit.mjs, npm run hooks:install):
  env files, baselines only shrink (flat keys for all 4 baselines), new known failures need PRJ-<n>.

Found on the way, both by the guard blocking this very commit:
- the no-verify rule matched the flag inside a heredoc commit message. Now heredoc bodies and quoted
  text are removed before that match (new test, red → green)
- the journal rule blocks any command text that names the journal path, a commit message included.
  Text matching cannot tell a mention from a read. Recorded in the tech-debt tracker.

Check: harness:test 53/53; hooks:selftest all passed (13 new end-to-end cases); npm run check exit 0.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 .claude/hooks/guard-secrets.mjs     |   2 +-
 .claude/hooks/post-edit-check.mjs   | 154 ++++++++++++++++++++++++++++++++++++
 .claude/hooks/session-start.mjs     |  33 ++++++++
 .claude/settings.json               |  19 +++++
 .githooks/pre-commit                |   3 +
 package.json                        |   3 +-
 scripts/harness/edit-hooks.test.mjs |   6 ++
 scripts/harness/guard-policy.mjs    |  40 ++++++++--
 scripts/harness/pre-commit.mjs      |  96 ++++++++++++++++++++++
 scripts/rules-lint.mjs              |   3 +-
 10 files changed, 348 insertions(+), 11 deletions(-)
```

## 0fe4e06 2026-09-30 docs(edit-hooks): document the hooks, update the tech-debt tracker, archive the change

```text
- docs/harness/control.md: a table of the 4 Claude hooks, the guard rules, the git hooks,
  what is Claude-only and what works for every tool
- tech-debt tracker: 3 rows closed (Grep/Glob on static users, the env template, the Casl typo);
  5 rows found in stage 5 (the guard blocks mere mentions, Bash reads of the stage users file,
  git -c tricks, hooks:install per clone, Bash edits skip the edit hook)
- autonomy log: row 11, and the two times the new guard blocked the agent's own commit
- AGENTS.md: npm run hooks:install (90 lines)
- openspec: add-edit-hooks archived → openspec/specs/edit-hooks

Live proof, this session: a Cyrillic edit → 3 findings from the hook at once; a commit with a
grown .ste-baseline.json → blocked by pre-commit; git commit --no-verify from the agent → blocked.
This commit itself passed the new pre-commit hook.

Check: npm run check exit 0 (docs gates on 92 files, harness:test 53/53); hooks:selftest passed.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 AGENTS.md                                          |   1 +
 docs/exec-plans/tech-debt-tracker.md               |  16 +--
 docs/harness/control.md                            |  52 ++++++---
 docs/logs/autonomy-log.md                          |   6 +
 .../2026-09-30-add-edit-hooks}/.openspec.yaml      |   0
 .../2026-09-30-add-edit-hooks}/design.md           |   0
 .../2026-09-30-add-edit-hooks}/proposal.md         |   0
 .../specs/edit-hooks/spec.md                       |   0
 .../2026-09-30-add-edit-hooks}/tasks.md            |   4 +-
 openspec/specs/edit-hooks/spec.md                  | 126 +++++++++++++++++++++
 10 files changed, 183 insertions(+), 22 deletions(-)
```

## 9c1581c 2026-09-30 docs(session): close the session — handoff block and phase status

```text
session-notes: the newest block lists what is done (with commits), what is open (merge,
Jenkins after the merge, phase 8 step by step) and the traps for the next agent. The SessionStart
hook prints this block in the next session. capstone-plan: a status table per phase
(phase 6 skipped by the human's decision, phase 8 not started).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 docs/exec-plans/active/capstone-plan.md | 17 ++++++++++
 docs/logs/session-notes.md              | 55 ++++++++++++++++++++++++++++++++-
 2 files changed, 71 insertions(+), 1 deletion(-)
```

## e1a9540 2026-09-30 spec(stabilize-loop): a bounded loop that runs one spec until it is stable — before the code

```text
Phase 6 of the capstone. The flaky tests come from lms-stage-regression-tests 414-416.
Autonomy log row 12 records the planned level before the work.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 docs/logs/autonomy-log.md                          |   1 +
 openspec/changes/add-stabilize-loop/.openspec.yaml |   2 +
 openspec/changes/add-stabilize-loop/design.md      |  61 +++++++++
 openspec/changes/add-stabilize-loop/proposal.md    |  50 +++++++
 .../specs/stabilize-loop/spec.md                   | 151 +++++++++++++++++++++
 openspec/changes/add-stabilize-loop/tasks.md       |  24 ++++
 6 files changed, 289 insertions(+)
```

## 51ace4a 2026-09-30 test(stabilize-loop): 27 unit and loop tests with fake runs — red

```text
One test for each scenario of the spec. runLoop gets fake test runs, agent runs,
hashes and diffs, so every stop reason is checked offline at no cost.
node --test scripts/loop/stabilize.test.mjs: 27 of 27 fail on the stub.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 scripts/loop/stabilize.mjs      |  24 +++
 scripts/loop/stabilize.test.mjs | 356 ++++++++++++++++++++++++++++++++++++++++
 2 files changed, 380 insertions(+)
```

## e292bc1 2026-09-30 feat(stabilize-loop): the loop runs a spec until it is stable, with hard limits — green

```text
scripts/loop/stabilize.mjs and npm run loop:stabilize. Playwright runs with
--repeat-each=5; on a failure, claude -p (project settings only, no Bash, no MCP,
Edit only in page-objects/, tests/, utils/) fixes the test code. Stops on GREEN,
NOT_REPRODUCED, NOT_EARNED, MAX_ATTEMPTS, TIME, BUDGET, STALL, PROTECTED, WEAKENED,
PRODUCT_BUG or AGENT_ERROR. Never commits. Reports go to docs/loops/.

npm run check: exit 0, harness:test 80 of 80 (27 new). The first check failed on
no-control-regex in the ANSI strip; node:util stripVTControlCharacters replaced it.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 docs/index.md                                |   1 +
 docs/loops/index.md                          |  10 +
 openspec/changes/add-stabilize-loop/tasks.md |  14 +-
 package.json                                 |   1 +
 scripts/loop/stabilize.mjs                   | 519 ++++++++++++++++++++++++++-
 5 files changed, 519 insertions(+), 26 deletions(-)
```

## b3fc9c9 2026-09-30 docs(loops): live loop 1 on activity-calendar.spec.ts — NOT_REPRODUCED

```text
The spec failed in Jenkins builds 414 and 416. Locally, with 4 workers, it passed
5 of 5 in 1.4 min. The agent did not start, and the cost is 0.00 USD.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 docs/loops/2026-09-30-activity-calendar.md | 26 ++++++++++++++++++++++++++
 docs/loops/index.md                        |  1 +
 2 files changed, 27 insertions(+)
```

## 326ddb1 2026-09-30 docs(loops): loop 2 GREEN on block-availability 11 and 14; the checker and a stage run reject the fix

```text
Loop 2: 3 runs, 2 attempts, 2.96 USD, 16.7 min, stop GREEN for its target.
The checker (sonnet, read-only) gave CHANGES: the new block wait ignores skipHomework.
A stage run of all 7 callers: 10 passed, 10 failed. 5 failures come from the new wait
(block-availability 8, 18 BASIC, 18 VIP, change-name-verification,
homework-preview-after-upgrade). The fix in utils/helpers/api-helper.ts is not committed.

The design now records the limit: GREEN covers only the loop target.
AGENTS.md and docs/harness/layers.md name the loop.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 AGENTS.md                                      |   4 +-
 docs/harness/layers.md                         |   7 ++
 docs/loops/2026-09-30-block-availability.md    | 124 +++++++++++++++++++++++++
 docs/loops/index.md                            |   1 +
 docs/reviews/2026-09-30-loop2-helper-review.md |  86 +++++++++++++++++
 docs/reviews/index.md                          |   1 +
 openspec/changes/add-stabilize-loop/design.md  |   7 +-
 7 files changed, 228 insertions(+), 2 deletions(-)
```

## 6ea8f16 2026-09-30 docs(stabilize-loop): close phase 6 — the human discarded the loop 2 fix and stopped the fix loop

```text
The OpenSpec change add-stabilize-loop is archived. The current spec is
openspec/specs/stabilize-loop/spec.md.
Autonomy log row 12: the fact, a level decrease for the fix loop, and two agent mistakes.
Tech-debt rows 14-16: the progress lag in block-availability, the mentor-stats progress
404 under load, activity-calendar not reproduced locally. Row 10: 287 warnings.
The capstone plan marks phase 6 done. The session notes have a new handoff block.
npm run check: exit 0, harness:test 80 of 80.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 docs/exec-plans/active/capstone-plan.md            |   2 +-
 docs/exec-plans/tech-debt-tracker.md               |   5 +-
 docs/logs/autonomy-log.md                          |  18 ++-
 docs/logs/session-notes.md                         |  34 +++++
 docs/reviews/2026-09-30-loop2-helper-review.md     |   4 +
 .../2026-09-30-add-stabilize-loop}/.openspec.yaml  |   0
 .../2026-09-30-add-stabilize-loop}/design.md       |   0
 .../2026-09-30-add-stabilize-loop}/proposal.md     |   0
 .../specs/stabilize-loop/spec.md                   |   0
 .../2026-09-30-add-stabilize-loop}/tasks.md        |   8 +-
 openspec/specs/stabilize-loop/spec.md              | 150 +++++++++++++++++++++
 scripts/loop/stabilize.test.mjs                    |   2 +-
 12 files changed, 215 insertions(+), 8 deletions(-)
```

## 1b0dbc7 2026-09-30 feat(capstone): export script with a leak gate, and the submission README

```text
scripts/capstone/export.mjs copies the tracked harness and the evidence into
<out>/submissions/<name>/. It replaces company names, domains, e-mails, Jira keys
and a 2FA test code, re-points the README links, and writes git-log.md.
A gate scans every output file (names, hosts, e-mails, tokens, JWT, IPv4).
On a leak it writes nothing and exits 1. The script itself is not exported.

docs/capstone/README.md is the source of the submission README: practice →
evidence → what went wrong. docs:ste made two edits: the synonym rule forbids
"verify" and "check" in one file, so links with "verify" in the path became
folder links.

npm run check: exit 0, harness:test 87 of 87 (7 new).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 docs/capstone/README.md          |  59 ++++++++++
 docs/index.md                    |   1 +
 scripts/capstone/export.mjs      | 244 +++++++++++++++++++++++++++++++++++++++
 scripts/capstone/export.test.mjs |  97 ++++++++++++++++
 4 files changed, 401 insertions(+)
```

## a2ea93c 2026-09-30 fix(capstone): the leak gate caught 2 real leaks on the first export

```text
The first export on real data stopped with 2 leaks and wrote nothing:
- a plain "jira.example.com" in the session notes: only the full company host was replaced
- the synthetic JWT of a jenkins-report fixture: the Bearer rule ignored the allow list

The test of the allow list had hidden the second one: it filtered out the Bearer
findings. The test is strict now. On the old code: 2 of 7 red. On the fix: 7 of 7.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 scripts/capstone/export.mjs      | 6 +++++-
 scripts/capstone/export.test.mjs | 4 ++--
 2 files changed, 7 insertions(+), 3 deletions(-)
```

## 99283f0 2026-09-30 docs(autonomy): phase 8 — the planned levels before the public steps

```text
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 docs/logs/autonomy-log.md | 1 +
 1 file changed, 1 insertion(+)
```

## 63a6280 2026-09-30 docs(capstone): phase 8 status — the fork and the branch are pushed, the pull request waits

```text
Fork ArsenVlasov/2026-agentic-engineering-crash-course-capstone, branch arsen-vlasov,
commit 20b5f8d: the export of 99283f0, 151 files, 0 leaks. The pull request waits for
the name, the video and the text of the human. The session notes have the handoff.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 docs/exec-plans/active/capstone-plan.md |  2 +-
 docs/logs/autonomy-log.md               |  2 +-
 docs/logs/session-notes.md              | 28 ++++++++++++++++++++++++++++
 3 files changed, 30 insertions(+), 2 deletions(-)
```

## 9fb550c 2026-09-30 fix(docs): the session notes broke docs:ste in 63a6280

```text
63a6280 was committed after a red npm run check: the command joined the check and the
commit with ";", not "&&". The new trap line used both words of one action.
npm run check: exit 0 now.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 docs/logs/session-notes.md | 3 ++-
 1 file changed, 2 insertions(+), 1 deletion(-)
```

## d84384b 2026-09-30 docs(autonomy): two agent mistakes of phase 8 — a commit after a red check, a lenient test

```text
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 docs/logs/autonomy-log.md | 6 ++++++
 1 file changed, 6 insertions(+)
```

## 8dc0bac 2026-09-30 chore(gitignore): close the gaps — all env files, auth states, personal memory, blob reports

```text
Before, only two env file names were ignored. Another env file showed as untracked,
and only the pre-commit hook (after hooks:install) stopped it. Now every env file is
ignored except the template. The auth state folder is named as a secret in AGENTS.md
but was not ignored. The personal Claude Code memory file and the Playwright blob
report are local too. No tracked file becomes ignored (git ls-files -ci: 0).
docs/harness/git-policy.md has the same rows. npm run check: exit 0.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 .gitignore                 | 8 ++++++--
 docs/harness/git-policy.md | 7 +++++--
 2 files changed, 11 insertions(+), 4 deletions(-)
```

## e696c96 2026-09-30 chore(capstone): the plan goes to completed/, and the capstone-only files are removed

```text
By the decision of the human after the push of phase 8:
- docs/exec-plans/active/capstone-plan.md → docs/exec-plans/completed/
- removed: scripts/capstone/ (the export tool and its tests), docs/capstone/ (the README
  source), and the two control inputs of docs/reviews/
Git history keeps them: 8dc0bac (the export tool, the README source), bded737 (the
control inputs). The links point to these commits now. The session notes say how to
get the export tool back before the pull request.
npm run check: exit 0, harness:test 80 of 80.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>


 docs/capstone/README.md                            |  59 -----
 .../{active => completed}/capstone-plan.md         |   5 +
 docs/index.md                                      |   3 +-
 docs/logs/autonomy-log.md                          |   2 +-
 docs/logs/session-notes.md                         |  16 +-
 .../reviews/2026-09-29-control-planted-defects.txt |   6 -
 docs/reviews/2026-09-29-control-review.md          |   6 +-
 docs/reviews/2026-09-29-control-spec.ts.txt        |  53 -----
 docs/reviews/index.md                              |   2 +-
 scripts/capstone/export.mjs                        | 248 ---------------------
 scripts/capstone/export.test.mjs                   |  97 --------
 11 files changed, 23 insertions(+), 474 deletions(-)
```
