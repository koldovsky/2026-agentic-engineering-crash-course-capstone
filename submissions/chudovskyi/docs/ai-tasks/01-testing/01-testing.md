Ти в чужому репозиторії - chudovskyi.  
Корінь репозиторію - chudovskyi.

Нічого не змінюй - лише читай, виконай тести, збережи лог та звіт 

Запусти тести цього проєкту через Docker Compose і збережи результати.

Контекст:
- Файл: compose.test.yml
- Сервіс тестів: api_test
- БД: pg_test (PostgreSQL)
- Env: app/config/envs/.env.test
- Ini: pytest.ini
- Папка з тестами: tests/
- Команда в контейнері вже запускає: coverage run -m pytest -s -v && coverage report -m
- Після тестів контейнери не тримай запущеними

Кроки:
1. Перевір, що Docker запущений і є файли compose.test.yml + .env.test.

2. Запусти тести з кореня репозиторію:
docker compose -f compose.test.yml up --build --abort-on-container-exit --exit-code-from api_test

3. Збережи повний лог у файл:
   - YYYY-MM-DD_HH-MM_compose-test.log
   - файл збережи у теці, поряд, де знаходиться цей файл

4. Заповни шаблон звіту: 
   - YYYY-MM-DD_HH-MM_compose-test.md
   - файл збережи у теці, поряд, де знаходиться цей файл
   - за структурою нижче
   - не вигадуй цифри — бери тільки з логу

5. Після завершення зупини й прибери контейнери:
docker compose -f compose.test.yml down -v

6. У відповіді коротко напиши:
   - exit code
   - passed / failed / skipped / errors
   - coverage % (якщо є)
   - шляхи до .log і .md

Шаблон звіту (YYYY-MM-DD_HH-MM_compose-test.md)
# Test Report — Docker Compose (`compose.test.yml`)

## Meta
| Field | Value |
|---|---|
| Date (local) | YYYY-MM-DD HH:MM |
| Repo / branch | |
| Commit SHA | |
| OS / Docker | |
| Command | `docker compose -f compose.test.yml up --build --abort-on-container-exit --exit-code-from api_test` |
| Exit code | `0` / non-zero |

## Result summary
| Metric | Value |
|---|---|
| Status | PASS / FAIL |
| Passed | |
| Failed | |
| Errors | |
| Skipped | |
| Total | |
| Duration | |

## Coverage
| Metric | Value |
|---|---|
| Total coverage | xx% |
| Notes | (e.g. which modules are low) |

## Failed / errored tests
| Test | Assertion / error (short) |
|---|---|
| `tests/...` | |
| — | none |

## Environment notes
- `.env.test` present: yes/no
- Ports free (5432 / 8000): yes/no
- Build cache / rebuild: yes/no
- Known warnings (LF/CRLF, deprecations, etc.):

## Artifacts
- Full log: `YYYY-MM-DD_HH-MM_compose-test.log`
- Report: `YYYY-MM-DD_HH-MM_compose-test.md`

## Conclusion
1–3 sentences: overall readiness, blockers, next steps.