---
paths:
  - "app/Services/**/*.php"
---

# Service layer (layered architecture)

The app follows a layered architecture. Dependencies point strictly downward:

```
HTTP (Controllers, FormRequests, Resources)  →  Services  →  Repositories  →  Models (Eloquent)
```

`app/Services` is the **business-logic layer**. Code here:

- **Must not touch HTTP.** No `Request`, `request()`, `response()`, `redirect()`, `session()`, `abort()`, or returning `JsonResponse`/views. Accept plain typed arguments or DTOs; return domain objects, DTOs, or scalars. Validation of user input belongs in FormRequests, before the service is called.
- **Must not query the database directly.** No `DB::` facade, query builder, or `Model::query()/where()/create()` calls — go through a repository in `app/Repositories` (inject its interface from `app/Repositories/Contracts`, bound in a service provider). Operating on an already-loaded model instance (reading attributes, calling domain methods on it) is fine.
- **Must not depend on controllers or on other layers above it.** A service may call other services and repositories only.
- **Owns transactions and orchestration.** Multi-step writes are wrapped in `DB::transaction()` here (the one allowed `DB::` use), and domain events/jobs are dispatched from here, not from controllers or repositories.
- **Signals failures with domain exceptions** (`app/Exceptions/...`), never HTTP status codes; mapping exceptions to responses is the HTTP layer's job.
- **Uses constructor injection** of dependencies (`private readonly`), no `app()`/`resolve()` service location and no static facades other than `DB::transaction`, `Event`, `Bus`/`Queue`.
- **One service = one cohesive area** (e.g. `OrderService`, `Billing/InvoiceService`); split it when it grows unrelated responsibilities.

When adding a service, also add or extend unit tests in `tests/Unit/Services` that mock the repository interfaces.
