---
name: phpstan
description: Run PHPStan static analysis on demo/ and/or emulator/ and act on its findings - a different check than design-review (types/reachability/nullability, not SOLID/DDD) and than the unit tests (static, not behavioural). Use after generating or hand-writing PHP code (generate-module, generate-emulator Part B, or any manual change) and before reporting it done; also use when asked to raise the configured level or add a baseline. Full background: docs/architecture/static-analysis.md.
---

# PHPStan

Static analysis, not a style/design check - that's `design-review`. Run both; they catch different things
(`docs/architecture/static-analysis.md` §5). Only the official docs are the source for PHPStan facts not already in
this skill or that page: https://phpstan.org/documentation - do not rely on memory for behaviour this skill doesn't
state.

## 1. Run

```bash
docker compose exec -w /app/demo php-cli vendor/bin/phpstan analyse
docker compose exec -w /app/emulator php-cli vendor/bin/phpstan analyse
```

`MSYS_NO_PATHCONV=1` prefix in Git Bash on Windows (`AGENTS.md` "Commands"). No path arguments - each app's
`phpstan.neon` already lists its own `paths`. Run both apps whenever a change touches both (e.g. a module's host and
emulated sides) or whenever reporting a module's generation done (`generate-module`, `generate-emulator` Part B).

## 2. Read the output

- **`[OK] No errors`**: clean - report it as one of the generation/review checks, same as the unit-test result.
- **Errors**: each one names a file, line, message and an `identifier` (e.g. `argument.type`, `missingType.iterableValue`).
  For every error:
  1. Decide if it is a real bug (wrong type passed, dead branch, missing null check) or a false positive from a type
     PHPStan can't trace (dynamic Yii2 config arrays, a curl stub losing a conditional return type through
     `curl_setopt_array`, business-logic invariants static types don't express - `docs/architecture/static-analysis.md`
     §3 has two concrete examples already identified in this project).
  2. **Real bug** → fix the code (not the config). Re-run to confirm.
  3. **False positive** → do not silence it with a blanket `ignoreErrors` regex in `phpstan.neon`. Prefer, in order:
     a narrowing check/assertion in the code itself (clearest, keeps the type information useful elsewhere too); a
     `/** @var Type $var */` cast right at the one line, with a comment why; only as a last resort, a scoped
     `ignoreErrors` entry (exact message pattern + `path`, never a bare pattern that could hide an unrelated future
     error of the same shape). Never raise or lower `level` to make a single finding disappear - level is a project-
     wide decision (§3 below).
- Never edit `vendor/` to silence something found there - PHPStan only analyses `paths`, so a `vendor/` finding means
  a third-party stub issue; report it instead of patching vendor code.

## 3. Changing the configured level

The committed `level` (currently 5 in both apps, `docs/architecture/static-analysis.md` §3) is a deliberate project
decision, not a default to bump casually:

1. Never raise it as a side effect of trying to fix one finding - that's a project-wide decision with its own blast
   radius (every file in `paths`, not just the one you're looking at).
2. If asked to raise it: run `vendor/bin/phpstan analyse --level <N>` first (read-only, does not touch `phpstan.neon`)
   to see the resulting error count and whether they're real bugs or false positives (§2). Report that before
   changing anything.
3. Only after that triage, with the user's go-ahead: fix every new real bug, then either fix or baseline (§4) the
   false positives, then update `phpstan.neon`'s `level` and `docs/architecture/static-analysis.md` §3's table/notes
   in the same change so the doc and the config never disagree.

## 4. Baseline

Only for a deliberate level raise that surfaces pre-existing issues needing a dedicated cleanup pass later
(`docs/architecture/static-analysis.md` §4) - never to merge code you know has errors, and never as a substitute for
fixing a finding you just introduced:

```bash
vendor/bin/phpstan analyse --generate-baseline
```

Writes `phpstan-baseline.neon` next to `phpstan.neon`; add `includes: [phpstan-baseline.neon]` to `phpstan.neon` if
it isn't already there. Not used yet in this project - both apps are clean at the committed level.

## Rules
- `phpstan.neon` lives at each app's root (`demo/phpstan.neon`, `emulator/phpstan.neon`); never create a second config
  file, never point `paths` at `vendor/`, `config/`, `migrations/`, or another module's files for a module-scoped run.
- A finding is fixed in the code, not suppressed, unless §2/§3 has walked through why it's a genuine false positive.
- Changing `level` or adding a baseline always comes with the matching update to
  `docs/architecture/static-analysis.md` §3/§4 in the same change - the doc is the record of *why* the level is what
  it is, not just a restatement of the config.
- No new Composer dependency beyond `phpstan/phpstan` itself (already installed in both apps) without the user's
  approval - including PHPStan extensions (e.g. a Yii2-specific one) found while reading the docs.
