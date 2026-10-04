# Project rules — Prompt Manager API (FastAPI)

Trust level 1 ("Assistant"): propose, then wait for a human decision before changing more than one file or running anything that is not on the allow-list in `.claude/settings.json`.

## Commands (`uv` only — never bare `pip`)
- `uv run pytest` — tests (needs a reachable Postgres and `APP_CONFIG__ENV=test`; `tests/conftest.py` sets the env).
- `uv run ruff check app` · `uv run ruff format --check app` — lint and format check, exactly as CI runs them.
- `docker compose -f compose.test.yml up --build --abort-on-container-exit --exit-code-from api_test` — the full test run in Docker (what `tests_docker.yml` runs). Afterwards always `docker compose -f compose.test.yml down -v`.
- `docker compose -f compose.dev.yml up --watch` — dev server (waits for DB, migrates, seeds). Never start a second one.
- `uv run alembic upgrade head` — migrations, run from `./app`.
- `python scripts/agent_log_summary.py` — summary of `.agent-log/actions.jsonl`: what you actually did this session.

## Definition of done
- `ruff check`, `ruff format --check` and `pytest` are green; new behaviour has a test in `tests/` (`test_*.py`).
- Evidence, not claims: report the command you ran and its exit code / passed count.

## Stack rules that differ from what you may remember
- Everything is async: SQLAlchemy 2.0 `AsyncSession` and `asyncpg`; always `await` DB calls and never mix in sync sessions.
- Pydantic v2: access `model_fields` on the class, not the instance (the source of the one known test warning).
- `prompts`, `categories`, `tags` are JSON:API resources (`FastAPI-JSONAPI`, `app/api/v1/prompts.py`), not plain `APIRouter` routes. Auth comes from `FastAPI Users` (`app/auth/`).
- Schema changes need a new Alembic revision in `app/alembic/versions/`. Never edit an existing revision.
- Index names follow `naming_convention` in `db_config.py`, not skill defaults; do not add `created_at`/`updated_at` columns without asking.
- Settings: `APP_CONFIG__` prefix with nested keys, mode from `APP_CONFIG__ENV` (default `dev`). Add new settings under `app/config/components/`. In prod, secrets are read from `/run/secrets`.
- When unsure about a library API, read the installed source in `.venv/` or its docs before guessing.

## Conventions the linter does not enforce
- Imports are relative to `app/` (`pythonpath = . app`), e.g. `from config import settings`.
- Routers in `app/api/v1/` stay thin; logic goes to `app/services/`. Keep schemas in `app/schemas/` and models in `app/models/`.
- Seed data lives in two copies: `app/fakedata` (dev) and `tests/fakedata`. Change both when the data matters for tests.
- English code, comments and commit messages; reports and docs for the user in Ukrainian (technical terms stay in English).
- Conventional Commits (`feat:`, `fix:`, `chore:`), one logical change per commit. Do not commit unless asked.

## Known traps
- `LoggingConfig.log_level` / `log_format` are defined but never applied (no `basicConfig`/`dictConfig`); do not assume they change log output.
- `GET /api/v1/messages/` and `/secrets` return hardcoded demo data.
- README is partly wrong: login and logout are both listed as `POST /api/v1/auth/jwt/login`, while the real login route is `/api/v1/auth/login`. The docstring in `app/services/gemini.py` mentions `GEMINI_API_KEY`, but the code uses `APP_CONFIG__GEMINI__API_KEY`.

## Boundaries
- Ask before: adding a dependency (`uv add`, `pyproject.toml`), editing `pytest.ini`, `compose.*.yml`, `docker/`, `conf.d/`, `.github/workflows/`, `.claude/settings.json`, `.mcp.json`, or `app/alembic/env.py`.
- Never: touch `.env.dev*`, `.env.prod*`, `.env.test*`, `.env.agent*`, `.env.local*` or `sets/` (hook `.claude/hooks/protect_env.py` and `permissions.deny` block them; the hook does not cover Bash, so do not `cat` them either). `app/config/envs/.env.template` is safe to read.
- Never: delete tests or disable ruff rules to get green, `git push --force`, `rm -rf`. `git push` and package installs need confirmation.
- Never: edit existing files in `docs/ai-tasks/`; creating new reports and logs there is allowed.
- Hooks log every tool event to `.agent-log/actions.jsonl` (committed on purpose); check them with `python scripts/hooks_selftest.py`.
