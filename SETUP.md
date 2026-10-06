# AgentFlow — Setup and Verification

One-time setup after cloning:

```bash
nvm use            # Node 22.12 or newer (see .nvmrc); vitest 5 requires >=22.12
pnpm install
pnpm exec playwright install chromium
```

Commands (see `TECH_STACK.md` for the contract):

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the development server. |
| `pnpm typecheck` | `next typegen`, then `tsc --noEmit`. |
| `pnpm lint` | ESLint. |
| `pnpm test:unit` | Vitest, single run (`lib/**/*.test.ts`, `tests/unit/**`). |
| `pnpm test:e2e` | Playwright in Chromium at 375 px and 1440 px; builds the app and starts it on port 3100 automatically. |
| `pnpm check` | typecheck → lint → unit → E2E; stops at the first failing step with a nonzero exit code. |

Notes:

- The E2E run uses a production build (`pnpm build && pnpm start`), so no server needs to be started manually and port 3100 must be free.
- `README.md` is original course material and is intentionally left unchanged; setup documentation lives here.
- `vitest@5` declares a peer dependency on `@types/node` 22 or newer, while the scaffold pins `@types/node` 20. This only produces a `pnpm peers check` warning; bumping it needs separate approval.
