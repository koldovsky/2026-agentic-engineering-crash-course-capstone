# Business Diagnostics Contract

## Objective

Explain why a synchronization result may be invalid at the business level, using approved deterministic signals and sanitized evidence. The diagnostic must support an operator decision; it must not mutate source data or invent domain policy.

## Required Inputs

- run correlation ID;
- source and projection identifiers in sanitized form;
- triggered invariant IDs and observed values;
- affected-record count;
- mapping, freshness, cardinality, and referential-check results;
- approved policy version.

## Required Output

- category and severity;
- concise business impact;
- evidence referencing invariant IDs;
- confidence and its basis;
- recommended action selected from the allowlist;
- retry decision: `safe`, `blocked`, or `after_input_correction`;
- explicit `human_review_required` value;
- limitations and missing evidence.

## Hard Rules

1. No diagnosis without at least one deterministic signal.
2. Confidence describes evidence coverage, not model certainty.
3. Identity ambiguity, authoritative conflict, and high-impact findings always require human review.
4. Missing required evidence produces `INSUFFICIENT_EVIDENCE`, never a guessed root cause.
5. The agent may recommend only configured actions.
6. The agent cannot modify mappings, source priority, thresholds, projections, or records.
7. Raw payloads, personal values, credentials, and private endpoints are prohibited in input and output.

## Stop Conditions

Return `STOP` when evidence contains sensitive data, the policy version is unknown, required invariants conflict, or the requested action would change authoritative business state.
