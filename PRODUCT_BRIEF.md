# AgentFlow — Product Brief

Status: Approved by the product owner on 2026-10-04; the workflow section was amended on 2026-10-05.

## Goal

Build a single-page landing page for AgentFlow, a fictional AI-assisted software development service, within a few hours. Deadline: October 4, 2026.

The capstone demonstrates a complete Agentic Engineering / Spec Driven Development workflow with verifiable Git evidence. Product complexity is not the goal.

Repository baseline: commit `4666845` already contains a generic Next.js scaffold, created before these documents. The OpenSpec specification must precede AgentFlow feature implementation; do not claim that it preceded the existing scaffold.

## Audience and value

Developers and small teams who want a structured way to work with coding agents: define a task, implement it against a specification, and verify the result. The landing page explains this idea and demonstrates a waitlist signup.

## Fixed scope

One page at `/`, with these sections in order:

1. Navbar — brand and section links.
2. Hero — value proposition and a waitlist CTA.
3. Features — a short, static list of benefits.
4. How It Works — specification → implementation → verification.
5. Pricing — illustrative plans without purchasing.
6. FAQ — static questions and answers.
7. Waitlist CTA — the only form on the page.
8. Footer — brand and a short description.

Responsive desktop and mobile layouts. Simple styling without complex animations. All signup CTAs lead to the same form.

## Only interactive feature: waitlist

- Email is required: an empty or whitespace-only value shows a clear error.
- An invalid email format shows an error without a success state.
- A valid email triggers a locally simulated submission and a visible success state.
- Users can correct an invalid email and submit again successfully.
- Email is neither sent over the network nor persisted across page reloads.
- A note beside the form identifies it as a demo: no real signup or email delivery occurs.

## Out of scope

Databases, authentication, backend/API routes, real email delivery, AI/OpenAI APIs, payments, dashboards, additional pages, external integrations, and complex animations.

Do not expand scope during implementation. Avoid unnecessary agent infrastructure, extra agents or skills, complex hooks, autonomy frameworks, and extensive architecture documents.

## Stack and verification

Next.js, TypeScript, Tailwind CSS, pnpm, Zod, Vitest, Playwright, and ESLint. Zod defines the waitlist email validation rules; React component state controls form feedback. See [TECH_STACK.md](./TECH_STACK.md) for technical boundaries and the command contract.

Both test levels are required:

- **Vitest unit tests:** the application's Zod email schema for empty input, whitespace-only input, invalid format, and a valid address.
- **Playwright E2E tests:** all eight sections render; CTAs reach the form; empty and invalid emails show errors; a valid email shows success; correcting an invalid email allows a successful submission.
- Run E2E tests in Chromium at mobile (375 px) and desktop (1440 px) widths, including checks for horizontal overflow. Additional browsers are out of scope.
- Visually inspect both layouts as well as running automated checks.

The canonical `pnpm check` command runs typecheck → ESLint → Vitest unit tests → Playwright E2E tests, stopping with a nonzero exit code on failure. `pnpm test:unit` and `pnpm test:e2e` run each suite separately. E2E tests start the local application automatically.

## Workflow and evidence

Product Brief + Tech Stack → AGENTS.md → OpenSpec specification → commit specification → implementation → unit + E2E tests → `pnpm check` → independent review → fixes → `pnpm check` → final evidence → PR → 1–2 minute video.

- Workflow update approved by the product owner on 2026-10-05: use Claude Code for both roles, with Sonnet as Maker and the existing Opus `reviewer` as the stronger-model Checker in a separate subagent invocation or fresh session. The Checker must not have authored the changes and reports without fixing code. Record actual models and source/session identities in review evidence; label unknown metadata honestly. Codex remains optional, not a required review tool. Preserve previous reports as evidence of the workflow actually used at that time.
- Shared sources of truth: this brief, TECH_STACK.md, AGENTS.md, OpenSpec, code, tests, Git history, and review reports. Do not rely on conversation history shared between agents.
- Static context consists of project documents and rules. Dynamic context includes the current task, Git diff, and actual verification output supplied for that task.
- Commit the OpenSpec specification before implementing AgentFlow features or extending the existing scaffold. This brief does not replace the specification.
- Preserve real verification output and review reports identifying the reviewed commit SHA. Record actual agent mistakes, fixes, and reruns; never invent failures or findings.
- Document failure → agent fix → verification using actual runs. Loop automation is optional; label a manual cycle as manual.
- Write project documentation and agent artifacts in English. Human-facing discussion in chat may remain Ukrainian.

## Definition of done

- All eight sections are available, without horizontal overflow at 375 px and 1440 px widths.
- The form meets the specified scenarios, has a label, works with a keyboard, and displays errors and confirmation.
- The final `pnpm check` passes, including unit tests and both E2E viewport projects. Actual test output and a record of the visual inspection are saved.
- Independent review is complete; findings have fixes or explicitly documented resolutions.
- The PR links evidence for each claimed practice and distinguishes human decisions from agent decisions.
- A 1–2 minute video shows the product and how it was built with agents.
