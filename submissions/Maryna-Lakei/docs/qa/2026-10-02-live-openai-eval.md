# Supplemental live OpenAI eval

**When:** 2026-10-02 21:01 (Europe/Kyiv) for the model calls. Judges graded those outputs afterward.  
**Model:** `gpt-4.1-mini` from local `.env.local` (`LLM_MODEL`).  
**Key:** read by the process. Not printed. Not written into this file or `evals/results/live-openai-produced.json`.  
**Graded bar:** unchanged. `evals/results/latest.json`, `docs/qa/eval-report.md`, and `quality/eval-baseline.json` still record the fake-model scores (4 cases, each 100). This file is supplemental. It does not move the ratchet.

Two live calls, both `ok: true`, both under 30 seconds (2936 ms and 1947 ms). Outputs: `evals/results/live-openai-produced.json`. Scores: `evals/results/live-openai.json`.

The failure-message case was not sent to OpenAI. `[[provider-error]]` is ignored unless `REQUIREMENTS_MODEL_MODE=fake`. The sentence the page shows is still `Generation failed. You can try Generate again.` The graded fake-model error-clarity score stays 100.

## Scores

Pass mark: 70/100. A fail, or a first score within 10 of 70, got a second independent judge. The case score is the rounded average. Pass requires the average at or above 70 and every judge passing.

The clarifying-questions case was re-graded on 2026-10-02 21:20 (Europe/Kyiv) from the saved output. No new OpenAI call. The corrected rubric is the one in `evals/cases/clarifying-questions.eval.ts`. The first score of 35 stays in `evals/results/live-openai.json` under `previousRubric`.

| Case | Dimension | Score | Verdict | Judges |
| --- | --- | --- | --- | --- |
| eval-clarifying-questions-unstated-gaps | gap-questions | 100 | pass | 1, on the corrected rubric. First rubric was 35 fail |
| eval-user-story-shape | story-shape | 100 | pass | 1 |
| eval-acceptance-criteria-bullets | acceptance-criteria | 75 | pass | 2 (74 pass, 76 pass). No pass/fail disagreement |

## What the judges saw

Request `Need a weekly sales report.` Questions:

- What day of the week should the report be generated and delivered?
- Should the report include sales data segmented by region or salesperson?
- What format should the report be in (e.g., PDF, Excel, web dashboard)?
- Who are the intended recipients of the report?
- Are there any specific metrics or KPIs that should be highlighted in the report?

The first rubric failed this output at 35 because it required which regions are included and what counts as a sale. The corrected rubric does not. The re-grade scores the same five questions 100: each asks something the request leaves open, and none restates it or leaves the topic.

Request `Need a weekly sales report for the regional team.` Story:

`As a regional sales manager, I want a weekly sales report for the regional team, so that I can track performance and make informed decisions.`

The story judge scored 100. One story, with As a, I want, and so that in that order.

Same response, acceptance criteria:

- The report is generated every week on a specified day.
- The report includes total sales figures for each team member.
- The report compares current week sales to the previous week.
- The report highlights top-performing products or services.
- The report is accessible via email and the company dashboard.

Both judges passed. They treated the list shape and the lack of Given/When/Then as met. They marked concreteness as partial because “a specified day” names no day and “top-performing” defines no check.

## Judges

Fresh eval-judge agents, not the producer:

- gap questions: `c8a29e4c-977c-4244-ae23-c5c7b1b3ebb2`, `3562e64c-c856-4e0c-bdc6-bf462a400d2e`
- user story: `50a3b5bf-0591-49d5-9201-4a1499b1b25e`
- acceptance criteria: `4b6f736e-ab32-4dbf-a04d-abfdebc1fc2d`, `fa76de0a-72d2-411d-8bdb-2f283c407b1a`
