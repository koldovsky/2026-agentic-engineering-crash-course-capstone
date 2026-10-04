# Architecture

Yii2 REST API that works with external (remote) services through modules. The environment runs in Docker Compose.

| Document | Content |
|----------|---------|
| [overview.md](overview.md) | brief architecture description: building blocks, host and modules, request flow, data, organisation, key decisions |
| [technical.md](technical.md) | technical info: repository layout, Docker services, hosts, applications, database, configuration |
| [flow.md](flow.md) | flow info: request structure, init process, callback, process table, emulator flow, test scenarios |
| [code-design.md](code-design.md) | code design rules: SOLID and supporting principles, ubiquitous language, DDD layers and building blocks of a module, tests |
| [ddd-yii2.md](ddd-yii2.md) | DDD with Yii2: ActiveRecord only as persistence model, repositories, thin controllers, application services, DI instead of `Yii::$app` |
| [static-analysis.md](static-analysis.md) | PHPStan: setup, how to run it, the configured level and why, baseline, how it relates to `design-review` and the unit tests |

Rule: **technical** facts (what runs where, how it is configured) go to `technical.md`; **flow** facts (what happens
to a request, statuses, sequences) go to `flow.md`. Do not mix them.

Related: [api](../api/README.md), [modules](../modules/README.md).
