# Agent Instructions

## Purpose

This directory is a public, sanitized evidence package for work performed in a private brownfield repository. Optimize for auditability and privacy, not for recreating the application.

## Hard Boundaries

- Do not add proprietary source code, patches, database schemas, connection details, credentials, private URLs, customer data, or production screenshots.
- Do not infer or reconstruct private implementation from the descriptions.
- Use generic names such as `operational dashboard`, `sync run`, `entity change`, and `data source`.
- Keep evidence reproducible without claiming access the reviewer does not have.
- Never turn a stated historical test result into a newly executed result.

## Editing Rules

- Keep Markdown concise and UTF-8 encoded.
- Record claims as one of: `verified`, `historical evidence`, or `pending human evidence`.
- Preserve the distinction between decisions made by the human and implementation performed by the agent.
- When changing acceptance criteria, update `docs/specification.md`, `docs/verification.md`, and `PR_DESCRIPTION.md` together.
- Maintain the requirement-to-evidence mapping in `docs/traceability.md` and reassess affected entries in `docs/risk-register.md`.
- Treat `evidence/manifest.sha256` changes as security-sensitive: regenerate only after intentional media changes and visual review.
- Put screenshots and exported command output only in `evidence/` after checking them for sensitive information.

## Factory Workflow

- Treat `factory/contracts/run-contract.md` as the governing contract.
- Use the role boundaries in `factory/roles/`; do not combine maker and checker approval in one context.
- Record run state in `factory/ledger.jsonl` without rewriting earlier entries.
- Record detected process or evidence defects under `factory/corrections/`; never hide an open correction to pass a gate.
- A process auditor may propose a control change but cannot edit hard gates or approve release.
- Keep the factory in lights-on mode: human approval is required for domain interpretation, control changes, disclosure, and publication.

## Validation

Run from this directory:

```bash
bash scripts/verify-package.sh
bash scripts/check-factory.sh
bash scripts/self-test-gates.sh
```

The checker validates required artifacts, traceability IDs, evidence hashes, unresolved placeholders, forbidden domain/secret patterns, and accidental source-code additions. Review the files manually before publishing; automation cannot prove that prose, images, or audio contain no confidential information.
