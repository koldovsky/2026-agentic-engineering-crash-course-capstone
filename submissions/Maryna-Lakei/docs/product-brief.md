# Product Brief — AI Requirements Assistant

## What this is

**AI Requirements Assistant** is Maryna Lakei’s capstone product for the fwdays Crash Course: Agentic Engineering (September 2026). It is a small public demo web application, not a commercial product and not tied to a fictional company, brand, or revenue model.

In one sentence: a simple web application for Business Analysts that transforms a raw business request or feature description into a structured requirement.

The only actor is a **Business Analyst**. The UI is in **English**. The demo is a **public desktop web application** and requires no login. Automated end-to-end checks run in **Chromium**. Cross-browser testing is outside this capstone.

## How a BA works today (without this tool)

Without tooling like this, a Business Analyst typically receives a raw business request in a ticket, chat message, or email. They then rewrite that request by hand into a User Story, Acceptance Criteria, and clarifying questions before sharing it for review. The structure is useful, but producing it from unstructured input takes time and attention on every request.

## Pain

Unstructured business requests are slow to turn into something a BA can review and refine as a proper requirement. The gap between “what someone asked for in plain language” and “a structured User Story with Acceptance Criteria and Clarifying Questions” is manual work that this demo aims to shorten for a single, focused workflow.

## End-to-end MVP workflow

1. The Business Analyst opens the public demo (no account).
2. They enter a raw business request into a text field.
3. They click **Generate**.
4. The application calls an LLM and returns a clearly structured result with three parts:
   - a **User Story**
   - **Acceptance Criteria**
   - **Clarifying Questions**
5. The BA reviews the three labeled sections on the page. The text can be selected with the browser’s native selection. To refine the result, the BA edits the raw business request and clicks Generate again. Editing the generated text on the page is outside MVP.

**Happy path:** a raw business request that is not empty or whitespace-only yields one “As a / I want / so that” User Story, a short bullet list of Acceptance Criteria, and 3 to 5 Clarifying Questions about gaps in the request. A later successful Generate replaces the previous result. Generate stays disabled while a request is in flight.

**Main error path:** empty or whitespace-only input does not call the LLM and shows an inline validation message. There is no minimum character count and no minimum word count.

**LLM failure:** a timeout or provider error shows a clear message, leaves the raw request in the field, and lets the BA try again.

**Delivery error surface (accepted with Project Factory):** LLM or API failures must not fail silently and must not present a generic 500 to the BA; the BA sees a clear error and can try again.

## Actors and goals

| Actor | Goal |
| --- | --- |
| Business Analyst | Enter a raw business request and receive a reviewable structured requirement (User Story, Acceptance Criteria, Clarifying Questions) without creating an account. |

There are no other actors in MVP (no admin, no end customer, no product owner role in the product).

## MVP vs later boundary

**MVP** is only the workflow above: a public English desktop demo, one Generate path, validation for empty or whitespace-only input, a 30-second completion-or-failure budget, and clear handling of LLM/API failures. Chromium is the browser for automated end-to-end verification.

**Explicitly later / out of scope for MVP** (recorded here as the Future boundary; not designed in detail in this brief):

- user accounts and authentication
- database and requirement history
- Jira integration
- document upload and RAG
- multiple projects/workspaces
- payments
- mobile application
- automatic editing of requirements (the product must not rewrite or “improve” a requirement on its own after generation)
- in-page editing of generated text, a copy button, a separate Regenerate control, streaming output, a dark theme, and any persistent rate limit or quota

## What “done” means for this capstone

This is a modest capstone. “Done” means:

- One happy path (non-empty input → structured User Story, Acceptance Criteria, Clarifying Questions).
- One validation path (empty or whitespace-only input → inline message, no LLM call).
- Completing that scope through the full Project Factory cycle (requirements → specs → implementation → verification → QA proof), deployed as a public desktop demo.

The owner confirmed this scope on 2026-09-30.
