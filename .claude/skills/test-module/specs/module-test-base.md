# Base test specification (every module)

| | |
|---|---|
| What it is | the fixed set of test categories every module's generated final test spec must cover - owned by `test-module`, not by `create-module` |
| Used by | `test-module` §3, when it builds `development/test/<name>/module_<name>.md` for a module before testing it |
| Source of the concrete rows | the module's own specs (`development/<name>/specs/module.service.yaml`, `module.service.md`) - this file defines the *categories*, the module specs supply the *values* (methods, statuses, error codes) that each category is expanded into |

## The five base categories

Every module, no exceptions, gets rows in all five categories. A module with only one remote-service method still
gets all five; a module with several methods gets the categories repeated per method.

1. **Init request tests** - `POST /<id>/v1/init`: the shared `BaseController` validation rules (missing/malformed
   top-level fields, duplicate `requestId`, wrong verb, unregistered service) plus one row per method's own
   `data`-shape success/failure.
2. **Callback request tests** - `POST /<id>/v1/callback`: the shared validation rules (missing/unknown process id,
   callback before init, wrong verb) plus one row per method's own callback-body shape.
3. **Status-change tests** - a process's status is actually observed to change over its real lifecycle (`init` →
   mapped status on the init response; mapped status on init → a different mapped status on a later callback), not
   just that one status gets set once - verifies the *transition*, not only the end value.
4. **One separated test per final status** - every value the module's `status_map` (response and callback) can
   produce, including `default_status` for an unmapped value, each gets its own dedicated row that drives the flow to
   that exact outcome and confirms it (API response, `process` record).
5. **One separated test per remote-service error response code** - every error class the module's remote-service
   client can observe (each HTTP status code `module.service.md` documents as a possible error response, plus
   timeout and malformed/empty body if the service spec calls them out), each gets its own dedicated row that
   triggers that specific condition and confirms the module's handling of it (`AGENTS.md`: a module failure throws →
   the host records `error` and answers 500 - the row's "expected result" is that contract, not an invented one).

## Row id convention (used by test-module §3)

`<CATEGORY>-<method>-<nn>` or `<CATEGORY>-<method>-<value>` where `<value>` is the concrete status or error code, so
a row is traceable to exactly what it tests without re-reading its prose:

- `INIT-<method>-01`, `INIT-<method>-02`, ...
- `CB-<method>-01`, `CB-<method>-02`, ...
- `STATUS-<method>-<from>-<to>` (e.g. `STATUS-service_1-process-success`)
- `FINAL-<method>-<status>` (e.g. `FINAL-service_1-fail`, `FINAL-service_1-default`)
- `ERRCODE-<method>-<code>` (e.g. `ERRCODE-service_1-500`, `ERRCODE-service_1-timeout`)

## What this file is not

It is not itself a test plan for any one module - it has no rows, no module name, nothing module-specific. It is the
fixed shape `test-module` §3 fills in from a given module's `module.service.yaml`/`module.service.md` to produce that
module's own `development/test/<name>/module_<name>.md`. Change this file only when the base categories themselves change
for every module, not to add a one-off case for a single module (that belongs in the generated file).
