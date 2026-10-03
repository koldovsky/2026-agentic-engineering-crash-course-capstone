# Requirements Document

**Project:** AI Requirements Assistant  
**Prepared for:** Spec-driven delivery (Project Factory Phase 1 — product framing)  
**Status:** Signed off by Maryna Lakei on 2026-09-30.

---

## 1. Overview

This document captures the MVP requirements for **AI Requirements Assistant**, Maryna Lakei’s greenfield capstone for the fwdays Crash Course: Agentic Engineering (September 2026). The product is a small public desktop web demo for a single actor — a **Business Analyst** — who enters a **raw business request** and clicks **Generate** to obtain a structured **User Story**, **Acceptance Criteria**, and **Clarifying Questions** via a server-side LLM.

The UI language is English. There is no login. MVP scope is this one workflow, plus inline validation when input is empty or whitespace-only (no LLM call), and a clear error when the LLM or API fails so the BA can try again. Automated end-to-end verification uses Chromium. Items explicitly deferred (accounts, database/history, Jira, document upload/RAG, workspaces, payments, mobile app, automatic post-generation rewriting, in-page editing, and the other exclusions in BC-5) stay in business constraints. They are not expanded into Future functional requirements.

On 2026-09-30 the owner approved the proposed defaults, with two overrides: validation rejects only empty or whitespace-only input, and the capstone is a desktop web application verified in Chromium. Existing IDs were amended in place. New IDs were appended. No ID was renumbered.

IDs in this document (`FR-*`, `NFR-*`, `TC-*`, `BC-*`) are assigned once and must not be renumbered later.

---

## 2. Functional Requirements (FR)

### Area: Input

| ID | Phase | Area | Description | Verification |
| --- | --- | --- | --- | --- |
| FR-1 | MVP | Input | The application provides a text field where a Business Analyst can enter a raw business request. | verification: e2e, a11y |
| FR-2 | MVP | Input | The application provides a Generate control that the Business Analyst can use to request structured requirement output from the entered raw business request. | verification: e2e, a11y |
| FR-13 | MVP | Input | While a Generate request is in flight, the Generate control is disabled. | verification: e2e |

### Area: Generation output

| ID | Phase | Area | Description | Verification |
| --- | --- | --- | --- | --- |
| FR-3 | MVP | Generation output | When the Business Analyst activates Generate with a raw business request that is not empty or whitespace-only, the application returns a User Story. | verification: e2e, eval |
| FR-4 | MVP | Generation output | When the Business Analyst activates Generate with a raw business request that is not empty or whitespace-only, the application returns Acceptance Criteria. | verification: e2e, eval |
| FR-5 | MVP | Generation output | When the Business Analyst activates Generate with a raw business request that is not empty or whitespace-only, the application returns Clarifying Questions. | verification: e2e, eval |
| FR-6 | MVP | Generation output | After a successful Generate, the User Story, Acceptance Criteria, and Clarifying Questions are presented as clearly structured, labeled sections of readable text on the page. The BA can select that text with native browser selection. | verification: e2e, vision-verify |
| FR-9 | MVP | Generation output | The User Story is a single story in the form “As a / I want / so that”. | verification: e2e, eval |
| FR-10 | MVP | Generation output | Acceptance Criteria are a short bullet list. A Given/When/Then format is not required. | verification: e2e, eval |
| FR-11 | MVP | Generation output | Clarifying Questions are 3 to 5 questions about gaps in the raw business request. | verification: e2e, eval |
| FR-12 | MVP | Generation output | A new successful Generate replaces the previous result on the page. | verification: e2e |

### Area: Validation

| ID | Phase | Area | Description | Verification |
| --- | --- | --- | --- | --- |
| FR-7 | MVP | Validation | When the raw business request is empty or whitespace-only, the application shows an inline validation message and does not call the LLM. Any non-empty input after trim is eligible for Generate. There is no minimum character count and no minimum word count. | verification: local-verifiable, e2e, a11y |

### Area: Error handling

| ID | Phase | Area | Description | Verification |
| --- | --- | --- | --- | --- |
| FR-8 | MVP | Error handling | When an LLM or API call fails, including timeout, the Business Analyst sees a clear error message, the raw business request remains in the text field, and the BA can try Generate again. | verification: e2e |

---

## 3. Non-Functional Requirements (NFR)

