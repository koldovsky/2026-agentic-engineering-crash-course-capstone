# Demo script

**Product:** AI Requirements Assistant  
**Written:** 2026-10-02 (Europe/Kyiv)  
**Harness:** `scripts/record-demos.mjs` (`npm run qa:record-demos`)  
**Browser:** headless Playwright Chromium. The harness does not use the person’s Chrome window and does not open a save dialog.  
**Viewport:** 1280×800 for the whole clip. One clip per viewport. The script does not resize mid-clip.  
**Server:** app already running with `REQUIREMENTS_MODEL_MODE=fake`. These clips do not call OpenAI.  
**Check:** `docs/qa/recordings-report.md` — Result: PASS, 5 clips, all asserted, vision met and readable.

Each clip drives the page and asserts the ids in its proof list. The settled still is a full-page screenshot taken after the assertions. Manifest: `docs/qa/demo-recordings/manifest.json`.

Sentences the fake model returns:

- Weekly request: `Need a weekly sales report for the regional team`
- Weekly story: `As a regional manager, I want a weekly sales report, so that I can review team performance.`
- Monthly request: `Need a monthly budget for the finance team`
- Monthly story: `As a finance lead, I want a monthly budget summary, so that I can compare planned and actual spend.`
- Validation sentence: `Enter a business request.`
- Failure sentence: `Generation failed. You can try Generate again.`

## Clip 01 — `01-request-intake`

**Title:** Public English intake validates empty input and disables Generate in flight  
**Proves:** FR-1, FR-2, FR-7, FR-13, NFR-1, NFR-2, NFR-5  
**Files:** `docs/qa/demo-recordings/01-request-intake.webm`, `01-request-intake.png`, `01-request-intake.md`

| Step | What the clip does | What it asserts |
| --- | --- | --- |
| 1 | Open the app URL. | The response is not a generic HTTP 500. |
| 2 | Find **Raw business request** and **Generate**. | The field is visible and editable (FR-1). Generate is visible and enabled (FR-2). |
| 3 | Look for a login wall. | No “sign in”, “log in”, or “sign up” copy, and no password field (NFR-2). English labels on the desktop page (NFR-1, NFR-5). |
| 4 | Clear the field and click **Generate**. | Exact text `Enter a business request.` (FR-7). The failure sentence is absent. Generate stays enabled. |
| 5 | Fill the weekly request and click **Generate**. | Generate is disabled while the request is in flight, then enabled again after the User Story heading appears (FR-13). |

## Clip 02 — `02-requirement-generation`

**Title:** Generate returns one story, acceptance criteria, and gap questions  
**Proves:** FR-3, FR-4, FR-5, FR-9, FR-10, FR-11, NFR-4  
**Files:** `docs/qa/demo-recordings/02-requirement-generation.webm`, `02-requirement-generation.png`, `02-requirement-generation.md`

| Step | What the clip does | What it asserts |
| --- | --- | --- |
| 1 | Open the app. Fill the weekly request. Click **Generate**. Start a timer. | The weekly story appears in under 30 seconds (NFR-4). |
| 2 | Read User Story. | The heading is visible (FR-3). The story contains “As a”, “I want”, and “so that” (FR-9). |
| 3 | Read Acceptance Criteria. | The heading is visible (FR-4). The section has at least one bullet (FR-10). |
| 4 | Count Clarifying Questions. | The list has 3 to 5 items (FR-5, FR-11). |
| 5 | Check the failure sentence. | It is absent on this success. |

The graded bar for this shape is `docs/qa/eval-report.md` (cases `eval-user-story-shape`, `eval-acceptance-criteria-bullets`, `eval-clarifying-questions-unstated-gaps`), not the clip alone.

## Clip 03 — `03-result-review`

**Title:** Labeled sections stay readable and a later success replaces them  
**Proves:** FR-6, FR-12  
**Files:** `docs/qa/demo-recordings/03-result-review.webm`, `03-result-review.png`, `03-result-review.md`

| Step | What the clip does | What it asserts |
| --- | --- | --- |
| 1 | Generate the weekly request and wait for the weekly story. | Headings User Story, Acceptance Criteria, and Clarifying Questions are visible (FR-6). |
| 2 | Read the computed style of the story text. | `user-select` is not `none`, so native selection is not blocked (FR-6). |
| 3 | Replace the field with the monthly request and click **Generate**. | The weekly story is gone. The monthly story is the one on the page (FR-12). |

FR-6 vision: `docs/qa/vision-report.json` (`met: true`) plus this clip’s still (`vision.met` and `vision.readable` in the manifest).

## Clip 04 — `04-generation-failure`

**Title:** A provider error shows a clear message and keeps the previous result  
**Proves:** FR-8, NFR-3  
**Files:** `docs/qa/demo-recordings/04-generation-failure.webm`, `04-generation-failure.png`, `04-generation-failure.md`

| Step | What the clip does | What it asserts |
| --- | --- | --- |
| 1 | Generate the weekly request and wait for the weekly story. | The success is on the page before the failure. |
| 2 | Replace the field with `Need a weekly sales report [[provider-error]]` and click **Generate**. | An alert named exactly `Generation failed. You can try Generate again.` appears. |
| 3 | Read the field, the button, and the old story. | The marker text is still in the field. Generate is enabled (FR-8). The weekly story is still visible. The page does not say “Internal Server Error” (NFR-3). |

The graded bar for the failure sentence is eval case `eval-generation-failure-message` (score 100) in `docs/qa/eval-report.md`.

## Clip 05 — `05-security-negative`

**Title:** No login wall and no generic server error  
**Proves:** NFR-2, NFR-3, FR-7  
**Files:** `docs/qa/demo-recordings/05-security-negative.webm`, `05-security-negative.png`, `05-security-negative.md`

| Step | What the clip does | What it asserts |
| --- | --- | --- |
| 1 | Open the app URL. | The URL stays on the app. It does not redirect to a login URL (NFR-2, local). |
| 2 | Look for an account wall. | No sign-in / log-in / sign-up copy and no password field (NFR-2). |
| 3 | Fill the field with three spaces and click **Generate**. | Exact text `Enter a business request.` (FR-7). The page does not say “Internal Server Error” (NFR-3). The generation-failure sentence is absent. |

NFR-2 on a deployed public URL is not this clip. That evidence is missing until Phase 7.
