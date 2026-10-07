# Business-Level Synchronization Diagnostics

## Problem

A technically successful run does not guarantee a valid business result. Records may be transported and persisted while the resulting projection remains incomplete, internally inconsistent, stale, duplicated, or linked to the wrong entity.

The proposed diagnostic layer evaluates the result after transport and mapping. It does not replace domain rules and does not modify data autonomously.

## Error Model

| Category | Example signal | Business impact | Safe default |
|---|---|---|---|
| Identity ambiguity | Several candidates exceed the match threshold | Record may attach to the wrong entity | Quarantine and request review |
| Projection incompleteness | Required projected relation is absent | Downstream view is incomplete | Keep previous valid projection |
| Conflicting authority | Two sources provide incompatible authoritative values | Published value may be incorrect | Apply declared priority or escalate |
| Referential inconsistency | Referenced entity is missing or inactive | Orphaned or unusable record | Reject affected item, continue batch |
| Freshness violation | Source snapshot is older than the accepted window | Decisions use stale information | Warn or block publication |
| Cardinality anomaly | Volume deviates materially from the recent baseline | Possible truncation, duplication, or source drift | Pause promotion and investigate |

## Diagnostic Output

Every detected issue should expose:

- category and severity;
- affected projection and synthetic-safe entity reference;
- observed evidence and violated invariant;
- affected-record count and estimated downstream impact;
- confidence based on deterministic signals;
- recommended operator action;
- whether retry is safe, blocked, or requires corrected input;
- correlation ID linking source run, mapping decision, projection, and audit event.

## Decision Boundary

Deterministic rules may classify and explain a problem. An LLM may summarize evidence or rank already-approved actions, but it must not invent domain rules, change authoritative values, or automatically resolve identity conflicts. Low-confidence or high-impact cases require human approval.

## Public Demo Status

The interactive package executes a rule-based reference analyzer, not a fixed response. Select identity ambiguity, cardinality anomaly or missing evidence, then analyze. UI and evals share `evidence/mockup/business-diagnostics.mjs`; actual results are validated against the output schema. YAML is projected to browser JSON, with drift checked by the package gate. Confidence is recognized-signal coverage multiplied by context completeness, not a measured probability of correctness. This does not establish production diagnostic accuracy or deployment in the private application.

## Agentic Controls

- Contract: `factory/contracts/business-diagnostics-contract.md`
- Role: `factory/roles/business-diagnostic-analyst.md`
- Policy: `factory/config/business-diagnostics.yaml`
- Output schema: `factory/schemas/business-diagnostic.schema.json`
- Synthetic evals: `factory/evals/business-diagnostics.jsonl`
- Deterministic policy check: `scripts/check-business-diagnostics.rb`

The analyst can classify, explain, and recommend an allowlisted action. It cannot change mappings, priorities, thresholds, projections, or source records. High-impact and low-evidence cases return to a human operator.
