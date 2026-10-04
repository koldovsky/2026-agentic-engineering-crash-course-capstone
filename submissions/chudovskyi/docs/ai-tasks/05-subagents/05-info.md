Ти в чужому репозиторії - chudovskyi.
Корінь репозиторію - chudovskyi.

Додай GET /api/v1/info: тонкий handler app/api/v1/info.py (APIRouter, префікс полем info в ApiV1PrefixConfig, 
підключення в app/api/v1/__init__.py, без current_active_user), 
який повертає build_info(...) з app/services/info.py 
через response_model InfoRead (app/schemas/info.py): status "ok", 
service = settings.project.title, version = settings.project.version, 
uptime_seconds. build_info(service_name, version,  version API, started_at, now) — чиста функція, порожня назва сервісу → ValueError. 

Тести tests/test_service_info.py і tests/test_router_info.py (фікстура ac, 200 без auth_headers) пишеш ПЕРШИМИ і показуєш, що вони червоні, потім реалізуєш. 

Додай маршрут в README → «Basic API Endpoints (v1)». 

Готово, коли uv run ruff check app, uv run ruff format --check app, docker build -f docker/Dockerfile.test зелені.                                                           
  
Не додавай залежностей, не чіпай pytest.ini, .github/workflows/, compose.*.yml, docker/, .env*. 
Розбіжність версій settings.project.version (1.0.0) і pyproject.toml (0.1.0) не виправляй, лише зафіксуй у звіті YYYY-MM-DD_HH-MM_report_of_info.md

Збережи Звіт українською: YYYY-MM-DD_HH-MM_report_of_info.md у цій теці, поряд, де знаходиться цей файл.

Для виконання цього завдання є наступні чотири агенти у .claude/agents:
- orchestrator (opus);
- worker (sonnet, працює в окремому worktree, редагування обмежує хук);
- checker (opus, лише читає: Edit/Write заборонено);
- test-runner (haiku, процедура з 01-testing.md).
Також:
- файл з хуком scripts/worker_guard.py
- файл .claude/settings.local.json задає worktree.baseRef: "head", щоб worktree workers відгалужувалися від гілки з контрактом, а не від main.
- У .gitignore додано .claude/worktrees/. 
- погоджений план збережено як docs/ai-tasks/041-info/2026-10-03_18-57_plan_of_info.md.

