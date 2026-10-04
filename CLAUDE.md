# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Repository context

This is a fork of the fwdays **Crash Course: Agentic Engineering** capstone repo. The course files in the root (`README.md`, `RUBRIC.md`, `.github/`, `templates/`) are Ukrainian-language assignment material and must stay untouched. The student project (described in `AGENTS.md` and `docs/project/`) sits alongside them. `RUBRIC.md` defines how the project is judged: every Agentic Engineering practice claimed must have visible evidence (a file, commit, test, run or recording), so keep practices traceable in commits.

Project rules live in `AGENTS.md`, and work is done through skills in `.claude/skills/`. `AGENTS.md` is imported above and is the authoritative rule set. Documentation is in `docs/`. Status: **Draft**. `demo/` and `emulator/` (plain directories, no submodules) are not created yet; run `init-project`.

## Open decisions (do not assume an answer)

These are still undecided: API authentication, how a test selects the emulator scenario, and whether the emulator gets its own database. Ask the user rather than picking one. The local environment is HTTP only (ports 80 and 81).

**Decided:** the callback URL a remote service uses is sent to it - every module's request to its remote service carries a
`callback_url` field, the module's own callback endpoint (`http://demo.dev/<module-id>/v1/callback`). See `docs/architecture/flow.md` §1a.

**Decided:** the signature algorithm for a module whose remote service requires one - HMAC-SHA256 over the raw JSON
request body, sent as headers `X-Api-Key` (identifies the service) and `X-Signature` (the hex HMAC digest); the key
pair lives in `service.api_key` / `service.secret_key` (nullable - only signed modules set them, in their own
`RegisterService` migration), sourced from env vars, never committed as literal values. See `AGENTS.md` "Service
registration" and `docs/architecture/flow.md` §1b.

API and emulator share the database `demo`. Keep their migration histories (`migration`, `emulator_migration`) separate when configuring or running migrations.
