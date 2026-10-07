# Contributing

## Scope

Contributions improve the public evidence package and synthetic reference controls, not the private application. Do not add proprietary implementation, reconstructed patches, real operational data or internal architecture details. Public fixture/analyzer changes require matching tests and traceability.

## Workflow

1. Read `AGENTS.md`, `docs/specification.md`, and `docs/security-and-sanitization.md`.
2. Make one bounded change.
3. Update traceability when a requirement, risk, decision, or evidence item changes.
4. Run `bash scripts/verify-package.sh`.
5. Run `bash scripts/self-test-gates.sh` after changing checker logic.
6. Review every changed image manually.
7. Use an imperative commit message, for example `Add synthetic dashboard evidence`.

## Pull Requests

Describe the intent, changed artifacts, evidence, privacy impact, and known limitations. A reviewer must be able to trace every new claim to a public artifact or to clearly labeled historical evidence.

## Definition of Done

- All strict quality gates pass.
- No unresolved placeholder remains.
- No private domain marker or sensitive value is present.
- Evidence hashes match.
- Documentation, screenshots, and PR description agree.
- A human has reviewed visual and audio media end to end.
