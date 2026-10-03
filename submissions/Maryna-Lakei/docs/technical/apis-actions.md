# APIs and actions

There is no REST route and no `app/api` directory. The only product entry from the browser is one Next.js server action. The only outbound product call is OpenAI Chat Completions. See [workflows](workflows.md) and [integrations](integrations.md).

## Server action

| | |
| --- | --- |
| Name | `generateFromRequest` |
| File | `lib/requirements/actions.ts` (`"use server"`) |
| Caller | `app/request-intake-form.tsx` |
| Argument | `rawRequest: string` |
| Returns | `GenerationResult` from `lib/requirements/generate.ts` |
| Throws to the caller | The action catches and returns `{ ok: false, reason: "provider-error" }` |

The form also catches. A throw there becomes the same reason and the same sentence (`app/request-intake-form.tsx`, `lib/requirements/generation-failure.ts`).

The browser does not call this action when validation fails. See [data model](data-model.md).

## Live completion

`requestOpenAiCompletion` in `lib/requirements/openai-client.ts`.

| | |
| --- | --- |
| URL | `https://api.openai.com/v1/chat/completions` |
| Method | `POST` |
| Auth | `Authorization: Bearer` plus the server key. The key is an argument, not a logged field |
| Body | `model`, `stream: false`, `response_format: { type: "json_object" }`, one system message, one user message |
| Model | `LLM_MODEL` trimmed, or `gpt-4.1-mini` when that variable is missing or blank |
| Cache | `cache: "no-store"` |
| Cancel | The `AbortSignal` from `generateRequirements` |

`stream` is false (BC-5, [ADR-0003](../adr/ADR-0003-openai-requirement-generation.md)). There is no retry in this module.

A non-OK HTTP status throws `provider-error`. A body without `choices[0].message.content` as a string, or content that is not JSON, becomes `null`, and the parser returns `invalid-payload`.

The system prompt requires one JSON object with `userStory`, `acceptanceCriteria` (1 to 8 short lines), and `clarifyingQuestions` (3 to 5 questions, each with a question mark). The parser in `lib/requirements/parse-generation.ts` is the gate that decides what the page shows.

## Deadline

`generateRequirements` races the client against `GENERATION_DEADLINE_MS` (30000). On abort the reason is `timeout`. In fake mode only, `REQUIREMENTS_FAKE_DEADLINE_MS` may shorten that race when it is a positive base-10 integer (`lib/requirements/generate.ts`). Production leaves fake mode unset, so the 30-second bound is the one that applies (NFR-4).

## What the action does not do

It does not create a user, write a row, send email, accept a payment, or stream tokens. A second click while the first call is in flight is ignored in the form (`inFlightRef`). That is a UI guard, not a server quota.

## How to see a call without a key

Set `REQUIREMENTS_MODEL_MODE=fake` and leave `LLM_API_KEY` empty. Playwright does this (`playwright.config.ts`). The fake client never calls `fetch`. The integration test rejects `fetch` if something tries ([tests/cross-slice.integration.test.ts](../../tests/cross-slice.integration.test.ts)). Do not point production at fake mode ([operations](operations.md)).
