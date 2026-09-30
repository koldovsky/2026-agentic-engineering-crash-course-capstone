# Stabilize loops

`npm run loop:stabilize -- <spec> [--grep <title>]` runs one spec on stage with `--repeat-each=5`. When
a test fails, `claude -p` fixes the test code, and the loop runs the spec again. The loop stops on
`GREEN` or on a hard limit, and it never commits. Spec: `openspec/specs/stabilize-loop/spec.md`.

Each loop writes its report to this folder and adds a row below.

| Report | Spec | Stop reason | Runs | Attempts | Agent cost |
|---|---|---|---|---|---|
| [2026-09-30-activity-calendar.md](2026-09-30-activity-calendar.md) | `activity-calendar.spec.ts` | **NOT_REPRODUCED** | 1 | 0 | 0.00 USD |
| [2026-09-30-block-availability.md](2026-09-30-block-availability.md) | `block-availability.spec.ts` | **GREEN** | 3 | 2 | 2.96 USD |
