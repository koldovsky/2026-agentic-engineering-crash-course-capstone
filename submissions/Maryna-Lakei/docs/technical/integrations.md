# Integrations

Two external systems are in use: OpenAI for generation, and Vercel for the public demo. Everything else in the factory default stack is an intentional absence (TC-3, TC-7, [ADR-0001](../adr/ADR-0001-minimal-next-llm-stack.md)).

## OpenAI

| | |
| --- | --- |
| Decision | [ADR-0003](../adr/ADR-0003-openai-requirement-generation.md), accepted 2026-10-02 |
| API | Chat Completions, one non-streaming POST. Details in [actions](apis-actions.md) |
| Model id | `gpt-4.1-mini` |
| Secret | `LLM_API_KEY`, server only |
| Model variable | `LLM_MODEL`. Production value `gpt-4.1-mini` ([docs/qa/deploy-verification.json](../qa/deploy-verification.json)) |
| Code | `lib/requirements/openai-client.ts`, called from `lib/requirements/generate.ts` only when fake mode is off and the key is non-empty |

The ADR rejects `gpt-5-mini` for this short structured call because of extra reasoning cost and latency against the 30-second bound (NFR-4). Changing the model later is an edit to `LLM_MODEL` or a new ADR, not a new requirement id (ADR-0003).

Tests do not call this API. `playwright.config.ts` and `tests/cross-slice.integration.test.ts` force fake mode and an empty key. The graded eval is also the fake model ([docs/qa/eval-report.md](../qa/eval-report.md)).

A supplemental live run on 2026-10-02 used `gpt-4.1-mini` and did not record the key ([docs/qa/2026-10-02-live-openai-eval.md](../qa/2026-10-02-live-openai-eval.md)). Scores there are not the ratchet. `quality/eval-baseline.json` still matches the fake-model report.

The production smoke on 2026-10-03 contacted only `ai-requirements-assistant-umber.vercel.app` from the browser. The OpenAI call, if it happened, stayed on the server. The smoke result was not the fake weekly fixture (`matchesFakeWeeklyFixture: false` in the deploy file).

## Vercel

| | |
| --- | --- |
| Constraint | TC-6. The public demo is deployed on Vercel |
| Project | `marynalakei-png/ai-requirements-assistant` |
| Production URL | `https://ai-requirements-assistant-umber.vercel.app` |
| Deployment | `dpl_rGZG9Z5czhWLhWrPdAyv3fNLK24u` |
| Deployment URL | `https://ai-requirements-assistant-rlmxe37m8-marynalakei-png.vercel.app` |
| Target | `production` |
| Framework recorded | `nextjs` |
| Evidence | [docs/qa/deploy-verification.json](../qa/deploy-verification.json), commit `47800573915f20c69a4df89ae4218d606d919f14` (`Refs: PD-1`) |

`deploymentProtection` in that file is an empty array. `loginWall` is false. How the environment is set: [operations](operations.md).

## Absent on purpose

| System | Why it is absent |
| --- | --- |
| Postgres, Drizzle | TC-3, TC-7. No `db/` |
| Better Auth or any login provider | TC-3, NFR-2. See [access](auth-access.md) |
| Resend or any email provider | TC-3 |
| Payments | TC-3, BC-2 |
| Jira, document upload, RAG | BC-2 |
| A second LLM vendor | TC-2. One server-side provider |

No module under `lib/requirements/` imports those clients. A search of product TypeScript shows `"use server"` only in `lib/requirements/actions.ts`.
