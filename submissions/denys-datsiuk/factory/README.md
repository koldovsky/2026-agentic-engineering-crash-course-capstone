# Agentic Software Factory

## Operating Mode

This repository uses a **lights-on factory** for the public submission package. A human supplies intent, approves sensitive decisions, and authorizes release. Role-scoped agents prepare changes and review evidence; deterministic gates stop incomplete or unsafe output.

## Factory Flow

```text
Human intent
    ↓ approve contract
Orchestrator → Maker → deterministic gates → Checker
                    ↑            │             │
                    └─ correction┘             ↓
                         Process audit → lesson proposal
                                              ↓ human approval
                                           Release
```

## Seven Factory Parts

| Part | Implementation |
|---|---|
| Intent | `contracts/run-contract.md` and `docs/specification.md` |
| Context | `AGENTS.md`, architecture, risks, and ADRs |
| Workers | role contracts in `roles/` |
| Invariants | privacy, traceability, evidence integrity, and human release control |
| Verification | package checker, gate mutation tests, and independent checker report |
| Entropy control | corrections, lessons, evidence manifest, and run ledger |
| Release | strict gate, human media review, and PR checklist |

## Role Separation

- **Orchestrator:** owns phase transitions and assembles context; it does not waive gates.
- **Maker:** edits only the approved scope and cannot approve its own result.
- **Checker:** receives the contract and resulting artifacts, not the maker's reasoning; it reports `PASS`, `REVISE`, or `STOP`.
- **Process auditor:** evaluates workflow evidence and proposes improvements; its judgment cannot change a hard gate automatically.
- **Business diagnostic analyst:** classifies synchronization anomalies from approved invariant signals; it cannot mutate data, invent policy, or approve remediation.

The diagnostic role is governed by `contracts/business-diagnostics-contract.md`, `config/business-diagnostics.yaml`, a JSON output schema, and executable synthetic evals. UI and evals share a deterministic analyzer; checked YAML projection prevents policy drift. This is a public reference, not a production deployment or autonomous model agent.

## Run Protocol

1. Copy `templates/task.md`, define scope, invariants, acceptance criteria, and stop conditions.
2. Record the run as `planned` in `ledger.jsonl`.
3. Give the approved contract to the maker.
4. Run `bash scripts/verify-package.sh` and `bash scripts/self-test-gates.sh`.
5. Give the contract and public diff/evidence to a fresh checker context.
6. Record corrections when a gate or checker finds a defect; rerun the affected stage.
7. Append the final outcome to the ledger. Only a human may authorize publication.

## Honesty Boundary

The factory governs this public package from its introduction onward. Earlier private implementation work remains historical evidence and is not retroactively represented as a factory run.

The public repository now includes an executable reference run: `bash scripts/run-reference-factory.sh`. It creates an isolated Git workspace, executes a bounded Maker subprocess, enforces scope and deny rules, performs a locked .NET restore, builds with warnings as errors, runs focused and non-live tests, then validates and hashes evidence in a separate deterministic Checker phase. Role Markdown files remain contracts; the reference run does not pretend that shell subprocesses are autonomous LLM agents or that synthetic verification proves private production behavior.
