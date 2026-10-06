# AgentFlow — Technical Stack

Status: Target stack for AgentFlow. A generic Next.js scaffold already exists; AgentFlow features have not been implemented.

This document defines the technical choices for the approved [PRODUCT_BRIEF.md](./PRODUCT_BRIEF.md). It does not expand product scope or replace the OpenSpec specification.

The repository already declares Next.js, React, TypeScript, Tailwind CSS, ESLint, and pnpm. Zod, Vitest, Playwright, and the full verification command still need to be configured after the OpenSpec specification commit.

## Technologies

| Area | Choice | Use in this project |
| --- | --- | --- |
| Runtime | Node.js | Local development, builds, and test tooling; select a supported LTS release compatible with the chosen dependencies. |
| Framework | Next.js with React, App Router | A single landing page at `/`. No application backend, API routes, or Server Actions. |
| Language | TypeScript | Application and test code, with strict type checking. |
| Styling | Tailwind CSS | Responsive layouts and simple component styling. |
| Package manager | pnpm | Dependency installation and all project commands. |
| Form validation | Zod | Define the waitlist email schema and validation messages; use `safeParse()` to handle success and errors. |
| Unit testing | Vitest | Test the application's configured email schema independently of React. |
| End-to-end testing | Playwright | Test the actual page and waitlist flow in Chromium at mobile and desktop widths. |
| Linting | ESLint | Check application and test code using configuration compatible with the selected Next.js version. |
| Specification | OpenSpec | Define requirements, acceptance scenarios, and implementation tasks before writing product code. |
| Version control | Git | Preserve specification order, implementation changes, reviews, and verification evidence. |

Claude Code is the default tool for both roles: Sonnet for the Maker and Opus for the existing `reviewer`, invoked in a separate context as the Checker. The Checker reports without editing; the Maker applies fixes and runs verification. Codex remains available as an optional tool. These are development tools, not runtime dependencies. AgentFlow does not call an AI service.

Start the Maker from the repository root with `claude --model sonnet`. The reviewer profile already declares `model: opus`; ask Claude to invoke the named reviewer as a fresh subagent. Confirm its actual selected model in the agent UI rather than relying only on the file. Model aliases can resolve to different versions, so record the actual selected models when available instead of assuming a version. See the [Claude Code model configuration](https://code.claude.com/docs/en/model-config) and [subagent documentation](https://code.claude.com/docs/en/sub-agents).

## OpenSpec setup

OpenSpec 1.14.0 is installed locally as the exact `@fission-ai/openspec` devDependency, recorded in `package.json` and `pnpm-lock.yaml`. Run `pnpm install` after cloning; no global OpenSpec installation is required. Use `pnpm exec openspec ...` from the repository root, including in generated workflow examples.

The core profile is initialized for Claude Code and Codex with the `spec-driven` schema. Project context lives in `openspec/config.yaml`; planning artifacts must be in English, while the approved UI language remains Ukrainian.

Reload the agent session after setup to discover the generated workflows. Start planning with `/opsx:propose` in Claude Code or `$openspec-propose` in Codex CLI/IDE; in Codex desktop, select `openspec-propose` from Skills. Review and commit the specification before starting implementation. Initialization alone does not create a product specification.

## Implementation boundaries

- Keep page content static; use a small client component for the waitlist form.
- Use React component state for form errors and success. Simulate submission locally without network calls or persistent storage.
- Use native, accessible form controls and one Zod schema for required email and format validation. Reuse the same schema in the form and unit tests.
- Keep form state in React. Zod is the only validation library; no additional form, state-management, or UI framework is needed.
- Use Tailwind responsive styles for the existing page sections. Do not add pages, complex animations, or external services.

## Planned command contract

The existing scaffold provides `pnpm dev`, `pnpm build`, and `pnpm lint`. Typecheck, unit tests, E2E tests, and the combined check command are planned requirements. See saved verification runs in `docs/runs/` for actual command outcomes.

| Command | Responsibility |
| --- | --- |
| `pnpm dev` | Start the local development server. |
| `pnpm build` | Produce a production build. |
| `pnpm typecheck` | Check TypeScript without emitting application JavaScript; include any framework type-generation prerequisite required by the selected Next.js version. |
| `pnpm lint` | Run ESLint. |
| `pnpm test:unit` | Run Vitest once, without watch mode. |
| `pnpm test:e2e` | Run Playwright; manage the local application server automatically. |
| `pnpm check` | Run typecheck → lint → unit tests → E2E tests in sequence; stop and return a nonzero exit code if any step fails. |

`pnpm check` is the canonical verification command. Production build verification remains available separately via `pnpm build`.

## Test scope

- **Unit:** verify the application's Zod schema rejects empty, whitespace-only, and invalid emails, and accepts a valid email. Test the configured product rules and error messages rather than Zod internals.
- **E2E:** page sections, CTA navigation, validation errors, success, and correction followed by resubmission.
- **Browser coverage:** Chromium only, at 375 px and 1440 px viewport widths, including horizontal overflow checks. Use separate Playwright projects for these two viewport configurations.
- **Visual verification:** manually inspect both layouts. Save the outcome alongside actual test output and the tested commit SHA.
- **Evidence:** preserve real failures and successful reruns when they occur. An assertion that tests pass is not a substitute for a recorded run.

## Dependency setup

Use the existing scaffold as the baseline. After the OpenSpec specification commit, choose compatible stable versions for the missing dependencies. Record the selected Node.js version in a runtime version file, the pnpm version in the `packageManager` field, and dependencies in `package.json` and `pnpm-lock.yaml`.

Install Zod as an application dependency during implementation. Its schema runs locally in the browser and does not require an external service.

Commit the lockfile and document the one-time setup, including Playwright's Chromium installation. Once dependencies and the browser are installed, verification must not require manually starting a server. Do not introduce additional infrastructure or libraries unless required to deliver the approved scope.
