# 0005. .NET Aspire AppHost for one-command launch; the Api serves the SPA

- Status: accepted · Date: 2026-09-27 · Decided by: human

## Context
MVP-1 must start with one command. A native PostgreSQL 13 service already runs on port 5432 on the dev
machine and must not be touched.

## Decision
- `BOMKeeper.AppHost` runs `postgres:17` in Docker (`AddPostgres("pg").WithDataVolume("bomkeeper-data")
  .AddDatabase("bomkeeper")`) and the Api with `.WithReference(db).WaitFor(db)`. The connection string
  is injected, so no ports or passwords are managed by hand.
- The Angular build goes into the Api `wwwroot/`. The Api uses `UseStaticFiles()` +
  `MapFallbackToFile("index.html")`, with `/api/**` excluded.
- Migrations are applied at startup in Development.
- `npm run start` = `dotnet run --project backend/src/BOMKeeper.AppHost`.

## Consequences
- The UI and API share one URL, plus the Aspire dashboard (telemetry, logs).
- Docker Desktop becomes a hard prerequisite for run, integration tests and e2e. The scripts check for
  it upfront.
