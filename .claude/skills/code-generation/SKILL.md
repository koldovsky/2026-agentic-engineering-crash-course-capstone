---
name: code-generation
description: Procedure for generating or changing PHP code in this project by the project's code-design rules - model the domain (ddd-architecture), place classes in layers, write them by SOLID (solid-principles), test them, and self-check with both checklists before reporting. Use whenever you write new classes or features for a module, the host or the emulator.
---

# Code generation

Rules: `docs/architecture/code-design.md`. This skill is the procedure; the rules and checklists live in the skills
**`ddd-architecture`** and **`solid-principles`** - load both before step 2. Yii2 facts come from the `yii2-*` skills
(load the matching one before writing Yii code; `yii2-guide-lookup` for anything missing). `AGENTS.md` rules always apply.

## 1. Understand the task
- Which code: module (`demo/modules/<id>/`, DDD layers; its emulated service in `emulator/modules/<id>/`), host `demo/` (thin: process tracking + `BaseController`) or emulator `emulator/` (`EmulatorProcess`, more when a service gets real logic).
- Which workflow: a service method's init, a callback, a new status, a new table, a refactoring.
- Collect the facts you need (remote request/response fields, remote statuses and their meaning, callback or not). Missing
  facts are **asked**, not invented. The open decisions in CLAUDE.md (authentication, signature, emulator scenario, callback
  URL, emulator database) are never decided by you.

## 2. Design (short, shown to the user before writing)
Follow `ddd-architecture` §1 and §5: bounded context, glossary additions, classes per layer with one-line responsibilities,
aggregate + invariants + repository, anti-corruption layer (field and status mapping), open questions.
For the host or a small change: list the classes and their single responsibilities only (KISS).
Wait for the user's go-ahead if the design adds a new aggregate, a new layer, a new dependency (Composer package) or changes
the module architecture; otherwise continue.

## 3. Write the code - inside out
1. **Domain**: value objects, `Status` enum, entities/aggregates with their invariants, repository and client interfaces,
   domain exceptions. Pure PHP.
2. **Application**: one use case per workflow, command/result objects; dependencies through constructor interfaces.
3. **Infrastructure**: ActiveRecord classes + repository implementations (mapping AR ↔ domain), remote client
   (anti-corruption layer), status mappers; migrations by AGENTS.md rule 7 and the `yii2-migrations` skill.
4. **Controllers**: `V1Controller` implements only `doProcess()`, `getExternalId()`, `getCallbackStatus()` and delegates
   (`ddd-architecture` §4).
5. **Module** (`Module.php`): `bootstrap()` adds the URL rules and the DI bindings interface → implementation (composition
   root); register the module in `config/web.php` (`modules`, `bootstrap`) and its migration namespace in `config/console.php`.
Conventions: `declare(strict_types=1)`, `final`, `readonly`, typed everything, PSR-12, comments only for non-obvious "why",
no speculative code (YAGNI).

## 4. Tests
- Domain unit tests; application unit tests with in-memory fakes of repository/client interfaces.
- Functional tests through the API against the emulator for every success, fail and error path of the workflow.
- Run: `MSYS_NO_PATHCONV=1 docker compose exec -w /app/<app or module dir> php-cli vendor/bin/phpunit` and fix until green.
  Report the real output; never claim green without a run.

## 5. Self-check (maker)
Go through both checklists - `solid-principles` "Checklist" and the dependency-rule table of `ddd-architecture` §2 - for
every new or changed class, and fix what fails. Quick mechanical checks (`<module>` = `demo/modules/<id>` or `emulator/modules/<id>`):
```bash
# domain/application must not use Yii, ActiveRecord or infrastructure
grep -rnE 'Yii::|use yii[\]|extends (ActiveRecord|Model|Component|BaseObject)|[\]infrastructure[\]' <module>/domain <module>/application
# ActiveRecord only in infrastructure/
grep -rln "extends ActiveRecord" <module> | grep -v "/infrastructure/"
# controllers use application services, not infrastructure classes
grep -rn '[\]infrastructure[\]' <module>/controllers
```

## 6. Independent review (checker)
Run the **`design-review`** skill on the changed files in a separate pass (ideally a subagent that did not write the code).
Fix the errors it reports, or explain to the user why a finding is accepted.

## 7. Report
Files per layer, the design decisions and the reasons, the test command and its output, the review verdict with what was
fixed, and the open questions.
