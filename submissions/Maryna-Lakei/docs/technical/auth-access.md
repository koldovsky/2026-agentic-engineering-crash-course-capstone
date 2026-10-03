# Access

There are no accounts, sessions, roles, or a login wall (TC-3, NFR-2). [ADR-0001](../adr/ADR-0001-minimal-next-llm-stack.md) rejects Better Auth. [openspec/specs/public-demo/spec.md](../../openspec/specs/public-demo/spec.md) requires the Generate workflow with no authentication challenge.

## Who can open the page

Anyone who can load the URL. `app/page.tsx` renders the form. There is no `middleware.ts` and no auth module under `app/` or `lib/`.

Production evidence on 2026-10-03: [docs/qa/deploy-verification.json](../qa/deploy-verification.json).

| Fact | Value in that file |
| --- | --- |
| URL | `https://ai-requirements-assistant-umber.vercel.app` |
| HTTP status | 200 |
| `loginWall` | false |
| `deploymentProtection` | `[]` |
| Page title | AI Requirements Assistant |

Local Chromium tests also look for the form with no sign-in step (`e2e/request-intake.spec.ts`, `e2e/cross-slice.spec.ts`). Those runs use the fake model. They are not the production smoke.

## Who can call Generate

The same visitor. The control is a submit button labeled Generate (`app/request-intake-form.tsx`). It disables while `inFlight` is true (FR-13). A ref ignores a second submit that arrives before that render. There is no quota (BC-5).

Empty or whitespace-only input never calls the server action. The browser shows `Enter a business request.` (`lib/requirements/validation.ts`, FR-7).

## Where the API key lives

| Rule | Evidence |
| --- | --- |
| Server environment only | TC-2, [ADR-0003](../adr/ADR-0003-openai-requirement-generation.md) |
| Name | `LLM_API_KEY`. Not `NEXT_PUBLIC_` |
| Read site | `resolveDefaultClient` in `lib/requirements/generate.ts` |
| Sent to OpenAI | `Authorization: Bearer` inside `lib/requirements/openai-client.ts`, which imports `server-only` |
| Local file | `.env.local`, gitignored (`.gitignore`). Template names only: `.env.example` |
| Production | Vercel Production secret. The deploy file records `LLM_API_KEY` as `set-as-secret-value-not-recorded`. The value is not in git and is not copied into these docs |

A missing or blank key returns `{ ok: false, reason: "missing-key" }` (`lib/requirements/generate.ts`). The page then shows the failure sentence (`lib/requirements/generation-failure.ts`). It does not invent a User Story.

## What the browser is allowed to see

The action returns `GenerationResult` (`lib/requirements/actions.ts`). That type has the three text fields or a reason. It has no key field.

The production smoke records `secretMaterialInPage: false` and `browserContactedHosts: ["ai-requirements-assistant-umber.vercel.app"]` ([docs/qa/deploy-verification.json](../qa/deploy-verification.json)). The browser talked to the app host. It did not talk to `api.openai.com`. Chromium specs assert the same absence of an OpenAI request on the fake-model server (`playwright.config.ts` sets `LLM_API_KEY` to empty).

## What this page does not prove

This pass did not open the Vercel dashboard and did not print a secret. The secret marker and the host list are the deploy file, not a new inspection. The traceability matrix still says the NFR-2 deploy artifact is missing ([docs/qa/requirements-traceability-matrix.md](../qa/requirements-traceability-matrix.md)). That sentence was not rewritten here. PD-3 was not adopted. The deploy file is the later evidence.
