---
name: yii2-guide-lookup
description: Maps Yii2 topics to pages of the official online guide (Yii 2, guide 22.0). Use when a Yii2 fact is not covered by the other yii2-* skills - fetch the page instead of relying on memory.
---

# Yii2 guide lookup

The only accepted source for Yii2 framework facts in this project is the official guide:
`https://www.yiiframework.com/doc/guide/22.0/en` (page URL = base + `/<page>`). Fetch the page (WebFetch) when a
detail is missing from the `yii2-*` skills. Scope: base framework functionality and RESTful web services.

| Topic | Page |
|-------|------|
| REST quick start | `rest-quick-start` |
| REST resources, fields, links, collections | `rest-resources` |
| REST controllers, filters, CORS, actions, checkAccess | `rest-controllers` |
| REST filtering collections (DataFilter) | `rest-filtering-collections` |
| REST routing (UrlRule) | `rest-routing` |
| REST response formatting | `rest-response-formatting` |
| REST authentication | `rest-authentication` |
| REST rate limiting | `rest-rate-limiting` |
| REST versioning | `rest-versioning` |
| REST error handling | `rest-error-handling` |
| Application structure, applications, components | `structure-overview`, `structure-applications`, `structure-application-components` |
| Entry scripts | `structure-entry-scripts` |
| Controllers, models, filters | `structure-controllers`, `structure-models`, `structure-filters` |
| Modules, extensions | `structure-modules`, `structure-extensions` |
| Bootstrapping, routing, requests, responses | `runtime-bootstrapping`, `runtime-routing`, `runtime-requests`, `runtime-responses` |
| Errors, logging, sessions/cookies | `runtime-handling-errors`, `runtime-logging`, `runtime-sessions-cookies` |
| Components, properties, events, behaviors | `concept-components`, `concept-properties`, `concept-events`, `concept-behaviors` |
| Configurations, aliases, autoloading | `concept-configurations`, `concept-aliases`, `concept-autoloading` |
| Service locator, DI container | `concept-service-locator`, `concept-di-container` |
| DAO, Query Builder, Active Record, migrations | `db-dao`, `db-query-builder`, `db-active-record`, `db-migrations` |
| Validation, core validators | `input-validation`, `tutorial-core-validators` |
| Data providers, pagination, sorting, formatting | `output-data-providers`, `output-pagination`, `output-sorting`, `output-formatting` |
| Security | `security-overview`, `security-authentication`, `security-authorization`, `security-passwords`, `security-cryptography`, `security-best-practices` |
| Caching | `caching-overview`, `caching-data`, `caching-http` |
| Console commands | `tutorial-console` |
| Testing | `test-overview`, `test-environment-setup`, `test-unit`, `test-functional`, `test-fixtures` |
| Docker, performance | `tutorial-docker`, `tutorial-performance-tuning` |
| Helpers | `helper-overview`, `helper-array`, `helper-json`, `helper-url` |

Rules: cite the page you used; if the guide does not state something, say so instead of inventing behaviour.
Do not use views/widgets/assets/theming/forms pages — this project is a REST API.
