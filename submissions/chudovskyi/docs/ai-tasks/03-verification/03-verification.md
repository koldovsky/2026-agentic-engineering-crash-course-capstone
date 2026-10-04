Ти в чужому репозиторії - chudovskyi.  
Корінь репозиторію - chudovskyi.

Перш ніж змінювати щось, дай план (CLAUDE.md: plan mode) і зупинись. 
Після мого «ок» дозволено: 
 - додати скрипт check (Makefile або scripts/check.sh), що послідовно виконує uv run ruff check app, uv run ruff format --check app, uv run pytest; 
 - додати app/services/health.py з build_health(service_name, started_at) (status ok, uptime у секундах, ValueError на порожню назву); 
 - додати tests/test_service_health.py як мінімум з 3 тестами. 

Не додавай залежностей, не чіпай pytest.ini, .github/workflows/, compose.*.yml. 
Готово, коли check дає exit 0; у звіті наведи команду, exit code і кількість passed. 

Збережи погоджений План: YYYY-MM-DD_HH-MM_plan_of_verification.md у цій теці, поряд, де знаходиться цей файл.
Збережи Звіт українською: YYYY-MM-DD_HH-MM_report_of_verification.md у цій теці, поряд, де знаходиться цей файл.
