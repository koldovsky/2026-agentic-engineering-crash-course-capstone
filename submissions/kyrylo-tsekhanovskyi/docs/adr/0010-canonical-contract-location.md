# 0010. Canonical OpenAPI contract in openspec/contracts

- Status: accepted · Date: 2026-10-01 · Decided by: human

## Context
MVP-1's contract lived in `openspec/changes/add-mvp1-core-tracking/contracts/openapi.yaml`. Archiving
moves the change to `openspec/changes/archive/<date>-…/`, but three things read the contract: the
frontend's type generation, the backend contract-drift test and `npm run screens`. OpenSpec merges
spec deltas into `openspec/specs/`, but it has no place for a contract.

## Decision
- The **canonical contract** is `openspec/contracts/openapi.yaml`: what the code implements today.
- A change that alters the API carries a **full modified copy** in its own `contracts/openapi.yaml`.
  While that change is active, the copy is the contract in force, so the makers build against the new
  API, and the spec review and the human approve it with the change.
- **Archiving** such a change replaces the canonical file with the change's copy, in the same step as
  `openspec archive`.
- One rule resolves the contract in force everywhere: an active change's copy if exactly one carries
  one, otherwise the canonical file, and an error if several active changes carry one.
  - `scripts/lib/contract.mjs` (tested) is used by `scripts/generate-api.mjs`, behind
    `npm --prefix frontend run generate:api`.
  - `ContractDocuments.ContractPath` in the integration tests mirrors the same rule.
  - `npm run screens` writes to the active change's `evidence/screens`, otherwise to `docs/screens`.

## Consequences
- Paths stay stable across archives, and both makers keep one contract in force.
- Only one API-changing change can be active at a time. That fits a single-team project, and the
  resolver fails loudly otherwise.
- The archive step has an extra copy, documented in AGENTS.md (definition of done).
