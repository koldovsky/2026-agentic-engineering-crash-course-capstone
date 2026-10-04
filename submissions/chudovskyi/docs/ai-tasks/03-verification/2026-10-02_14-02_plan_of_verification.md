# План: 03-verification — check-скрипт, health-сервіс, тести

## Контекст
Завдання `docs/ai-tasks/03-verification/03-verification.md` вимагає:
- одну команду перевірки (ruff check → ruff format --check → pytest);
- невеликий сервіс `build_health`;
- щонайменше 3 тести до нього.

Вимоги до результату: `check` завершується з exit 0, у звіті вказано команду, exit code і кількість passed. Заборонено: нові залежності, зміни в `pytest.ini`, `.github/workflows/` і `compose.*.yml`.

**Обмеження середовища (перевірено):**
- На хості немає `uv` і `make`, теки `.venv` теж немає.
- `pytest` має autouse-фікстуру `setup_db` (`tests/fixtures/db.py`), тож він завжди потребує Postgres. Хост БД задано в `.env.test`, а цей файл не можна читати.
- Тому `check` запускаю всередині тестового Docker-образу. У ньому вже є `uv`, dev-група (ruff, pytest), `COPY . .` (тобто і `scripts/`, і `tests/`) і БД `pg_test`.
- Makefile не підходить, бо `make` немає ні на хості, ні в образі. Беру `scripts/check.sh`.

## Зміни (3 нові файли + 1 рядок експорту)

### 1. `scripts/check.sh` (новий, LF)
```sh
#!/usr/bin/env sh
set -e
uv run ruff check app
uv run ruff format --check app
uv run pytest
```
Команди виконуються послідовно, перша помилка зупиняє скрипт і стає його exit code.

### 2. `app/services/health.py` (новий)
- `build_health(service_name: str, started_at: datetime, now: datetime | None = None) -> dict`.
- Порожня назва або назва з самих пробілів → `ValueError`.
- Повертає `{"status": "ok", "service": service_name, "uptime_seconds": int(...)}`.
- `uptime` рахується як `now - started_at`, де `now` за замовчуванням дорівнює `datetime.now(timezone.utc)`. Від'ємне значення обрізається до 0.
- Параметр `now` необов'язковий і потрібен лише для детермінованих тестів. Обидва обов'язкові аргументи з завдання на місці.
- Функція синхронна, без доступу до БД. Стиль коду як у `app/services/gemini.py`.
- У `app/services/__init__.py` додаю `build_health` в `__all__` та імпорт, за тим самим патерном, що й інші сервіси.

### 3. `tests/test_service_health.py` (новий, 4 тести)
- `test_build_health_ok`: `status == "ok"`, назва сервісу повертається.
- `test_build_health_uptime_seconds`: `started_at` і `now` з різницею 90 с дають `uptime_seconds == 90`.
- `test_build_health_empty_name_raises`: `""` → `ValueError`.
- `test_build_health_blank_name_raises`: `"   "` → `ValueError`.
- Імпорт `from app.services.health import build_health`, як у `tests/test_service_gemini.py`.

## Перевірка
1. Запуск `check` у контейнері (entrypoint чекає на БД, мігрує, сідить, потім виконує `exec "$@"`):
   `docker compose -f compose.test.yml run --rm --build api_test sh scripts/check.sh` → записую exit code.
2. Прибирання: `docker compose -f compose.test.yml down -v`.
3. Очікуваний результат: ruff чистий, `44 passed` (40 існуючих + 4 нові), exit 0.
4. Повний лог зберігаю поруч із завданням.

## Артефакти (у `docs/ai-tasks/03-verification/`, нові файли)
- `YYYY-MM-DD_HH-MM_plan_of_verification.md` — копія цього погодженого плану.
- `YYYY-MM-DD_HH-MM_report_of_verification.md` — звіт українською: зміни, команда, exit code, passed/failed, попередження.
- `YYYY-MM-DD_HH-MM_check.log` — повний вивід запуску.

## Не чіпаю
`pytest.ini`, `compose.*.yml`, `.github/workflows/`, `docker/`, `pyproject.toml`/`uv.lock`, `.env*`, `sets/`, наявні файли в `docs/ai-tasks/`. Не комічу.
