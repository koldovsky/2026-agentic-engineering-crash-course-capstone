# ADR-0003: OpenAI gpt-4.1-mini for requirement generation

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** delivery orchestrator, under the approved capability plan

## Context

`add-requirement-generation` is the first slice that calls a model (TC-2). The baseline spec forbids naming a vendor inside the requirement text. The capability plan says the provider and model are chosen here and recorded in an ADR. The API key stays in server environment variables and is never written into source or Git (TC-2). Unit and browser tests use a fake model. A live call is not the test path.

## Decision

The live Generate path calls OpenAI Chat Completions once, server-side, at `https://api.openai.com/v1/chat/completions`.

- Provider: OpenAI
- Model id: `gpt-4.1-mini`
- Secret environment variable: `LLM_API_KEY` (the OpenAI secret key)
- Model environment variable: `LLM_MODEL`, set to `gpt-4.1-mini`
- Local file: `submissions/Maryna-Lakei/.env.local`, loaded by Next.js and ignored by Git
- The key is read only on the server. It is not given a `NEXT_PUBLIC_` prefix.

`gpt-4.1-mini` is a text model with structured outputs and no reasoning step, which fits one short generation inside the 30-second bound (NFR-4). The response is one completed payload, not a stream (BC-5).

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| OpenAI `gpt-4.1-mini` via Chat Completions (chosen) | One non-streaming call, structured output, low latency | Requires an OpenAI API key and a paid API account |
| OpenAI `gpt-5-mini` | Official docs suggest it for more complex tasks | Extra reasoning cost and latency for a short structured result |
| A provider SDK with that vendor's default env name | Less HTTP code | Puts a vendor name into the client surface; the project already uses `LLM_API_KEY` |

## Consequences

- `.env.example` documents the two names and stays empty of secrets.
- Tests inject a fake completion. They do not read `LLM_API_KEY`.
- A missing key fails the live call. It does not invent a User Story. Failure copy on the page belongs to `add-generation-failure`.
- Changing the model later is an edit to `LLM_MODEL` or a new ADR, not a requirements change.
