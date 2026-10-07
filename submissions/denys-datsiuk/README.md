# Safety-Aware Operations Dashboard — Capstone Submission

This directory is a sanitized submission package for a private on-premises integration platform. The platform imports data from multiple systems into local storage, normalizes and reconciles it, builds application-specific projections, and applies additional calibration and consistency checks. This package demonstrates an agent-assisted dashboard improvement without publishing proprietary source code, credentials, schemas, or production data.

The platform is not merely an Azure Data Factory-style transport pipeline. Its core behavior includes domain mapping, identity matching, conflict resolution, idempotent synchronization, partial-result handling, calibrated projections, audit trails, and operator-facing diagnostics. A generic ETL orchestrator could move data, but it would not replace these application semantics and safety rules.

## Result

The selected vertical slice improved two related operational workflows:

1. Changing a custom date range now refreshes the dashboard automatically once both dates are present.
2. Entity-change records are easier to inspect through structured keys, schema descriptions, and clearer before/after values.

The work was completed in a private .NET repository and committed as two focused changes. The submission contains only process artifacts and sanitized evidence.

A complete Ukrainian-language system and project description is available in [`docs/system-description.md`](docs/system-description.md).

## Agentic Engineering Practices

| Practice | Evidence |
|---|---|
| Repository context | [`AGENTS.md`](AGENTS.md) |
| Complete system description | [`docs/system-description.md`](docs/system-description.md) |
| System and package architecture | [`docs/architecture.md`](docs/architecture.md) |
| Executable synthetic business-error diagnostics | [`docs/business-error-analysis.md`](docs/business-error-analysis.md) |
| Spec-driven change | [`docs/specification.md`](docs/specification.md) |
| Bounded agent scope | [`docs/autonomy-log.md`](docs/autonomy-log.md) |
| Narrow-to-wide verification | [`docs/verification.md`](docs/verification.md) |
| Security and privacy review | [`docs/security-and-sanitization.md`](docs/security-and-sanitization.md) |
| Requirement-to-evidence mapping | [`docs/traceability.md`](docs/traceability.md) |
| Risks and controls | [`docs/risk-register.md`](docs/risk-register.md) |
| Architecture decisions | [`docs/adr/`](docs/adr/) |
| Quality gates | [`docs/quality-gates.md`](docs/quality-gates.md) |
| Gate mutation tests | [`docs/evaluation-plan.md`](docs/evaluation-plan.md) |
| Lights-on agentic factory | [`factory/README.md`](factory/README.md) |
| Private .NET control template | [`docs/dotnet-agent-controls.md`](docs/dotnet-agent-controls.md) |
| Repeatable checker procedure | [`.agents/skills/verify-capstone/SKILL.md`](.agents/skills/verify-capstone/SKILL.md) |
| Synthetic UI evidence | [`evidence/`](evidence/) |
| Human-readable submission | [`PR_DESCRIPTION.md`](PR_DESCRIPTION.md) |

## Verification Summary

- Targeted dashboard tests passed.
- Full non-live solution suite passed: **1,285 tests**, with **10 live integration tests skipped** by filter/environment.
- Diff hygiene and working-tree scope were checked before commit.
- Unrelated untracked SQL and analysis files were deliberately excluded.

## Repository Boundary

The original repository is private. Paths, types, data sources, and UI labels have been generalized where disclosure would reveal internal implementation details. Screenshots must use synthetic or redacted data.

## Submission Status

The video is hosted separately on [Google Drive](https://drive.google.com/file/d/1R3quKQtJ2n_izeva8XKquGz7CgSPy64w/view?usp=sharing). Media binaries, narration scripts and recording tools are intentionally excluded from Git. Replacement of the hosted file, signed-out playback and independent release review remain human steps; see [`SUBMISSION_CHECKLIST.md`](SUBMISSION_CHECKLIST.md).

## Local Quality Gate

During package preparation, run structural checks while explicitly acknowledging the two pending submission artifacts:

```bash
ALLOW_VIDEO_TODO=1 ALLOW_PENDING_REVIEW=1 bash scripts/verify-package.sh
bash scripts/self-test-gates.sh
bash scripts/check-factory.sh
node --test scripts/test-dashboard.mjs scripts/test-business-diagnostics.mjs
python3 scripts/test-policy-controls.py
```

Before release, run `bash scripts/verify-package.sh` without overrides. It must remain red until the video URL and independent `PASS` exist.

## Interactive Synthetic Demo

```bash
bash scripts/serve-demo.sh
```

Then open `http://127.0.0.1:8080/evidence/mockup/demo.html`. The client-side demo filters dated synthetic records on **Overview** and **Data changes** using one global date range. It exercises quick/custom filters, incomplete/reversed ranges, pagination and selection reset on both tabs, and a separate active-alert invariant. There is no backend or production data. Run `node --test scripts/test-dashboard.mjs` with Node 22+ for the eight model tests; browser walkthrough evidence is described in `docs/verification.md`.

The diagnostics panel executes the shared rule engine against three synthetic scenarios. YAML policy is projected to browser JSON and checked for drift; outputs are schema-validated. No model API, backend or autonomous correction is involved.

The root workflow [denys-capstone.yml](../../.github/workflows/denys-capstone.yml) runs tests and structural gates for this submission only. CI does not grant release approval. Dependencies: Node 22+, Python 3.9+, Ruby with standard JSON/YAML libraries; .NET 8.0.422 and Docker are needed only for the reference/sandbox runs.

Optionally install the package's pre-commit checks from this nested directory. Existing unrelated hook configuration is not overwritten:

```bash
bash scripts/install-hooks.sh
```
