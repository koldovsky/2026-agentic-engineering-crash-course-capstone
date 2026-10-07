# Evaluation Plan

## Objective

Evaluate both the submission claim and the harness that protects it. A green checker is meaningful only if representative bad states make it fail.

## Product Evaluation

- Acceptance scenarios AC-01 through AC-07 define expected behavior.
- Historical focused tests cover the custom-range transition.
- A broad non-live suite provides regression evidence.
- Synthetic before/after screens communicate the user-visible outcome.
- An independent reviewer checks traceability and limitations without private repository access.

## Harness Evaluation

Run:

```bash
bash scripts/self-test-gates.sh
```

The self-test creates disposable copies and injects four mutations:

1. a required specification is removed;
2. a prohibited domain marker is added;
3. a reviewed screenshot is changed after hashing.
4. the independent checker role is removed from the factory.

The test passes only if every mutation is rejected by the ordinary package checker.

## Factory Evaluation

`scripts/check-factory.sh` verifies the declared autonomy mode, required role contracts, maker/checker separation, auditor authority boundary, run-ledger fields, and correction state. This proves that the harness structure is present; it does not prove unattended multi-agent execution or application correctness.

The same gate runs `scripts/check-business-diagnostics.rb`: it checks YAML/browser policy equivalence, executes the analyzer on JSONL inputs and compares actual schema-validated results with expected outputs. Nine tests cover classification, missing/low evidence, conflicting signals, unknown policy, unsafe input and forbidden actions. These are executable synthetic evals, not production accuracy measurements. Python policy regressions and package mutations cover denied/untracked paths, exact scope, empty TRX results and forbidden media.

## Holdout Principle

The public reviewer should not receive private implementation details or the intended review verdict. The reviewer evaluates only the contract, public evidence, risks, and limitations. This avoids turning hidden implementation knowledge into an unfair oracle.

## Limits

- Synthetic UI proves communication quality, not implementation fidelity.
- The public harness cannot rerun private application tests.
- Human review remains necessary for semantic disclosure, images, and audio.
