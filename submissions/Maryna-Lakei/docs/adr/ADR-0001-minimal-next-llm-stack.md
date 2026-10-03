# ADR-0001: Minimal Next.js stack with a server-side LLM

- **Status:** Accepted
- **Date:** 2026-09-30
- **Deciders:** Maryna Lakei (owner), delivery orchestrator

## Context

AI Requirements Assistant is a modest public demo for one Business Analyst workflow: paste a raw business request, click Generate, and review a User Story, Acceptance Criteria, and Clarifying Questions (FR-1–FR-6, NFR-2). The owner rejected accounts, persistence, email, and payments (TC-3, BC-2). The factory default stack (Postgres, Drizzle, Better Auth, Resend) assumes those capabilities. Verification still has to be real (TC-4, TC-5), and the demo is deployed (TC-6).

## Decision

We will build a Next.js (App Router) web application that calls an LLM from the server. Vitest and Playwright verify behavior. OpenSpec holds the specifications. Vercel hosts the public demo. The LLM provider and model stay an implementation choice (TC-2). The API key stays in server environment variables.

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| Next.js + server-side LLM, no database or auth (chosen) | Matches the one-workflow MVP; factory checks can run without a database smoke | No history, no accounts, generation is stateless |
| Factory default: Next.js, Postgres, Drizzle, Better Auth, Resend | Ready-made auth, email, and persistence | Contradicts TC-3 and BC-2; too large for this capstone |
| CLI or notebook that prints a requirement | Smaller surface | The owner asked for a simple web application and a public demo |

## Consequences

- Per-slice smoke is a service and browser flow, not a real-database flow.
- Auth, email, and migration checks are omitted because those capabilities are absent.
- Headless Playwright in Chromium is the end-to-end and recording browser (TC-8, NFR-5). Cross-browser testing is out of scope.
- Empty or whitespace-only input is the only validation reject (FR-7). The provider and model remain an implementation choice (TC-2).
