---
name: design-review
description: Read-only review of PHP code (a module, the host or the emulator, or a diff) against the project's code-design rules - SOLID and supporting principles, DDD layers and the dependency rule, building blocks, the BaseController boundary, ubiquitous language, tests - reporting findings with severity and location without changing code. Use after code is generated or changed, as the separate checker pass (maker != checker).
---

# Design review

Read-only. Output is a findings report; you do not edit files. Rules: `docs/architecture/code-design.md`, the checklists of
**`solid-principles`** and **`ddd-architecture`**, and `AGENTS.md` ("Module architecture", "Code style"). Review what is in the
code, not what the author says it does.

## 1. Scope
- Target: the files/diff the user or the calling skill named; otherwise `git diff` of the working tree (modules are in
  `demo/modules/<id>/` and `emulator/modules/<id>/`).
- Decide the kind: module (DDD layers apply), host (thin, SOLID only), emulator (SOLID; layers only if it has real logic).
- Read every file in scope completely, plus the interfaces and callers they depend on.

## 2. Checks

### A. Dependency rule (error) - modules
- `domain/` uses only PHP and other domain classes: no `yii\`, `Yii::`, ActiveRecord, HTTP, `application`, `infrastructure`.
- `application/` uses only `domain`: no Yii, ActiveRecord, infrastructure.
- Controllers do not use the module's ActiveRecord or remote client directly; `Process`/`Yii::$app` go no deeper than the controller.
- Only `Module::bootstrap()` and infrastructure instantiate infrastructure classes.
- Yii2 specifics (`docs/architecture/ddd-yii2.md`): no entity/value object extends `ActiveRecord`/`Model`/`Component`/
  `BaseObject`; ActiveRecord only in `infrastructure/`, without business logic; repositories never return AR or `ActiveQuery`;
  application services never touch request/response or throw `HttpException`; no `Yii::$app`/`Yii::createObject()` in
  domain/application; controllers receive use cases through the constructor (`$id, $module, <deps>, $config = []` and
  `parent::__construct($id, $module, $config)`), not via `Yii::$container->get()` / `Yii::createObject()` in methods.
Mechanical aid (all must print nothing; `<module>` = `demo/modules/<id>` or `emulator/modules/<id>`):
```bash
grep -rnE 'Yii::|use yii[\]|extends (ActiveRecord|Model|Component|BaseObject)|[\]infrastructure[\]' <module>/domain <module>/application
grep -rln "extends ActiveRecord" <module> | grep -v "/infrastructure/"
grep -rn '[\]infrastructure[\]' <module>/controllers
```

### B. SOLID (error / warning)
- S: classes with more than one reason to change (HTTP + rules + persistence + remote calls mixed).
- O: branches that grow per service method / remote status instead of new classes or a data map.
- L: implementations that break their contract (throws for "unsupported", out-of-contract values such as a status outside
  `success|process|fail`; a module never returns `error`, and a transition is never refused just because the current status
  is final).
- I: fat interfaces, empty implementations.
- D: `new` of low-level classes, static AR calls or service-locator calls in high-level code; missing constructor injection.

### C. Supporting principles (warning)
Duplicated knowledge (DRY); needless abstraction or cleverness (KISS); speculative code, unused options/events/layers (YAGNI);
inheritance for reuse or deep hierarchies (composition); call chains through other objects (Law of Demeter).

### D. DDD building blocks (error / warning)
- Value objects immutable and self-validating; raw strings/arrays used where a value object exists.
- Entities protect invariants through behaviour methods; no public setters; anemic entities (warning).
- Aggregates: outside references only to the root; one repository per aggregate; no transaction across aggregates.
- Repositories return domain objects, never ActiveRecord.
- Anti-corruption layer: remote-service field names or payload arrays inside domain/application (error); remote statuses
  mapped in one place per service method; unknown remote statuses handled explicitly.
- Domain events / factories only with a current consumer / need (YAGNI).

### E. Contract and project rules (error)
- `V1Controller` implements only `doProcess()`, `getExternalId()`, `getCallbackStatus()`; no `behaviors()`/`verbs()` overrides,
  no `actionInit()`/`actionCallback()` (AGENTS.md rule 3); returns contract types/values.
- AGENTS.md module rules: bootstrap URL rules, migrations (rule 7), no hard-coded module id or `Yii::$db` (rule 6),
  resources never expose secrets (rule 4). Nothing decided that CLAUDE.md lists as open.
- `Module::bootstrap()`'s URL rules are **verb-agnostic** `yii\rest\UrlRule` `extraPatterns` (`'<path>' => '<action>'`,
  never `'POST <path>' => ...`) - a verb-restricted pattern 404s a wrong verb and an `OPTIONS` preflight alike instead
  of the controller's own `VerbFilter` (from `verbs()`) answering `405`/CORS correctly (found live, not by reading
  the code alone - check by actually requesting a non-configured verb and `OPTIONS`, not just reading the pattern).

### F. Language and style (warning)
Names follow the ubiquitous language (`code-design.md` §3 and the module glossary); one name per concept. `strict_types`,
`final`, `readonly`, types, PSR-12; comments explain "why" only.

### G. Tests (warning; error if missing for new behaviour)
Domain/application unit tests with fakes; functional tests against the emulator for every success, fail and error path;
tests actually run (ask for or run `vendor/bin/phpunit` read-only if the environment is up).

## 3. Report
1. **Verdict**: `ok` / `ok with warnings` / `changes needed`, with counts.
2. **Findings**, most severe first:

   | # | Severity | File:line | Rule (e.g. D-DIP, DDD-dependency) | Finding | Suggested fix |
   |---|----------|-----------|------------------------------------|---------|---------------|
3. **Passed**: the check groups A-G with no findings.
4. **Not checked**: anything you could not verify (e.g. tests not run).
A review that finds nothing says so plainly. Do not edit files; hand fixes back to the author (`code-generation`).
