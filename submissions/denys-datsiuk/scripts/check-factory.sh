#!/usr/bin/env bash
set -euo pipefail

required=(
  factory/README.md
  factory/contracts/run-contract.md
  factory/roles/orchestrator.md
  factory/roles/maker.md
  factory/roles/checker.md
  factory/roles/process-auditor.md
  factory/roles/business-diagnostic-analyst.md
  factory/contracts/business-diagnostics-contract.md
  factory/config/business-diagnostics.yaml
  factory/schemas/business-diagnostic.schema.json
  factory/evals/business-diagnostics.jsonl
  factory/templates/task.md
  factory/templates/check-report.md
  factory/templates/correction.md
  factory/corrections/README.md
  factory/lessons/index.md
  factory/ledger.jsonl
  factory/runs/CAP-001/check-report.md
  factory/runs/REF-001/check-report.md
  factory/runs/REF-001/evidence/manifest.sha256
  factory/fixtures/dotnet-sample/FactoryFixture.sln
  factory/fixtures/dotnet-sample/src/OperationsDashboard/DashboardQuery.cs
  factory/fixtures/dotnet-sample/tests/OperationsDashboard.Tests/DashboardPolicyTests.cs
  scripts/run-reference-factory.sh
)

for path in "${required[@]}"; do
  [[ -s "$path" ]] || { echo "Missing factory artifact: $path" >&2; exit 1; }
done

(cd factory/runs/REF-001/evidence && shasum -a 256 -c manifest.sha256 >/dev/null) || {
  echo "Reference factory evidence integrity failure." >&2
  exit 1
}

ruby scripts/check-business-diagnostics.rb

grep -q 'lights-on' factory/README.md || { echo "Factory autonomy mode is not declared." >&2; exit 1; }
grep -q 'maker never approves its own output' factory/contracts/run-contract.md || { echo "Maker/checker separation is missing." >&2; exit 1; }
grep -q 'Your value is judgment; your authority is zero' factory/roles/process-auditor.md || { echo "Auditor authority boundary is missing." >&2; exit 1; }
grep -q '^\*\*Status:\*\*' factory/runs/CAP-001/check-report.md || { echo "Factory run has no checker status." >&2; exit 1; }

while IFS= read -r line; do
  [[ -n "$line" ]] || continue
  for field in run_id mode phase gate_result human_release; do
    grep -q "\"$field\"" <<<"$line" || { echo "Ledger entry lacks $field." >&2; exit 1; }
  done
done < factory/ledger.jsonl

if grep -RIl '^\*\*Status:\*\* open' factory/corrections --include='*.md' | grep -v 'README.md' | grep -q .; then
  echo "Open factory correction detected." >&2
  exit 1
fi

echo "Factory integrity checks passed."
