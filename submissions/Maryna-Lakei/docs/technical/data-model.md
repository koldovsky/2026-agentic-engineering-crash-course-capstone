# Data model

There is no database, no schema, and no migration (TC-3, [ADR-0001](../adr/ADR-0001-minimal-next-llm-stack.md)). The model is the TypeScript values that cross the form and the server action. A reload discards them. See [architecture](architecture.md).

## Raw request

A string. `validateRawBusinessRequest` in `lib/requirements/validation.ts` trims it and rejects only the empty result.

| Result | Shape |
| --- | --- |
| Accepted | `{ ok: true }` |
| Rejected | `{ ok: false, message: "Enter a business request." }` |

There is no minimum length and no minimum word count (FR-7, [docs/requirements.md](../requirements.md)).

## Generation result

`GenerationResult` in `lib/requirements/generate.ts`:

| Outcome | Fields |
| --- | --- |
| Success | `ok: true`, `userStory`, `acceptanceCriteria`, `clarifyingQuestions` |
| Failure | `ok: false`, `reason` |

`reason` is one of `empty-input`, `missing-key`, `provider-error`, `timeout`, `invalid-payload`.

The server action returns that object and nothing else (`lib/requirements/actions.ts`). It does not return the API key.

## Parsed payload

`parseGenerationPayload` in `lib/requirements/parse-generation.ts` accepts one JSON object with three keys. Anything else is `invalid-payload`. It does not invent a story.

| Field | Accepted shape |
| --- | --- |
| `userStory` | One non-empty string. It contains `As a`, then later `I want`, then later `so that`, and the lead `As a` appears once (FR-9) |
| `acceptanceCriteria` | An array of 1 to 8 non-empty single-line strings. Given/When/Then is not required (FR-10) |
| `clarifyingQuestions` | An array of 3 to 5 non-empty strings. Each must contain `?` (FR-11) |

The live prompt asks the model for the same keys and the same bounds (`SYSTEM_PROMPT` in `lib/requirements/openai-client.ts`). The parser, not the prompt, is what the page will display.

## Reviewed result

`ReviewedResult` and `applyGenerationOutcome` in `lib/requirements/result-review.ts`.

| Event | Stored result |
| --- | --- |
| Success | Replaced by only the new story, criteria, and questions (FR-12). There is no history list |
| Structured failure | Left unchanged, including when nothing was stored yet |

Section labels are the constants `User Story`, `Acceptance Criteria`, and `Clarifying Questions`.

## Failure sentence

`generationFailureMessage` in `lib/requirements/generation-failure.ts` returns one sentence for `missing-key`, `provider-error`, `timeout`, and `invalid-payload`:

`Generation failed. You can try Generate again.`

It returns `null` for `empty-input` and for `null`. Empty input stays on the validation sentence above (FR-7). The form clears the failure reason when validation fails (`app/request-intake-form.tsx`).

## Fake fixtures

Used only when `REQUIREMENTS_MODEL_MODE=fake` (`lib/requirements/generate.ts`). They are not a stored catalog.

| Request text contains | Payload |
| --- | --- |
| `monthly budget` | Finance-lead story, two criteria, three questions |
| anything else that is not a failure marker | Regional-manager weekly story, two criteria, three questions |
| `[[provider-error]]` | Rejected after 1 second |
| `[[timeout]]` | Never resolves; the deadline wins |

The production smoke in [docs/qa/deploy-verification.json](../qa/deploy-verification.json) records `matchesFakeWeeklyFixture: false`.

## What is not a field

No user id, session, project, revision, email address, or payment record exists in `lib/requirements/`. Later items in BC-2 stay out of this model.
