# Звіт: 03-verification

**Дата:** 2026-10-02 · **Гілка:** `chudovskyi` · **Статус:** ✅ PASS (exit 0)

## Що зроблено
| Файл | Зміна |
|---|---|
| `scripts/check.sh` | новий: послідовно `uv run ruff check app` → `uv run ruff format --check app` → `uv run pytest`, `set -e` (перша помилка зупиняє скрипт і дає ненульовий exit code) |
| `app/services/health.py` | новий: `build_health(service_name, started_at, now=None)` → `{"status": "ok", "service", "uptime_seconds"}`; `ValueError` на порожню назву або назву з самих пробілів; від'ємний uptime обрізається до 0 |
| `app/services/__init__.py` | додано експорт `build_health` (той самий патерн, що й для інших сервісів) |
| `tests/test_service_health.py` | новий: 4 тести (status ok, uptime = 90 с, порожня назва → `ValueError`, назва з пробілів → `ValueError`) |

Залежностей не додано. `pytest.ini`, `.github/workflows/`, `compose.*.yml` не змінено.

## Перевірка
На хості немає `uv` і `make`, а pytest потребує Postgres (autouse-фікстура `setup_db`). Тому `check` запускався в тестовому Docker-образі разом із БД `pg_test`:

```
docker compose -f compose.test.yml run --rm --build api_test sh scripts/check.sh
```

| Крок | Результат |
|---|---|
| `ruff check app` | `All checks passed!` |
| `ruff format --check app` | `63 files already formatted` |
| `pytest` | `44 passed, 1 warning in 5.10s` (40 наявних + 4 нові), 0 failed |
| **Exit code** | **0** (увесь запуск разом зі збиранням образу ~32 с) |

Після запуску контейнери прибрано: `docker compose -f compose.test.yml down -v`.

Перша спроба завершилась з exit 1, бо Docker Desktop не був запущений (`failed to connect to the docker API`). Після його запуску перевірку повторено з результатом вище.

## Попередження
- `PydanticDeprecatedSince211` у `fastapi_jsonapi/views/view_base.py:144`: відоме попередження зі сторонньої бібліотеки, до цих змін не має стосунку.

## Артефакти
- План: `2026-10-02_14-02_plan_of_verification.md`
- Повний лог: `2026-10-02_14-02_check.log`
- Звіт: `2026-10-02_14-02_report_of_verification.md`
