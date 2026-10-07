#!/usr/bin/env bash
set -euo pipefail

required=(
  README.md
  AGENTS.md
  PR_DESCRIPTION.md
  SUBMISSION_CHECKLIST.md
  CONTRIBUTING.md
  SECURITY.md
  CHANGELOG.md
  PROJECT_STATUS.md
  docs/project-overview.md
  docs/system-description.md
  docs/architecture.md
  docs/specification.md
  docs/verification.md
  docs/autonomy-log.md
  docs/security-and-sanitization.md
  docs/traceability.md
  docs/risk-register.md
  docs/quality-gates.md
  docs/review-checklist.md
  docs/handoff.md
  docs/adr/0001-synthetic-public-evidence.md
  docs/adr/0002-human-controlled-publication.md
  .agents/skills/verify-capstone/SKILL.md
  .github/pull_request_template.md
  .githooks/pre-commit
  scripts/install-hooks.sh
  scripts/self-test-gates.sh
  scripts/check-factory.sh
  scripts/serve-demo.sh
  scripts/check-business-diagnostics.rb
  scripts/export-diagnostic-policy.rb
  evidence/mockup/business-policy.json
  scripts/run-reference-factory.sh
  docs/evaluation-plan.md
  docs/dotnet-agent-controls.md
  docs/business-error-analysis.md
  factory/README.md
  factory/contracts/run-contract.md
  factory/contracts/business-diagnostics-contract.md
  factory/roles/orchestrator.md
  factory/roles/maker.md
  factory/roles/checker.md
  factory/roles/process-auditor.md
  factory/roles/business-diagnostic-analyst.md
  factory/config/business-diagnostics.yaml
  factory/schemas/business-diagnostic.schema.json
  factory/evals/business-diagnostics.jsonl
  factory/templates/task.md
  factory/templates/check-report.md
  factory/templates/correction.md
  factory/templates/dotnet-project/AGENTS.md
  factory/templates/dotnet-project/.agent-deny-paths
  factory/templates/dotnet-project/agent-policy.yaml
  factory/templates/dotnet-project/scope.allowlist
  factory/templates/dotnet-project/scripts/check-agent-policy.sh
  factory/templates/dotnet-project/scripts/run-offline-sandbox.sh
  factory/templates/dotnet-project/scripts/verify-agent-change.sh
  factory/templates/dotnet-project/docker/Dockerfile
  factory/templates/dotnet-project/.dockerignore
  factory/templates/dotnet-project/scripts/path-policy.py
  factory/templates/dotnet-project/scripts/test-results.py
  factory/templates/dotnet-project/docker/README.md
  factory/templates/dotnet-project/docker/scripts/container-verify.sh
  factory/corrections/README.md
  factory/lessons/index.md
  factory/ledger.jsonl
  factory/runs/CAP-001/check-report.md
  factory/runs/REF-001/check-report.md
  factory/runs/REF-001/evidence/manifest.sha256
  factory/fixtures/dotnet-sample/FactoryFixture.sln
  factory/fixtures/dotnet-sample/global.json
  factory/fixtures/dotnet-sample/src/OperationsDashboard/OperationsDashboard.csproj
  factory/fixtures/dotnet-sample/src/OperationsDashboard/DashboardQuery.cs
  factory/fixtures/dotnet-sample/src/OperationsDashboard/packages.lock.json
  factory/fixtures/dotnet-sample/tests/OperationsDashboard.Tests/OperationsDashboard.Tests.csproj
  factory/fixtures/dotnet-sample/tests/OperationsDashboard.Tests/DashboardPolicyTests.cs
  factory/fixtures/dotnet-sample/tests/OperationsDashboard.Tests/packages.lock.json
  evidence/mockup/before.html
  evidence/mockup/after.html
  evidence/mockup/test-results.html
  evidence/mockup/demo.html
  evidence/mockup/demo.js
  evidence/mockup/dashboard-model.mjs
  scripts/test-dashboard.mjs
  scripts/test-business-diagnostics.mjs
  scripts/test-policy-controls.py
  evidence/mockup/business-diagnostics.mjs
  evidence/mockup/styles.css
  evidence/dashboard-before.png
  evidence/dashboard-after.png
  evidence/test-summary.png
  evidence/manifest.sha256
)

for path in "${required[@]}"; do
  if [[ ! -s "$path" ]]; then
    echo "Missing or empty required artifact: $path" >&2
    exit 1
  fi
done

python3 factory/templates/dotnet-project/scripts/path-policy.py --public-root .
bash scripts/check-factory.sh


if ! (cd evidence && shasum -a 256 -c manifest.sha256 >/dev/null); then
  echo "Evidence integrity check failed." >&2
  exit 1
fi


for id in FR-01 FR-02 FR-03 FR-04 FR-05 FR-06 FR-07 FR-08; do
  if ! grep -q "$id" docs/specification.md || ! grep -q "$id" docs/traceability.md; then
    echo "Traceability is incomplete for $id." >&2
    exit 1
  fi
done

domain_pattern="$(printf '%s' 'bnViaXB8ZWRlYm98bWFzdGVyWyBfLV0/ZGF0YXxhZG1pc3Npb258YXBwbGljYW50fNCy0YHRgtGD0L/QvXzQsNCx0ZbRgtGD0YDRltGU0L3RgnzRg9C90ZbQstC10YDRgdC40YLQtdGCfHVuaXZlcnNpdHk=' | base64 --decode)"
python3 factory/templates/dotnet-project/scripts/path-policy.py --public-root . --content-scan "$domain_pattern"

if [[ "${ALLOW_VIDEO_TODO:-0}" != "1" ]] && grep -n 'TODO:' PR_DESCRIPTION.md; then
  echo "PR description still contains unresolved TODO fields." >&2
  exit 1
fi
if ! grep -q 'https://drive.google.com/file/d/' PR_DESCRIPTION.md; then
  echo "Missing external video link." >&2
  exit 1
fi

if [[ "${ALLOW_PENDING_REVIEW:-0}" != "1" ]] && ! grep -q '^\*\*Verdict:\*\* PASS$' factory/runs/CAP-001/check-report.md; then
  echo "Independent checker has not issued PASS." >&2
  exit 1
fi

echo "Package structure checks passed. Manual media and privacy review is still required."
