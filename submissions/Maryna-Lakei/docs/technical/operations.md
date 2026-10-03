# Operations

Project directory: `submissions/Maryna-Lakei/` on branch `capstone-project`. The git root is the parent folder. Commands below run from the project directory.

## Production

Recorded in [docs/qa/deploy-verification.json](../qa/deploy-verification.json) (`verifiedAt` `2026-10-03T13:15:56+03:00`). Commit `47800573915f20c69a4df89ae4218d606d919f14` (`Refs: PD-1`).

| | |
| --- | --- |
| URL | https://ai-requirements-assistant-umber.vercel.app |
| Vercel project | `marynalakei-png/ai-requirements-assistant` |
| Deployment | `dpl_rGZG9Z5czhWLhWrPdAyv3fNLK24u` |
| Smoke | HTTP 200, no login wall, one live Generate succeeded (one user story, 5 acceptance criteria, 5 clarifying questions), input preserved, failure sentence not shown, browser hosts only that production host, no secret in the page |

`node scripts/check-deploy.mjs` reads that file. On 2026-10-03 it printed the URL and exited 0. The script requires `status` in `passed`, `pass`, `ok`, or `green`, and a non-empty `url` (`scripts/check-deploy.mjs`).

### Production environment

Names only. Do not copy a secret into git or into a doc.

| Variable | Production | Role |
| --- | --- | --- |
| `LLM_API_KEY` | Set as a Vercel Production secret. The deploy file stores `set-as-secret-value-not-recorded` | OpenAI key. Read only in `lib/requirements/generate.ts` |
| `LLM_MODEL` | `gpt-4.1-mini` | Overrides the code default of the same id (`lib/requirements/openai-client.ts`) |
| `REQUIREMENTS_MODEL_MODE` | Unset | Must stay unset. `fake` is tests only |

`.env.example` lists `LLM_API_KEY` (empty) and `LLM_MODEL=gpt-4.1-mini`. `.env.local` is gitignored (`.gitignore`). This documentation pass did not read `.env.local`.

## Local commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server. Playwright uses port 3000 (`playwright.config.ts`) |
| `npm run build` then `npm run start` | Production build and serve |
| `npm run lint` | `eslint .` |
| `npm run test:run` | Vitest, `lib/**/*.test.ts` (`vitest.config.ts`) |
| `npm run test:integration` | Fake-model cross-slice flow. Not a database (`vitest.integration.config.ts`) |
| `npm run test:e2e` | Playwright, Chromium only |
| `npm run qa:verify` | `node scripts/qa-verify.mjs` |
| `npm run gate:status` | `node scripts/gate-status.mjs` |

A local live call needs `LLM_API_KEY` in `.env.local` and `REQUIREMENTS_MODEL_MODE` unset. A local fake call sets `REQUIREMENTS_MODEL_MODE=fake` and does not need a key. Do not commit the key ([ADR-0003](../adr/ADR-0003-openai-requirement-generation.md)).

## CI copy

`.github/workflows/ci.yml` in this project mirrors lint, typecheck, traceability, trajectory, OpenSpec, `npm audit --audit-level=high`, coverage, the integration script, Chromium, and `npm run build`. Its own comment says GitHub Actions loads workflows from the repository root, and the course root was not modified. There is no workflow file at the git root. This pass did not look up a GitHub Actions run, so it does not claim that workflow has executed.

The job step is titled "DB integration tests". The test it runs is `tests/cross-slice.integration.test.ts`, which has no database.

## Checks observed on 2026-10-03

| Command | Result |
| --- | --- |
| `node scripts/check-deploy.mjs` | Exit 0. Printed the production URL |
| `node scripts/check-visual-fidelity.mjs` | Exit 1. `Result: NOT-EARNED`. `quality/visual-parity.config.json` is absent while product code exists |
| `node scripts/check-factory-integrity.mjs` | Exit 0. `Result: PASS, 1 warning(s)`. The warning says `core.hooksPath` is `submissions/Maryna-Lakei/.githooks` and that git will never run it. Git config was not changed |

Visual fidelity stays NOT-EARNED. Do not add `quality/visual-parity.config.json`. `factory-lock.json` keeps the adaptation `no visual-parity config: no pixel-fidelity requirement`.

The on-disk bundle [docs/qa/automated-verification-latest.md](../qa/automated-verification-latest.md) finished `2026-10-02T17:53:53.763Z` with overall result Fail. It stopped at acceptance-artifacts. It predates the deploy file. This pass did not regenerate it. PD-5, which would keep the battery running after a failure, was not adopted.

## Not done

The final release commit and push are not done. As of this writing, `HEAD` was `47800573915f20c69a4df89ae4218d606d919f14` and the stored upstream `origin/capstone-project` was `10269e4839fe4b42c05e88ef340b702ad332d012`. No fetch was run. See [delivery report](../delivery-report.md).
