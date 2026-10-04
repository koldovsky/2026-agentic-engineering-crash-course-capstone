---
paths:
  - "**/*.php"
---

# Rule: DDD with Yii2

Full text and example: `docs/architecture/ddd-yii2.md`. Yii2 is only the delivery/infrastructure mechanism; the domain and
application layers are plain PHP.

- Domain entities and value objects are plain PHP objects: never extend `ActiveRecord`, `Model`, `Component` or
  `BaseObject`; no behaviors or Yii events in them.
- ActiveRecord classes live only in `infrastructure/` and are persistence models (row DTOs / data mappers): no business
  logic, no status transitions, no remote calls. AR `rules()` = storage constraints only; invariants live in the domain.
- Repository interface in `domain/` (domain types only); implementation in `infrastructure/` with AR queries and an
  AR ↔ entity mapping. AR objects and `ActiveQuery` never leave the repository.
- Controllers are thin: request data → command → one application service → response. Application services never touch
  `Yii::$app->request`/`response` or throw `HttpException`.
- No `Yii::$app` (db, user, request, params, `get()`) and no `Yii::createObject()` in `domain/` or `application/`.
  Dependencies come through constructors from the DI container (`yii\di\Container`), bound in the module's `bootstrap()` (`demo/modules/<id>/Module.php`).
- Controllers get their application services through the constructor too:
  `__construct($id, $module, HandleCallback $handleCallback, $config = [])` then `parent::__construct($id, $module, $config)`.
  No `Yii::$container->get()` / `Yii::createObject()` in controller methods. Exception: the host's abstract `BaseController`
  gets `ProcessService` by action-parameter injection (module controllers keep their constructors free) - intended, keep it.
- Transactions, Yii events, logging, translations and the remote-service HTTP client are infrastructure, behind interfaces
  owned by domain/application.
- Check before finishing (both must print nothing; `<module>` = `demo/modules/<id>` or `emulator/modules/<id>`):
  `grep -rnE 'Yii::|use yii[\]|extends (ActiveRecord|Model|Component|BaseObject)|[\]infrastructure[\]' <module>/domain <module>/application`
  and `grep -rln "extends ActiveRecord" <module> | grep -v "/infrastructure/"`.
