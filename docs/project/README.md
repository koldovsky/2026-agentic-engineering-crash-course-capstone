# Project description

## What it is

A **REST API on Yii2 (PHP 8.3)** that lets clients start and follow processes on **external (remote) services** through one uniform
interface. Every request has the same body, `{"requestId", "service_method", "data"}`; the API records the process, hands the request
to the module of that service, and reports a process status that is the same for all services: `success`, `process` or `fail` (mapped from the service), or
`error` when the API's own processing failed; while the remote service has not answered yet, the process is `init`.

## Main ideas

- **Thin host, features as modules.** The API application only provides the shared flow (validation, the `process` table, CORS, routing
  of the two standard requests). Each remote service is a **Yii2 module inside the application** (`demo/modules/<id>/`, its
  emulated counterpart in `emulator/modules/<id>/`); all modules have the same architecture and the same two requests: **init** (send the request to the remote
  service) and **callback** (the service reports the result).
- **One status model.** Remote services use their own, sometimes complex statuses; every module maps them to `success` / `process` /
  `fail`; the API adds `error` when a module fails with an exception. A callback always updates the status when it brings a new
  one. Some services send callbacks, others return the final result in the response.
- **Testing with an emulator.** A second Yii2 application plays the remote services: it validates the module's request, stores its own
  process data, answers, and schedules the callbacks with a fixed 5-second delay via RabbitMQ instead of sending them
  inline (`docs/architecture/flow.md` §6a). Tests must cover every success, fail and error path.
- **Rules and skills.** Project rules live in `AGENTS.md`; work is done through skills in `.claude/skills/`.

## Parts

| Part | Where | Role |
|------|-------|------|
| API (host) | `demo/`, `http://demo.dev` | receives client requests and callbacks, keeps the `process` table |
| Emulator | `emulator/`, `http://emulator.dev:81` | emulates the remote services for tests |
| Modules | `demo/modules/<id>/` (API), `emulator/modules/<id>/` (emulated service) | one module per remote service, committed with the app |
| Environment | `compose.yaml`, `docker/` | nginx, php-fpm, php-cli, MySQL 8 |
| Docs | `docs/` | documentation |
| Skills | `.claude/skills/` | repeatable procedures: initialisation, YAML handling, Yii2 reference |

`demo/` and `emulator/` are plain directories of this repository, created by the skill `init-project`.

## Users

- **API clients** send init requests and read the process status.
- **Remote services** send callbacks.
- **Module developers** create a module and implement `doProcess()`, `getExternalId()`, `getCallbackStatus()`.

## Status

Draft. The environment and the initiation skills exist. Undecided: the API
authentication method, the signature algorithm for requests to services, how the emulator is told which scenario to play, and whether the
emulator gets its own database. See the open questions in [architecture](../architecture/README.md).

More: [architecture](../architecture/overview.md), [API](../api/README.md), [modules](../modules/README.md).
