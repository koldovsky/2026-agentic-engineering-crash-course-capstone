# Manual test plan

**Product:** AI Requirements Assistant  
**Written:** 2026-10-02 (Europe/Kyiv)  
**Who can run this:** a person using desktop Chrome. No developer tools are required after the server is running.  
**Model:** factory fake model only (`REQUIREMENTS_MODEL_MODE=fake`).  
**API key:** this plan does not use one. The start command sets `LLM_API_KEY` to an empty value.

Automated twins: `e2e/request-intake.spec.ts`, `e2e/requirement-generation.spec.ts`, `e2e/result-review.spec.ts`, `e2e/generation-failure.spec.ts`, `e2e/cross-slice.spec.ts`. Playwright starts the same fake-model server (`playwright.config.ts`).

## Before you start

1. Use desktop Chrome on a wide window (about 1280 pixels or wider). A phone-sized window is outside this plan (NFR-5, TC-8).
2. From the project folder `submissions/Maryna-Lakei/`, start the app:

```bash
REQUIREMENTS_MODEL_MODE=fake LLM_API_KEY= REQUIREMENTS_FAKE_DEADLINE_MS=1500 npm run dev -- --port 3000
```

3. Open `http://127.0.0.1:3000`.
4. You should see the heading **AI Requirements Assistant**, a field labeled **Raw business request**, and a **Generate** button. There is no sign-in page.
5. `REQUIREMENTS_FAKE_DEADLINE_MS=1500` makes the `[[timeout]]` marker fail in about 1.5 seconds. The product bound without that setting is 30 seconds (NFR-4), covered by `lib/requirements/generation-failure.test.ts`.

The fake model returns fixed text. Compare the page to the sentences in each case. A successful request takes about one second. While it runs, **Generate** is disabled, then it becomes clickable again.

## MT-1 — Empty input and whitespace (FR-7, NFR-3)

**Start:** the field is empty. No result headings are on the page.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Leave **Raw business request** empty. Click **Generate**. | The page shows exactly `Enter a business request.` **Generate** stays enabled. The headings User Story, Acceptance Criteria, and Clarifying Questions stay absent. The sentence `Generation failed. You can try Generate again.` stays absent. The browser stays on this page (no “Internal Server Error”). |
| 2 | Replace the field with three spaces. Click **Generate**. | The same validation sentence appears. The spaces stay in the field. **Generate** stays enabled. No result headings appear. |

## MT-2 — Weekly success (FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-9, FR-10, FR-11, FR-13, NFR-1, NFR-2, NFR-4, NFR-5)

**Start:** continue on the same page, or reload `http://127.0.0.1:3000`.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Confirm the page opened without a login, sign-up, or password field. Labels are English. | The field **Raw business request** is editable (FR-1). **Generate** is visible and enabled (FR-2). Copy is English (NFR-1). No account step (NFR-2, local only). Layout is the desktop page (NFR-5). |
| 2 | Type exactly: `Need a weekly sales report for the regional team` | The field shows that sentence. |
| 3 | Click **Generate** and watch the button. | **Generate** is disabled while the request is in flight, then enabled again when the result appears (FR-13). The result appears well within 30 seconds (NFR-4). |
| 4 | Read the three sections. | Three headings, once each: **User Story**, **Acceptance Criteria**, **Clarifying Questions** (FR-6). |
| 5 | Read User Story. | Exactly: `As a regional manager, I want a weekly sales report, so that I can review team performance.` One story, in the form As a / I want / so that (FR-3, FR-9). |
| 6 | Read Acceptance Criteria. | Two bullets, not a paragraph, and not Given/When/Then: `The report lists sales by region.` and `The report covers the previous week.` (FR-4, FR-10). |
| 7 | Read Clarifying Questions. | Three questions: `Which regions are included?` `Who receives the report?` `What counts as a sale?` (FR-5, FR-11). |
| 8 | Drag across the User Story text with the mouse. | The browser selects that text. There is no Copy button and no Regenerate button. |
| 9 | Confirm the failure sentence is absent. | `Generation failed. You can try Generate again.` is not on the page. |

## MT-3 — Provider-error marker `[[provider-error]]` (FR-8, NFR-3)

**Start:** MT-2 has finished, so the weekly story is still on the page.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Replace the field with exactly: `Need a weekly sales report [[provider-error]]` | The field shows that text, including the marker. |
| 2 | Click **Generate**. | Within a few seconds the page shows exactly `Generation failed. You can try Generate again.` The field still contains the marker text. **Generate** is enabled again, so you can try again (FR-8). |
| 3 | Look at the result and the page chrome. | The weekly User Story from MT-2 is still visible. The page does not show “Internal Server Error” (NFR-3). |

## MT-4 — Timeout marker `[[timeout]]` (FR-8, NFR-4, NFR-3)

**Start:** reload `http://127.0.0.1:3000` so this case is a fresh page. The server must still be the one started with `REQUIREMENTS_FAKE_DEADLINE_MS=1500`.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Type exactly: `Need a weekly sales report [[timeout]]` | The field shows that text, including the marker. |
| 2 | Click **Generate**. | Within about 1.5 seconds, and in any case within 10 seconds, the page shows exactly `Generation failed. You can try Generate again.` The field still contains the marker text. **Generate** is enabled again (FR-8). |
| 3 | Check the page. | No “Internal Server Error” (NFR-3). No User Story heading. The failure is a clear message, not a 30-second hang, because the fake deadline is 1500 ms. The 30-second product bound is the unit test named in the setup. |

## MT-5 — Monthly replacement (FR-12)

**Start:** reload `http://127.0.0.1:3000`.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Type `Need a weekly sales report for the regional team` and click **Generate**. | The weekly story from MT-2 appears. Wait until **Generate** is enabled again. |
| 2 | Replace the field with exactly: `Need a monthly budget for the finance team` | The field shows the monthly sentence. |
| 3 | Click **Generate** and wait until **Generate** is enabled again. | The weekly story is gone. User Story is exactly: `As a finance lead, I want a monthly budget summary, so that I can compare planned and actual spend.` |
| 4 | Read the other two sections. | Acceptance Criteria bullets: `The summary lists planned spend by category.` and `The summary lists actual spend for the month.` Clarifying Questions: `Which month does the budget cover?` `Which categories are in scope?` `Who approves a variance?` The failure sentence is absent. Only this new result remains (FR-12). |

## Record

Note the date in Europe/Kyiv, the Chrome window (desktop), and any sentence that did not match. A mismatch is a fail for that case. This plan does not ask you to paste an API key or to call OpenAI.
