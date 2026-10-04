# Project documentation

Yii2 REST API. The host application (`demo/`) is thin; features ship as Yii2 modules inside the application (`demo/modules/<id>/`, emulated in `emulator/modules/<id>/`).

| Document | Content | Status |
|----------|---------|--------|
| [project/](project/README.md) | brief project description: purpose, main ideas, parts, status | Draft |
| [architecture/](architecture/README.md) | architecture overview, technical info (Docker, hosts, database), flow (requests, statuses), code design (SOLID, DDD), static analysis (PHPStan) | Draft |
| [api/](api/README.md) | main (host) API: base URL, conventions, authentication, errors, endpoint list | Draft (to be completed) |
| [modules/](modules/README.md) | modules inside the applications (`demo/modules/`, `emulator/modules/`): id, layout, registration, lifecycle, list | Draft (to be completed) |

Related sources of truth (not duplicated here):
- `AGENTS.md` / `CLAUDE.md` — rules for AI agents.
- Yii2 facts: the official guide, https://www.yiiframework.com/doc/guide/22.0/en

Sections marked **TODO** are placeholders to be filled in as the project grows.
