---
name: solid-principles
description: SOLID (single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion) plus DRY, KISS, YAGNI, composition over inheritance and the Law of Demeter, applied to PHP 8.3 / Yii2 code of this project - rules, violation symptoms, fixes and a checklist. Use before writing or refactoring any PHP class, and when reviewing code design.
---

# SOLID and supporting principles (PHP / Yii2)

Project rules: `docs/architecture/code-design.md` §2 (source of truth; keep this skill consistent with it). Yii2 facts come
from the `yii2-*` skills, not from memory.

## Rules with PHP shape

### S - Single responsibility
One reason to change per class. In this project the usual split of a module feature is:
controller (HTTP ↔ command) · use case (workflow) · domain object (rules) · repository (persistence) · remote client
(service HTTP) · status mapper (remote status → `success|process|fail`).
- Smell: a method that validates, calls the remote service, maps statuses and saves; a class name with "And"/"Manager"/"Helper".
- Don't over-split: two methods that always change together stay together (KISS).

### O - Open/closed
Add behaviour with new classes, not by growing branches.
```php
interface ServiceMethodHandler
{
    public function supports(ServiceMethod $method): bool;
    public function init(InitCommand $command): InitResult;
}
// a new service method = a new handler class + one DI registration; no existing class edited
```
- Smell: `switch ($serviceMethod)` or `if ($remoteStatus === ...)` chains that grow with every requirement.
- A fixed lookup table (e.g. a status map array in one mapper class) is fine - data, not branches.

### L - Liskov substitution
Implementations keep the contract of their interface/parent: same accepted input (or wider), same result types and value
sets, no new exceptions for "unsupported" operations.
- The module controller must return only what `BaseController` expects (`getCallbackStatus()` → `success|process|fail`).
- Smell: `throw new NotSupportedException()` in an implementation, `instanceof` checks on the caller side.

### I - Interface segregation
Interfaces shaped by the client that uses them, a few methods each.
- Smell: empty method bodies to satisfy an interface; one interface for read + write + remote calls.
- Fix: `ProcessRepository` (domain needs) separate from a read-model query; `RemoteServiceClient` separate from `StatusMapper`.

### D - Dependency inversion
High-level code (domain, application) owns interfaces; low-level code (ActiveRecord, HTTP client) implements them.
```php
final class InitPayment                       // application layer
{
    public function __construct(
        private readonly PaymentGateway $gateway,        // interface in domain/application
        private readonly PaymentRepository $payments,    // interface in domain
    ) {}
}
// Module::bootstrap() (composition root) binds interfaces to implementations in the Yii DI container
// (see yii2-fundamentals: container set()/setSingleton()).
```
- Smell: `new SomeClient()`, `SomeRecord::find()`, `Yii::$app->...` inside domain or application code; untestable without DB/network.
- Constructor injection only; no service locator calls in domain/application code.

## Supporting principles
- **DRY** - each piece of knowledge in one place (one status map per service method, one place that builds the remote
  request). Do not merge look-alike code that changes for different reasons.
- **KISS** - the most direct code that meets the requirement; plain loops/conditionals over clever chains; no abstraction
  without a second use or a test need.
- **YAGNI** - only what the current task needs; no options, parameters, hooks, events or generic layers "for later".
- **Composition over inheritance** - reuse via injected collaborators; inheritance only for a real "is-a"
  (`V1Controller extends BaseController`, required by the project). Max one project-level parent class; prefer `final`.
- **Law of Demeter** - call methods of `$this`, parameters, injected dependencies and objects you create; no
  `$a->getB()->getC()->do()`. Move the behaviour to the object that owns the data ("tell, don't ask").

## PHP 8.3 conventions that support the principles
- `declare(strict_types=1);`, typed properties/parameters/returns, `final` classes by default, `readonly` for value objects
  and injected dependencies, backed `enum` for closed value sets (Status), constructor promotion.
- Small public surface: private by default; no public setters on domain objects.
- Exceptions: specific domain exception classes; HTTP exceptions only in controllers (AGENTS.md rule 5).
- PSR-12 / Yii2 coding standard (AGENTS.md "Code style").

## Checklist (use when writing and when reviewing)
- [ ] Each class has one reason to change; its name says what it does in the ubiquitous language.
- [ ] Adding the next service method / remote status needs a new class or a data entry, not a new branch in existing code.
- [ ] Every implementation fully honours its interface/parent contract; no "not supported" throws, no out-of-contract values.
- [ ] Interfaces are small and client-shaped; no empty implementations.
- [ ] Domain/application code depends only on interfaces and value objects; dependencies come through the constructor;
      no `new` of infrastructure, no `Yii::$app`, no ActiveRecord there.
- [ ] No duplicated knowledge; no premature merging of look-alike code.
- [ ] Nothing speculative (YAGNI); the simplest structure that passes the tests (KISS).
- [ ] Composition used for reuse; inheritance only for true "is-a".
- [ ] No call chains through other objects' internals.
