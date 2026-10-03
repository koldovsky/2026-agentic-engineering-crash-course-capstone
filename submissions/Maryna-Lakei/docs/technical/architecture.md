# Architecture

One public desktop page. A Business Analyst types a raw business request and clicks Generate. The server asks OpenAI once. The page shows a User Story, Acceptance Criteria, and Clarifying Questions.

Decisions: [ADR-0001](../adr/ADR-0001-minimal-next-llm-stack.md) (stack), [ADR-0002](../adr/ADR-0002-context-architecture.md) (agent context budget, not the runtime), [ADR-0003](../adr/ADR-0003-openai-requirement-generation.md) (model). Requirements: [docs/requirements.md](../requirements.md). Plan: [docs/mvp-capability-plan.md](../mvp-capability-plan.md).

## Runtime

```text
Browser
  app/page.tsx                         server component, route /
  app/request-intake-form.tsx         client form
    -> lib/requirements/actions.ts     generateFromRequest ("use server")
      -> lib/requirements/generate.ts  deadline, fake mode, or live client
        -> lib/requirements/openai-client.ts   live Chat Completions only
      -> lib/requirements/parse-generation.ts
    -> lib/requirements/result-review.ts       replace stored result on success
    -> lib/requirements/generation-failure.ts  one failure sentence
```

Validation runs in the browser first (`lib/requirements/validation.ts`) and again inside `generateRequirements` before any client is chosen.

## Stack

| Piece | Where |
| --- | --- |
| Next.js 16.3.8 App Router, React 19.2.8 | `package.json` |
| Only page | `app/page.tsx`. No `app/api`, no `middleware.ts` |
| Tailwind CSS 4 | `postcss.config.mjs`, `app/globals.css` |
| Fonts | `app/layout.tsx` loads Geist variables. `app/globals.css` sets the body font to Arial |
| Dev host allow-list and Turbopack root | `next.config.ts` (`allowedDevOrigins: ["127.0.0.1"]`, root is this folder) |
| Node | `package.json` `engines.node` `>=20`. The project CI copy uses Node 22 (`.github/workflows/ci.yml`) |

Factory defaults Postgres, Drizzle, Better Auth, and Resend are absent (TC-7, ADR-0001). There is no `db/` directory.

## What is stored

The form keeps the request, the validation message, an in-flight flag, the last successful result, and a failure reason in React state (`app/request-intake-form.tsx`). A reload drops that state. No module under `app/` or `lib/requirements/` writes a database, file, or `localStorage`.

The API key is read from `LLM_API_KEY` on the server (`lib/requirements/generate.ts`). `lib/requirements/openai-client.ts` imports `server-only`. The action return type is `GenerationResult` and does not include the key (`lib/requirements/actions.ts`).

## Two generation modes

| Mode | Switch | Where it runs |
| --- | --- | --- |
| Fake | `REQUIREMENTS_MODEL_MODE=fake` | Unit tests, `tests/cross-slice.integration.test.ts`, Playwright (`playwright.config.ts`). Not production |
| Live | That variable unset, and a non-empty `LLM_API_KEY` | Vercel Production. See [operations](operations.md) and [docs/qa/deploy-verification.json](../qa/deploy-verification.json) |

Fake mode recognizes `[[provider-error]]` and `[[timeout]]` inside the request text (`lib/requirements/generate.ts`). Those markers are not a live-provider feature. The supplemental live note says the failure sentence is not sent to OpenAI ([docs/qa/2026-10-02-live-openai-eval.md](../qa/2026-10-02-live-openai-eval.md)).

## Out of scope

No accounts, history, Jira, upload, workspaces, payments, or a mobile app (BC-2). No in-page editor, copy button, separate Regenerate control, streaming, dark theme, or quota (BC-5). Spec: [openspec/specs/public-demo/spec.md](../../openspec/specs/public-demo/spec.md).

## Related

[Data model](data-model.md) · [Access](auth-access.md) · [Workflows](workflows.md) · [Actions](apis-actions.md) · [Integrations](integrations.md) · [Operations](operations.md) · [Testing](testing.md)