| ID | Phase | Category | Description | Verification |
| --- | --- | --- | --- | --- |
| NFR-1 | MVP | Localization | The application UI is in English. | verification: e2e |
| NFR-2 | MVP | Access | The demo is public: a Business Analyst can use the Generate workflow without logging in or creating an account. | verification: e2e, deploy-gated |
| NFR-3 | MVP | Reliability / error surface | No user input may produce a generic HTTP 500 page. An LLM or API failure must not fail silently: the BA sees a clear error message and can try again. | verification: e2e |
| NFR-4 | MVP | Performance | A Generate request completes with a result or fails with a clear error within 30 seconds. | verification: e2e |
| NFR-5 | MVP | Compatibility | The application is a desktop web application. Cross-browser testing is not required for this capstone. | verification: e2e |

---

## 4. Constraints

### Technical constraints (TC)

| ID | Phase | Description |
| --- | --- | --- |
| TC-1 | MVP | The application is a Next.js web application using the App Router. |
| TC-2 | MVP | Requirement generation uses one server-side LLM API. The provider and model are chosen at implementation. The API key lives only in server environment variables and is never sent to the browser. |
| TC-3 | MVP | MVP includes no authentication, no database, no email, and no payments. |
| TC-4 | MVP | Verification uses Vitest and Playwright. |
| TC-5 | MVP | Specifications are authored and maintained with OpenSpec. |
| TC-6 | MVP | The public demo is deployed on Vercel. |
| TC-7 | MVP | Factory defaults Postgres, Drizzle, Better Auth, and Resend are intentionally absent. |
| TC-8 | MVP | Automated end-to-end verification uses Chromium. Cross-browser end-to-end testing is out of scope. |

### Business constraints (BC)

| ID | Phase | Description |
| --- | --- | --- |
| BC-1 | MVP | This is Maryna Lakei’s personal course capstone demo for the fwdays Crash Course: Agentic Engineering (September 2026). |
| BC-2 | Future | Explicitly later, with no detailed Future FRs: user accounts and authentication; database and requirement history; Jira integration; document upload and RAG; multiple projects/workspaces; payments; mobile application; automatic editing of requirements (the product must not rewrite or improve a requirement on its own after generation). |
| BC-3 | MVP | Capstone “done” for MVP means one happy path (a non-empty raw business request → User Story, Acceptance Criteria, and Clarifying Questions) and one validation path (empty or whitespace-only input → inline message, no LLM call), completed through the full Project Factory cycle as a public desktop demo. |
| BC-4 | MVP | Scope changes after sign-off require owner change control before new FR/NFR IDs are added. Existing IDs are never renumbered. |
| BC-5 | MVP | Outside MVP: in-page editing of generated text, a separate copy-to-clipboard control, a distinct Regenerate control, streaming the model response, a dark theme, and any persistent rate limit or quota. The BA refines by editing the raw business request and clicking Generate again. |

---

## 5. Decisions and notes

Owner decisions on 2026-09-30, now written into the rows above:

1. **Validation (FR-7 amended).** Reject only empty or whitespace-only input. Show an inline validation message. Do not call the LLM. No character-count or word-count rule.
2. **Review and refine (FR-6 amended, BC-5 added).** The three sections are labeled readable text the BA can select natively. In-page editing of the generated text is outside MVP. Refine means edit the source request and Generate again.
3. **Section shape (FR-9, FR-10, FR-11 added).** One “As a / I want / so that” story. Acceptance Criteria as a short bullet list. Three to five clarifying questions about gaps only.
4. **Repeat Generate (FR-12, FR-13 added).** A new success replaces the previous result. Generate is disabled while a request is in flight.
5. **Failure (FR-8 amended, NFR-3 unchanged).** A specific error, input left intact, no generic 500 page.
6. **LLM access (TC-2 amended).** One server-side provider. Model chosen at implementation. API key only in server environment variables.
7. **Desktop and Chromium (NFR-5, TC-8 added).** Desktop web application. Automated E2E uses Chromium. Cross-browser testing is out of scope.
8. **Time budget (NFR-4 added).** Generation completes or fails within 30 seconds.
9. **Abuse and copy (FR-13, BC-5).** No persistent quota. No separate copy button.

Residual notes (wording and vendor choice, not extra scope):

- The exact sentences for the validation message and the LLM error message are an implementation choice, as long as they are specific and inline or on the same page.
- The LLM provider and model name are chosen at implementation under TC-2.
- Inference confidence is high for the MVP workflow, the validation rule, and the Chromium desktop verification boundary.
