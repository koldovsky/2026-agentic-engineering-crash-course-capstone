# Clarifying-questions rubric correction

**When:** 2026-10-02 21:20 (Europe/Kyiv)  
**Approved by:** Maryna Lakei  
**Changed file:** `evals/cases/clarifying-questions.eval.ts`  
**Not changed:** the production prompt in `lib/requirements/openai-client.ts`, and product behavior.

## Why

The first supplemental live score of 35 used a rubric that required three topics from the fake fixture: which regions are included, who receives the report, and what counts as a sale. FR-5 only requires Clarifying Questions to be returned. FR-11 requires 3 to 5 questions about gaps in the raw request. The approved scenario requires that count, and that each question address a gap rather than restating a stated fact or an unrelated topic. It does not name those three topics.

The case scenario sentence that listed those topics was removed so it would not act as a second required-topic list. The fixture output itself was not changed.

## Corrected rubric

- The output is 3 to 5 clarifying questions.
- Each question addresses a gap the raw request does not already state.
- No question merely restates information the request already states, and no question introduces an unrelated topic.
- A missing question about regions, the recipient, or what counts as a sale is not a defect when the questions that are present address other unstated gaps.

## Re-grade

No new OpenAI call. The fake output was produced again with `REQUIREMENTS_MODEL_MODE=fake`. The live output was the saved array in `evals/results/live-openai-produced.json`.

| Output | Score | Verdict | Judge |
| --- | --- | --- | --- |
| Fake fixture, three questions | 100 | pass | `82dbea44-e8c8-4ee8-a275-66b902023b54` |
| Saved live output, five questions | 100 | pass | `73dee2e3-fc03-49bd-aad9-2a36951ee267` |

Neither score was within 10 points of 70, so neither case took a second judge.

`node scripts/check-eval-ratchet.mjs` compared `evals/results/latest.json` with `quality/eval-baseline.json` and printed Result: PASS. All four dimensions remain 100. The baseline file was not rewritten.
